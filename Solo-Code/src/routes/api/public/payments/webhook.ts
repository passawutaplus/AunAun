import { createFileRoute } from "@tanstack/react-router";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { type StripeEnv, verifyWebhook, createStripeClient } from "@/lib/stripe.server";
import { CREDITS_PER_PRICE, PX_PER_PRICE, checkoutKind } from "@/lib/stripe";
import { syncAnthemFromSo1oUserFull } from "@/lib/ecosystemSync.server";
import {
  syncConnectAccountFromStripe,
  upsertSubscriptionRecordFromStripe,
} from "@/lib/stripePayments.server";
import { guardIpRateLimit, IP_RATE_LIMITS } from "@/lib/rateLimit.server";

let _supabase: SupabaseClient | null = null;
function getSupabase(): SupabaseClient {
  if (!_supabase) {
    _supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  }
  return _supabase;
}

function resolvePriceId(item: any): string {
  return (
    item?.price?.lookup_key ||
    item?.price?.metadata?.lovable_external_id ||
    item?.price?.id ||
    "unknown"
  );
}

function tsToIso(seconds: number | null | undefined): string | null {
  return seconds ? new Date(seconds * 1000).toISOString() : null;
}

async function isWebhookEventProcessed(eventId: string): Promise<boolean> {
  const { data } = await getSupabase()
    .from("stripe_webhook_events")
    .select("event_id")
    .eq("event_id", eventId)
    .maybeSingle();
  return !!data;
}

async function markWebhookEventProcessed(
  eventId: string,
  eventType: string,
  env: StripeEnv,
): Promise<void> {
  const { error } = await getSupabase().from("stripe_webhook_events").insert({
    event_id: eventId,
    event_type: eventType,
    environment: env,
  });
  if (error?.code === "23505") return;
  if (error) {
    console.error("[stripe-webhook] idempotency insert failed:", error);
    throw error;
  }
}

function parseCheckoutQuantity(metadata: Record<string, unknown> | null | undefined): number {
  const raw = metadata?.quantity;
  const parsed = typeof raw === "string" ? parseInt(raw, 10) : typeof raw === "number" ? raw : 1;
  if (!Number.isFinite(parsed) || parsed < 1) return 1;
  return Math.min(Math.floor(parsed), 50);
}

function assertPaidOneTimeCheckout(session: {
  payment_status?: string | null;
  amount_total?: number | null;
}): void {
  if (session.payment_status !== "paid") {
    throw new Error(`checkout not paid: ${session.payment_status ?? "unknown"}`);
  }
  if (session.amount_total == null || session.amount_total <= 0) {
    throw new Error("checkout has zero or missing amount_total");
  }
}

async function getUserEmail(userId: string): Promise<string | null> {
  const { data, error } = await getSupabase().auth.admin.getUserById(userId);
  if (error || !data.user?.email) return null;
  return data.user.email;
}

async function enqueueEmail(opts: {
  userId: string;
  templateName: string;
  templateData?: Record<string, any>;
  idempotencyKey: string;
}) {
  try {
    const email = await getUserEmail(opts.userId);
    if (!email) return;
    const sb = getSupabase();
    const { data: sup } = await sb
      .from("suppressed_emails")
      .select("id")
      .eq("email", email.toLowerCase())
      .maybeSingle();
    if (sup) return;

    let token: string;
    const { data: existing } = await sb
      .from("email_unsubscribe_tokens")
      .select("token")
      .eq("email", email.toLowerCase())
      .maybeSingle();
    if (existing?.token) {
      token = existing.token;
    } else {
      const bytes = new Uint8Array(32);
      crypto.getRandomValues(bytes);
      token = Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
      await sb
        .from("email_unsubscribe_tokens")
        .upsert(
          { token, email: email.toLowerCase() },
          { onConflict: "email", ignoreDuplicates: true },
        );
    }

    const messageId = crypto.randomUUID();
    const { TEMPLATES } = await import("@/lib/email-templates/registry");
    const tpl = TEMPLATES[opts.templateName];
    if (!tpl) {
      console.error("[webhook-email] template missing:", opts.templateName);
      return;
    }
    const React = await import("react");
    const { render } = await import("@react-email/components");
    const element = React.createElement(tpl.component, opts.templateData ?? {});
    const html = await render(element);
    const text = await render(element, { plainText: true });
    const subject =
      typeof tpl.subject === "function" ? tpl.subject(opts.templateData ?? {}) : tpl.subject;

    await sb.from("email_send_log").insert({
      message_id: messageId,
      template_name: opts.templateName,
      recipient_email: email,
      status: "pending",
    });

    await sb.rpc("enqueue_email", {
      queue_name: "transactional_emails",
      payload: {
        message_id: messageId,
        to: email,
        from: "So1o Freelancer <noreply@solofreelancer.com>",
        sender_domain: "notify.solofreelancer.com",
        subject,
        html,
        text,
        purpose: "transactional",
        label: opts.templateName,
        idempotency_key: opts.idempotencyKey,
        unsubscribe_token: token,
        queued_at: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error("[webhook-email] enqueue failed:", err);
  }
}

async function logPaymentNotification(opts: {
  userId: string | null;
  eventType: string;
  env: StripeEnv;
  amountCents?: number | null;
  currency?: string | null;
  priceId?: string | null;
  message: string;
  metadata?: Record<string, any>;
}) {
  await getSupabase()
    .from("payment_notifications")
    .insert({
      user_id: opts.userId,
      event_type: opts.eventType,
      environment: opts.env,
      amount_cents: opts.amountCents ?? null,
      currency: opts.currency ?? null,
      price_id: opts.priceId ?? null,
      message: opts.message,
      metadata: opts.metadata ?? {},
    });
}

async function syncTier(userId: string) {
  const sb = getSupabase();
  await sb.rpc("sync_user_tier", { _user_id: userId });
  await syncAnthemFromSo1oUserFull(sb, userId);
}

async function handleSubscriptionUpsert(subscription: any, env: StripeEnv, isCreation: boolean) {
  const userId = await upsertSubscriptionRecordFromStripe(subscription, env);
  if (!userId) {
    console.error("[stripe-webhook] No userId on subscription", subscription.id);
    return;
  }

  await getSupabase().rpc("reset_ai_period_on_renewal", { _user_id: userId });

  const item = subscription.items?.data?.[0];
  const periodEnd = item?.current_period_end ?? subscription.current_period_end;
  const priceId = resolvePriceId(item);

  if (isCreation && (subscription.status === "active" || subscription.status === "trialing")) {
    await enqueueEmail({
      userId,
      templateName: "welcome-pro",
      templateData: { priceId, environment: env },
      idempotencyKey: `welcome-${subscription.id}`,
    });
    await logPaymentNotification({
      userId,
      eventType: "subscription.created",
      env,
      priceId,
      message: `สมัครแพ็กเกจ ${priceId} สำเร็จ`,
    });
  } else if (subscription.status === "past_due") {
    await enqueueEmail({
      userId,
      templateName: "subscription-past-due",
      templateData: { priceId },
      idempotencyKey: `past-due-${subscription.id}-${periodEnd ?? "x"}`,
    });
    await logPaymentNotification({
      userId,
      eventType: "subscription.past_due",
      env,
      priceId,
      message: `บัตรเครดิตถูกปฏิเสธสำหรับ ${priceId}`,
    });
  } else if (subscription.cancel_at_period_end) {
    await enqueueEmail({
      userId,
      templateName: "subscription-scheduled-cancel",
      templateData: { priceId, endsAt: tsToIso(periodEnd) },
      idempotencyKey: `scheduled-cancel-${subscription.id}`,
    });
    await logPaymentNotification({
      userId,
      eventType: "subscription.scheduled_cancel",
      env,
      priceId,
      message: `กำหนดยกเลิก ${priceId} เมื่อสิ้นรอบบิล`,
    });
  }
}

async function handleSubscriptionDeleted(subscription: any, env: StripeEnv) {
  const userId = subscription.metadata?.userId;
  await getSupabase()
    .from("subscriptions")
    .update({
      status: "canceled",
      cancel_at_period_end: true,
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_subscription_id", subscription.id)
    .eq("environment", env);

  if (userId) {
    await syncTier(userId);
    await enqueueEmail({
      userId,
      templateName: "subscription-canceled",
      templateData: { endsAt: tsToIso(subscription.current_period_end) },
      idempotencyKey: `canceled-${subscription.id}`,
    });
    await logPaymentNotification({
      userId,
      eventType: "subscription.deleted",
      env,
      message: `ยกเลิก subscription เรียบร้อย`,
    });
  }
}

async function handleCheckoutCompleted(session: any, env: StripeEnv) {
  if (session.mode === "subscription" && session.subscription) {
    try {
      const stripe = createStripeClient(env);
      const subId =
        typeof session.subscription === "string" ? session.subscription : session.subscription.id;
      const sub = await stripe.subscriptions.retrieve(subId, {
        expand: ["items.data.price"],
      });
      await handleSubscriptionUpsert(sub, env, true);
    } catch (err) {
      console.error("[stripe-webhook] checkout subscription sync failed:", err);
      throw err;
    }
    return;
  }

  if (session.mode !== "payment") return;
  assertPaidOneTimeCheckout(session);

  const userId = session.metadata?.userId || session.client_reference_id;
  const priceId = session.metadata?.priceId;
  const kind = session.metadata?.kind || (priceId ? checkoutKind(priceId) : null);
  const quantity = parseCheckoutQuantity(session.metadata);
  if (!userId || !priceId || !kind) {
    console.warn("[stripe-webhook] checkout.session.completed missing metadata", session.id);
    throw new Error("checkout.session.completed missing metadata");
  }

  const sb = getSupabase();

  if (kind === "credits") {
    const unitCredits = CREDITS_PER_PRICE[priceId];
    if (!unitCredits) {
      console.error("[stripe-webhook] Unknown credit price:", priceId);
      throw new Error(`Unknown credit price: ${priceId}`);
    }
    const credits = unitCredits * quantity;

    const { data: newBalance, error } = await sb.rpc("add_ai_credits_atomic", {
      _user_id: userId,
      _environment: env,
      _credits: credits,
      _stripe_session_id: session.id,
      _price_id: priceId,
    });
    if (error) {
      console.error("[stripe-webhook] add_ai_credits_atomic failed:", error);
      throw error;
    }

    await enqueueEmail({
      userId,
      templateName: "credits-topup",
      templateData: { credits, balance: newBalance, priceId },
      idempotencyKey: `credits-${session.id}`,
    });

    await logPaymentNotification({
      userId,
      eventType: "credits.purchased",
      env,
      amountCents: session.amount_total ?? null,
      currency: session.currency ?? null,
      priceId,
      message: `เติมเครดิต +${credits} (ยอดรวม ${newBalance})`,
    });
    return;
  }

  if (kind === "px") {
    const unitPx = PX_PER_PRICE[priceId];
    if (!unitPx) {
      console.error("[stripe-webhook] Unknown PX price:", priceId);
      throw new Error(`Unknown PX price: ${priceId}`);
    }
    const pxAmount = unitPx * quantity;

    const { error } = await sb.rpc("topup_wallet_stripe", {
      _user_id: userId,
      _amount_px: pxAmount,
      _stripe_session_id: session.id,
      _amount_cents: session.amount_total ?? null,
      _price_id: priceId,
      _environment: env,
    });
    if (error) {
      console.error("[stripe-webhook] topup_wallet_stripe failed:", error);
      throw error;
    }

    await logPaymentNotification({
      userId,
      eventType: "px.purchased",
      env,
      amountCents: session.amount_total ?? null,
      currency: session.currency ?? null,
      priceId,
      message: `เติม Pixel +${pxAmount} px`,
      metadata: { sessionId: session.id },
    });
    return;
  }

  if (kind === "boost") {
    const boostId = session.metadata?.boostId;
    if (!boostId) throw new Error("boost checkout missing boostId");

    const { error } = await sb.rpc("activate_post_boost_stripe", {
      _stripe_session_id: session.id,
      _boost_id: boostId,
      _price_id: priceId,
      _environment: env,
    });
    if (error) {
      console.error("[stripe-webhook] activate_post_boost_stripe failed:", error);
      throw error;
    }

    await logPaymentNotification({
      userId,
      eventType: "boost.purchased",
      env,
      amountCents: session.amount_total ?? null,
      currency: session.currency ?? null,
      priceId,
      message: "Boost โพสต์สำเร็จ — กำลังแสดงในฟีด",
      metadata: { sessionId: session.id, boostId },
    });
    return;
  }

  if (kind === "ad") {
    const applicationId = session.metadata?.applicationId;
    if (!applicationId) throw new Error("ad checkout missing applicationId");

    const { error } = await sb.rpc("fulfill_ad_payment_stripe", {
      _stripe_session_id: session.id,
      _application_id: applicationId,
      _price_id: priceId,
      _environment: env,
    });
    if (error) {
      console.error("[stripe-webhook] fulfill_ad_payment_stripe failed:", error);
      throw error;
    }

    await logPaymentNotification({
      userId,
      eventType: "ad.paid",
      env,
      amountCents: session.amount_total ?? null,
      currency: session.currency ?? null,
      priceId,
      message: "ชำระโฆษณาแล้ว · รอทีมอนุมัติ",
      metadata: { sessionId: session.id, applicationId },
    });
    return;
  }

  if (kind === "escrow") {
    const escrowId = session.metadata?.escrowId;
    if (!escrowId) throw new Error("escrow checkout missing escrowId");

    const paymentIntentId =
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id;

    const { error } = await sb.rpc("fulfill_escrow_payment_stripe", {
      _stripe_session_id: session.id,
      _escrow_id: escrowId,
      _payment_intent_id: paymentIntentId ?? null,
      _environment: env,
    });
    if (error) {
      console.error("[stripe-webhook] fulfill_escrow_payment_stripe failed:", error);
      throw error;
    }

    const { data: escrowRow } = await getSupabase()
      .schema("shared")
      .from("marketplace_escrows")
      .select("title, client_name, amount_thb, freelancer_user_id")
      .eq("id", escrowId)
      .maybeSingle();

    const freelancerId = escrowRow?.freelancer_user_id ?? userId;
    await enqueueEmail({
      userId: freelancerId,
      templateName: "deposit-received",
      templateData: {
        recipientName: "คุณ",
        clientName: escrowRow?.client_name ?? "ลูกค้า",
        projectName: escrowRow?.title ?? "งาน Escrow",
        paymentType: "escrow",
        amount: `฿${Math.round(escrowRow?.amount_thb ?? 0).toLocaleString("th-TH")}`,
        note: "ลูกค้าชำระผ่าน Escrow — เงินอยู่ในระบบจนอนุมัติงาน",
        actionUrl: "https://solofreelancer.com/dashboard?tab=finance",
      },
      idempotencyKey: `escrow-funded-${session.id}`,
    });

    await logPaymentNotification({
      userId: freelancerId,
      eventType: "escrow.funded",
      env,
      amountCents: session.amount_total ?? null,
      currency: session.currency ?? null,
      priceId,
      message: "ลูกค้าชำระ Escrow แล้ว — เงินอยู่ในระบบ",
      metadata: { sessionId: session.id, escrowId },
    });
    return;
  }

  if (kind === "client_job") {
    const jobId = session.metadata?.jobId;
    const paymentType = session.metadata?.paymentType;
    const amountThbRaw = session.metadata?.amountThb;
    const amountThb =
      typeof amountThbRaw === "string" ? parseFloat(amountThbRaw) : Number(amountThbRaw);

    if (
      !jobId ||
      (paymentType !== "deposit" && paymentType !== "final") ||
      !Number.isFinite(amountThb)
    ) {
      throw new Error("client_job checkout missing metadata");
    }

    const { error } = await sb.rpc("fulfill_client_job_payment_stripe", {
      _stripe_session_id: session.id,
      _job_id: jobId,
      _freelancer_user_id: userId,
      _payment_type: paymentType,
      _amount_thb: amountThb,
      _environment: env,
    });
    if (error) {
      console.error("[stripe-webhook] fulfill_client_job_payment_stripe failed:", error);
      throw error;
    }

    const { data: jobRow } = await sb
      .from("job_trackers")
      .select("title, client_name")
      .eq("id", jobId)
      .maybeSingle();

    const paymentLabel = paymentType === "deposit" ? "มัดจำ" : "ยอดสุดท้าย";
    await enqueueEmail({
      userId,
      templateName: "deposit-received",
      templateData: {
        recipientName: "คุณ",
        clientName: jobRow?.client_name ?? "ลูกค้า",
        projectName: jobRow?.title ?? "โปรเจกต์",
        paymentType,
        amount: `฿${Math.round(amountThb).toLocaleString("th-TH")}`,
        note: `ชำระ${paymentLabel}ผ่าน Stripe Checkout`,
        actionUrl: "https://solofreelancer.com/dashboard?tab=finance&sub=jobs",
      },
      idempotencyKey: `client-job-${session.id}`,
    });

    await logPaymentNotification({
      userId,
      eventType: "client_job.paid",
      env,
      amountCents: session.amount_total ?? null,
      currency: session.currency ?? null,
      priceId,
      message: `ลูกค้าชำระ${paymentLabel} ฿${Math.round(amountThb).toLocaleString("th-TH")} ผ่าน Stripe`,
      metadata: { sessionId: session.id, jobId, paymentType },
    });
  }
}

async function handleInvoicePaymentSucceeded(invoice: any, env: StripeEnv) {
  if (invoice.billing_reason === "subscription_create") return;
  const subId = invoice.subscription;
  if (!subId) return;
  try {
    const stripe = createStripeClient(env);
    const sub = await stripe.subscriptions.retrieve(subId);
    const userId = sub.metadata?.userId;
    if (!userId) return;
    await getSupabase().rpc("reset_ai_period_on_renewal", { _user_id: userId });
    await enqueueEmail({
      userId,
      templateName: "payment-receipt",
      templateData: {
        amount: ((invoice.amount_paid ?? 0) / 100).toFixed(2),
        currency: (invoice.currency ?? "thb").toUpperCase(),
        nextBillingDate: tsToIso(invoice.period_end),
        invoiceUrl: invoice.hosted_invoice_url ?? null,
      },
      idempotencyKey: `receipt-${invoice.id}`,
    });
    await logPaymentNotification({
      userId,
      eventType: "invoice.paid",
      env,
      amountCents: invoice.amount_paid ?? null,
      currency: invoice.currency ?? null,
      message: `ชำระเงินรอบบิลสำเร็จ`,
    });
  } catch (err) {
    console.error("[stripe-webhook] invoice.paid lookup failed:", err);
  }
}

async function handleAccountUpdated(account: any, env: StripeEnv) {
  await syncConnectAccountFromStripe(
    {
      id: account.id,
      metadata: account.metadata,
      details_submitted: account.details_submitted,
      payouts_enabled: account.payouts_enabled,
    },
    env,
  );
}

async function handleTransferPaid(transfer: any, env: StripeEnv) {
  const cashoutId = transfer.metadata?.cashoutId;
  if (!cashoutId) return;
  await getSupabase().rpc("mark_cashout_paid_stripe", { _cashout_id: cashoutId });
  await logPaymentNotification({
    userId: transfer.metadata?.userId ?? null,
    eventType: "cashout.paid",
    env,
    amountCents: transfer.amount ?? null,
    currency: transfer.currency ?? null,
    message: `โอน cashout สำเร็จ (${transfer.id})`,
    metadata: { cashoutId, transferId: transfer.id },
  });
}

async function handleTransferFailed(transfer: any, env: StripeEnv) {
  const cashoutId = transfer.metadata?.cashoutId;
  if (!cashoutId) return;
  const reason = transfer.failure_message ?? "transfer_reversed";
  await getSupabase().rpc("mark_cashout_reversed_stripe", {
    _cashout_id: cashoutId,
    _reason: reason,
  });
  await logPaymentNotification({
    userId: transfer.metadata?.userId ?? null,
    eventType: "cashout.failed",
    env,
    message: `โอน cashout ล้มเหลว (${transfer.id})`,
    metadata: { cashoutId, transferId: transfer.id },
  });
}

async function handleWebhook(req: Request, env: StripeEnv) {
  const event = (await verifyWebhook(req, env)) as {
    id?: string;
    type: string;
    data: { object: any };
  };

  if (event.id && (await isWebhookEventProcessed(event.id))) {
    console.log("[stripe-webhook] duplicate event:", event.id);
    return;
  }

  switch (event.type) {
    case "customer.subscription.created":
      await handleSubscriptionUpsert(event.data.object, env, true);
      break;
    case "customer.subscription.updated":
      await handleSubscriptionUpsert(event.data.object, env, false);
      break;
    case "customer.subscription.deleted":
      await handleSubscriptionDeleted(event.data.object, env);
      break;
    case "checkout.session.completed":
      await handleCheckoutCompleted(event.data.object, env);
      break;
    case "invoice.payment_succeeded":
      await handleInvoicePaymentSucceeded(event.data.object, env);
      break;
    case "invoice.payment_failed":
      console.log("[stripe-webhook] invoice.payment_failed — handled via subscription.updated");
      break;
    case "account.updated":
      await handleAccountUpdated(event.data.object, env);
      break;
    case "transfer.created":
      await handleTransferPaid(event.data.object, env);
      break;
    case "transfer.reversed":
      await handleTransferFailed(event.data.object, env);
      break;
    default:
      console.log("[stripe-webhook] unhandled:", event.type);
  }

  if (event.id) {
    await markWebhookEventProcessed(event.id, event.type, env);
  }
}

export const Route = createFileRoute("/api/public/payments/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const limited = guardIpRateLimit(request, IP_RATE_LIMITS.webhook);
        if (limited) return limited;

        const rawEnv = new URL(request.url).searchParams.get("env");
        if (rawEnv !== "sandbox" && rawEnv !== "live") {
          console.error("[stripe-webhook] invalid env:", rawEnv);
          return new Response("invalid env query param — use ?env=sandbox or ?env=live", {
            status: 400,
          });
        }
        try {
          await handleWebhook(request, rawEnv);
          return Response.json({ received: true });
        } catch (e) {
          console.error("[stripe-webhook] error:", e);
          return new Response("Webhook error", { status: 400 });
        }
      },
    },
  },
});
