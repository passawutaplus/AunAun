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

const UUID_RE = /^[0-9a-f-]{36}$/i;
const CLOSED_QUOTE_STATUSES = new Set(["expired", "declined", "cancelled", "canceled", "superseded"]);

/**
 * Amount and links always come from the DB order/quote row — never from the client.
 * @returns {Promise<{ amountSatang?: number, conversationId?: string, hiringRequestId?: string, error?: string, status?: number }>}
 */
async function resolveCharge({ userId, quoteId, hireOrderId }) {
  const cfg = supabaseServiceConfig();
  if (!cfg) return { error: "service_not_configured", status: 503 };

  if (hireOrderId) {
    if (!UUID_RE.test(hireOrderId)) return { error: "invalid_order", status: 400 };
    const row = await sharedRestGet(
      cfg,
      "hire_orders",
      `id=eq.${encodeURIComponent(hireOrderId)}&select=buyer_pays_satang,buyer_id,conversation_id,hiring_request_id&limit=1`,
    );
    if (!row) return { error: "order_missing", status: 404 };
    if (String(row.buyer_id) !== String(userId)) return { error: "not_order_buyer", status: 403 };
    return {
      amountSatang: Number(row.buyer_pays_satang),
      conversationId: row.conversation_id ? String(row.conversation_id) : "",
      hiringRequestId: row.hiring_request_id ? String(row.hiring_request_id) : "",
    };
  }

  if (!quoteId || !UUID_RE.test(quoteId)) return { error: "quote_required", status: 400 };
  const quote = await sharedRestGet(
    cfg,
    "hire_quotes",
    `id=eq.${encodeURIComponent(quoteId)}&select=amount_satang,deposit_percent,wht_enabled,wht_rate:payload->>whtRate,status,expires_at,conversation_id,hiring_request_id,created_by&limit=1`,
  );
  if (!quote || quote.amount_satang == null) return { error: "quote_missing", status: 404 };
  if (CLOSED_QUOTE_STATUSES.has(String(quote.status || "").toLowerCase())) {
    return { error: "quote_closed", status: 409 };
  }
  if (quote.expires_at && Date.parse(quote.expires_at) < Date.now()) return { error: "quote_expired", status: 409 };
  if (quote.created_by && String(quote.created_by) === String(userId)) return { error: "not_quote_buyer", status: 403 };

  if (quote.conversation_id) {
    const conv = await sharedRestGet(
      cfg,
      "conversations",
      `id=eq.${encodeURIComponent(quote.conversation_id)}&select=client_id&limit=1`,
    );
    if (conv?.client_id && String(conv.client_id) !== String(userId)) {
      return { error: "not_quote_buyer", status: 403 };
    }
  }

  // Mirrors snapshotFees() in src/lib/payments/fees.ts: charge = (job − WHT) × deposit%.
  const job = Number(quote.amount_satang);
  const whtRate = Number(quote.wht_rate) > 0 ? Number(quote.wht_rate) : 3;
  const wht = quote.wht_enabled === false ? 0 : Math.min(job, Math.round((job * whtRate) / 100));
  const dep = Math.min(100, Math.max(1, Math.round(Number(quote.deposit_percent) || 100)));
  return {
    amountSatang: Math.round(((job - wht) * dep) / 100),
    conversationId: quote.conversation_id ? String(quote.conversation_id) : "",
    hiringRequestId: quote.hiring_request_id ? String(quote.hiring_request_id) : "",
  };
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
    const resolved = await resolveCharge({ userId: user.id, quoteId, hireOrderId });
    if (resolved.error) return json(res, resolved.status || 400, { error: resolved.error });
    const { amountSatang } = resolved;

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
      conversation_id: resolved.conversationId || "",
      quote_id: quoteId,
      hiring_request_id: resolved.hiringRequestId || "",
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
