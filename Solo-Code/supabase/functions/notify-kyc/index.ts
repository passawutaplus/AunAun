import { supabaseSecretKey, supabasePublishableKey } from "../_shared/supabase-keys.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";
import { corsHeadersForRequest } from "./_shared/cors.ts";
import { anthemEmailFrom, anthemSiteUrl, renderKycStatusEmail } from "./_shared/kyc-email.ts";
import { sendResendEmail } from "./_shared/resend-send.ts";

const BodySchema = z.object({
  request_id: z.string().uuid(),
  status: z.enum(["approved", "rejected"]),
});

const json = (req: Request, body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeadersForRequest(req), "Content-Type": "application/json" },
  });

async function callerIdFrom(
  req: Request,
  supabaseUrl: string,
  anonKey: string,
): Promise<string | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const token = authHeader.slice("Bearer ".length);
  const { data: claims, error } = await userClient.auth.getClaims(token);
  if (error || !claims?.claims?.sub) return null;
  return claims.claims.sub as string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeadersForRequest(req) });
  if (req.method !== "POST") return json(req, { error: "method_not_allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = supabasePublishableKey();
  const serviceKey = supabaseSecretKey();

  const callerId = await callerIdFrom(req, supabaseUrl, anonKey);
  if (!callerId) return json(req, { error: "unauthorized" }, 401);

  let body: z.infer<typeof BodySchema>;
  try {
    body = BodySchema.parse(await req.json());
  } catch {
    return json(req, { error: "invalid_body" }, 400);
  }

  const admin = createClient(supabaseUrl, serviceKey);
  const { data: isAdmin } = await admin.rpc("has_role", { _user_id: callerId, _role: "admin" });
  if (!isAdmin) return json(req, { error: "forbidden" }, 403);

  const { data: reqRow, error: reqErr } = await admin
    .from("kyc_requests")
    .select("id, user_id, status, contact_email, reject_reason_label, admin_note")
    .eq("id", body.request_id)
    .maybeSingle();
  if (reqErr || !reqRow) return json(req, { error: "not_found" }, 404);
  if (reqRow.status !== body.status) {
    return json(req, { error: "status_mismatch" }, 409);
  }

  const siteUrl = anthemSiteUrl();
  let profileQuery = await admin
    .from("profiles")
    .select("display_name, notify_email")
    .eq("user_id", reqRow.user_id)
    .maybeSingle();
  if (!profileQuery.data) {
    profileQuery = await admin
      .from("profiles")
      .select("display_name, notify_email")
      .eq("id", reqRow.user_id)
      .maybeSingle();
  }
  if (profileQuery.data?.notify_email === false) {
    return json(req, { skipped: true, reason: "notifications_disabled" });
  }

  const { data: authUser } = await admin.auth.admin.getUserById(reqRow.user_id);
  const contactEmail =
    typeof reqRow.contact_email === "string" ? reqRow.contact_email.trim().toLowerCase() : "";
  const recipientEmail = contactEmail.includes("@")
    ? contactEmail
    : authUser?.user?.email?.toLowerCase();
  if (!recipientEmail) {
    return json(req, { skipped: true, reason: "no_email" });
  }

  const reason = [reqRow.reject_reason_label, reqRow.admin_note]
    .map((v) => (typeof v === "string" ? v.trim() : ""))
    .filter(Boolean)
    .join(" — ");

  const { html, text, subject } = renderKycStatusEmail({
    recipientName: profileQuery.data?.display_name ?? "คุณ",
    status: body.status,
    reason,
    actionUrl: `${siteUrl}/verify`,
  });

  const { from } = anthemEmailFrom();
  const idempotencyKey = `kyc-${body.status}-${reqRow.id}`;
  const resend = await sendResendEmail({
    to: recipientEmail,
    from,
    subject,
    html,
    text,
    idempotencyKey,
  });
  if (!resend.ok) {
    const { error: queueErr } = await admin.rpc("enqueue_email", {
      queue_name: "transactional_emails",
      payload: {
        message_id: crypto.randomUUID(),
        to: recipientEmail,
        from,
        subject,
        html,
        text,
        purpose: "transactional",
        label: "anthem-kyc-status",
        idempotency_key: idempotencyKey,
        queued_at: new Date().toISOString(),
      },
    });
    if (queueErr) return json(req, { ok: false, error: queueErr.message, resend: resend.message }, 500);
    return json(req, { ok: true, queued: true, resend: resend.message });
  }

  return json(req, { ok: true, email: { ok: true, id: resend.id } });
});
