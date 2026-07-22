/**
 * Create Omise hire charge (PromptPay / card token).
 * POST /api/hire-charge
 *
 * Body: { amountSatang, method, title, quoteId?, hiringRequestId?, conversationId, cardToken? }
 * Test-only: { action: "mark_paid", chargeId } when OMISE_MODE=test
 */

import {
  json,
  makeHireReference,
  parseJsonBody,
  readEnv,
  requireSupabaseUser,
  sharedRestGet,
  supabaseServiceConfig,
} from "./_helpers.js";

function basicAuth(secretKey) {
  return `Basic ${Buffer.from(`${secretKey}:`).toString("base64")}`;
}

async function omisePost(secretKey, path, body, idempotencyKey) {
  const res = await fetch(`https://api.omise.co${path}`, {
    method: "POST",
    headers: {
      Authorization: basicAuth(secretKey),
      "Content-Type": "application/x-www-form-urlencoded",
      "Omise-Version": "2019-05-29",
      "Idempotency-Key": idempotencyKey,
    },
    body,
  });
  const data = await res.json();
  if (!res.ok || data.object === "error") {
    const msg = typeof data.message === "string" ? data.message : "omise_request_failed";
    const err = new Error(msg);
    err.status = res.status;
    err.payload = data;
    throw err;
  }
  return data;
}

/** Prefer DB amount for quote/order; verify buyer owns the order. */
async function resolveAmountSatang({ userId, amountFromClient, quoteId, hireOrderId }) {
  let amountSatang = amountFromClient;
  const cfg = supabaseServiceConfig();
  if (!cfg || (!quoteId && !hireOrderId)) return { amountSatang, error: null };

  try {
    if (hireOrderId) {
      const row = await sharedRestGet(
        cfg,
        "hire_orders",
        `id=eq.${encodeURIComponent(hireOrderId)}&select=buyer_pays_satang,buyer_id,status&limit=1`,
      );
      if (row?.buyer_id && String(row.buyer_id) !== String(userId)) {
        return { amountSatang, error: "not_order_buyer" };
      }
      if (row?.buyer_pays_satang != null) amountSatang = Number(row.buyer_pays_satang);
      return { amountSatang, error: null };
    }

    const row = await sharedRestGet(
      cfg,
      "hire_quotes",
      `id=eq.${encodeURIComponent(quoteId)}&select=amount_satang,deposit_percent&limit=1`,
    );
    if (row?.amount_satang != null) {
      const job = Number(row.amount_satang);
      const dep = Math.min(100, Math.max(1, Math.round(Number(row.deposit_percent) || 100)));
      amountSatang = dep < 100 ? Math.round((job * dep) / 100) : job;
    }
  } catch {
    /* fall back to client amount */
  }
  return { amountSatang, error: null };
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return json(res, 405, { error: "method_not_allowed" });
    }

    if (readEnv("PAYMENT_PROVIDER") && readEnv("PAYMENT_PROVIDER") !== "omise") {
      return json(res, 503, { error: "provider_disabled" });
    }

    const secretKey = readEnv("OMISE_SECRET_KEY");
    if (!secretKey) {
      return json(res, 503, { error: "omise_not_configured" });
    }

    const mode = readEnv("OMISE_MODE") === "live" ? "live" : "test";
    if (mode === "live" && readEnv("OMISE_MARKETPLACE_APPROVED") !== "true") {
      return json(res, 503, { error: "live_blocked_until_marketplace_approved" });
    }

    const user = await requireSupabaseUser(req);
    if (!user) return json(res, 401, { error: "auth_required" });

    const body = parseJsonBody(req);
    if (!body) return json(res, 400, { error: "invalid_json" });

    if (body.action === "mark_paid") {
      if (mode !== "test") return json(res, 403, { error: "mark_paid_test_only" });
      const chargeId = String(body.chargeId || "");
      if (!chargeId.startsWith("chrg_")) {
        return json(res, 400, { error: "invalid_charge_id" });
      }
      const paid = await omisePost(
        secretKey,
        `/charges/${encodeURIComponent(chargeId)}/mark_as_paid`,
        new URLSearchParams(),
        `mark-paid-${chargeId}`,
      );
      return json(res, 200, {
        chargeId: paid.id,
        status: paid.status,
        paid: paid.paid === true,
      });
    }

    const quoteId = body.quoteId != null ? String(body.quoteId) : "";
    const hireOrderId = body.hireOrderId != null ? String(body.hireOrderId) : "";
    const { amountSatang, error: amountErr } = await resolveAmountSatang({
      userId: user.id,
      amountFromClient: Number(body.amountSatang),
      quoteId,
      hireOrderId,
    });
    if (amountErr) return json(res, 403, { error: amountErr });

    if (!Number.isInteger(amountSatang) || amountSatang < 2000) {
      return json(res, 400, { error: "invalid_amount" });
    }

    const method = String(body.method || "");
    if (method !== "promptpay" && method !== "card") {
      return json(res, 400, { error: "unsupported_method" });
    }

    const params = new URLSearchParams();
    params.set("amount", String(amountSatang));
    params.set("currency", "thb");
    params.set("description", String(body.title || "Aplus1 hire").slice(0, 240));

    if (method === "promptpay") {
      params.set("source[type]", "promptpay");
    } else {
      const token = String(body.cardToken || "");
      if (!token.startsWith("tokn_")) {
        return json(res, 400, { error: "card_token_required" });
      }
      params.set("card", token);
    }

    const meta = {
      conversation_id: body.conversationId != null ? String(body.conversationId) : "",
      quote_id: quoteId,
      hiring_request_id: body.hiringRequestId != null ? String(body.hiringRequestId) : "",
      hire_order_id: hireOrderId,
      buyer_user_id: String(user.id),
      app: "aplus1",
    };
    for (const [k, v] of Object.entries(meta)) {
      if (v) params.set(`metadata[${k}]`, v);
    }

    const idem =
      String(body.idempotencyKey || "").trim() ||
      `hire-${method}-${amountSatang}-${meta.conversation_id || "x"}-${Date.now()}`;

    const charge = await omisePost(secretKey, "/charges", params, idem.slice(0, 64));
    const source = charge.source || {};
    const qr = source?.scannable_code?.image?.download_uri || null;

    return json(res, 200, {
      chargeId: String(charge.id),
      reference: makeHireReference(),
      qrCodeUri: qr,
      authorizeUri: typeof charge.authorize_uri === "string" ? charge.authorize_uri : null,
      amountSatang,
      method,
      expiresAt:
        typeof charge.expires_at === "string"
          ? charge.expires_at
          : new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      live: true,
      status: charge.status,
      paid: charge.paid === true,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "charge_failed";
    const code = typeof e?.status === "number" ? e.status : 0;
    const status = code && code < 500 ? code : code ? 502 : 500;
    return json(res, status, { error: message });
  }
}
