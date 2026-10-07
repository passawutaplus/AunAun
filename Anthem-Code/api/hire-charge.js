/**
 * Create Omise hire charge (PromptPay / card token).
 * POST /api/hire-charge
 *
 * Body: { method, title, quoteId | hireOrderId, hiringRequestId?, conversationId, cardToken? }
 * The amount is always computed server-side from the order/quote; any client amount is ignored.
 * Test-only: { action: "mark_paid", chargeId } when OMISE_MODE=test
 */

import {
  expectedQuoteChargeSatang,
  isUuid,
  json,
  makeHireReference,
  parseJsonBody,
  readEnv,
  requireSupabaseUser,
  restRows,
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

/**
 * Server-side amount + ownership. The client amount is NEVER used:
 * every charge must reference a hire order or a quote the caller is the buyer of.
 * Any DB failure → error (fail-closed).
 */
async function resolveCharge({ cfg, userId, quoteId, hireOrderId, hiringRequestId }) {
  if (hireOrderId) {
    if (!isUuid(hireOrderId)) return { error: "invalid_hire_order_id", status: 400 };
    const [order] = await restRows(
      cfg,
      "shared",
      "hire_orders",
      `id=eq.${hireOrderId}&select=id,buyer_id,status,buyer_pays_satang,balance_due_satang,hiring_request_id,quote_id&limit=1`,
    );
    if (!order) return { error: "order_not_found", status: 404 };
    if (String(order.buyer_id) !== String(userId)) return { error: "not_order_buyer", status: 403 };

    let amountSatang;
    if (order.status === "draft" || order.status === "awaiting_payment") {
      amountSatang = Number(order.buyer_pays_satang);
    } else if (order.status === "deposit_paid") {
      amountSatang = Number(order.balance_due_satang);
    } else {
      return { error: "order_not_payable", status: 409 };
    }
    return {
      amountSatang,
      hireOrderId: order.id,
      quoteId: order.quote_id ?? "",
      hiringRequestId: order.hiring_request_id ?? "",
    };
  }

  if (!quoteId) return { error: "quote_or_order_required", status: 400 };
  if (!isUuid(quoteId)) return { error: "invalid_quote_id", status: 400 };

  const [quote] = await restRows(
    cfg,
    "shared",
    "hire_quotes",
    `id=eq.${quoteId}&select=id,status,expires_at,amount_satang,deposit_percent,wht_enabled,payload,hiring_request_id,conversation_id,created_by&limit=1`,
  );
  if (!quote) return { error: "quote_not_found", status: 404 };
  if (["declined", "expired", "cancelled", "superseded"].includes(String(quote.status))) {
    return { error: "quote_not_payable", status: 409 };
  }
  if (quote.expires_at && Date.parse(quote.expires_at) < Date.now()) {
    return { error: "quote_expired", status: 409 };
  }
  if (String(quote.created_by) === String(userId)) return { error: "cannot_pay_own_quote", status: 403 };

  // Caller must be the client side of the hire.
  let buyerOk = false;
  if (quote.hiring_request_id) {
    const [hr] = await restRows(
      cfg,
      "anthem",
      "hiring_requests",
      `id=eq.${quote.hiring_request_id}&select=client_id&limit=1`,
    );
    buyerOk = !!hr && String(hr.client_id) === String(userId);
  } else if (quote.conversation_id) {
    const [conv] = await restRows(
      cfg,
      "shared",
      "conversations",
      `id=eq.${quote.conversation_id}&select=client_id&limit=1`,
    );
    buyerOk = !!conv && String(conv.client_id) === String(userId);
  }
  if (!buyerOk) return { error: "not_quote_buyer", status: 403 };

  // A hiringRequestId from the client is only kept when it matches the quote.
  const hr = quote.hiring_request_id ? String(quote.hiring_request_id) : "";
  if (hiringRequestId && hr && hiringRequestId !== hr) {
    return { error: "hiring_request_mismatch", status: 400 };
  }

  return {
    amountSatang: expectedQuoteChargeSatang(quote),
    hireOrderId: "",
    quoteId: quote.id,
    hiringRequestId: hr,
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

    const cfg = supabaseServiceConfig();
    if (!cfg) return json(res, 503, { error: "db_not_configured" });

    const resolved = await resolveCharge({
      cfg,
      userId: user.id,
      quoteId: body.quoteId != null ? String(body.quoteId) : "",
      hireOrderId: body.hireOrderId != null ? String(body.hireOrderId) : "",
      hiringRequestId: body.hiringRequestId != null ? String(body.hiringRequestId) : "",
    });
    if (resolved.error) return json(res, resolved.status || 400, { error: resolved.error });
    const { amountSatang, quoteId, hireOrderId } = resolved;

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
      `hire-${method}-${hireOrderId || quoteId}-${amountSatang}-${Date.now()}`;

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
