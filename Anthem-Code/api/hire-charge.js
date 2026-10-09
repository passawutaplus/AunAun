/**
 * Hire charge (PromptPay) — provider: Payso.
 * POST /api/hire-charge
 *
 * Body: { method, title, quoteId | hireOrderId, hiringRequestId?, conversationId }
 * The amount is always computed server-side from the order/quote; any client amount is ignored.
 *
 * The Payso API is not wired yet: after the caller and amount are validated this returns
 * 503 payso_not_integrated, so nothing can be charged until the Payso integration lands.
 */

import {
  expectedQuoteChargeSatang,
  isUuid,
  json,
  parseJsonBody,
  readEnv,
  requireSupabaseUser,
  restRows,
  supabaseServiceConfig,
} from "./_helpers.js";

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
    if (readEnv("PAYMENT_PROVIDER") !== "payso") {
      return json(res, 503, { error: "provider_disabled" });
    }

    const user = await requireSupabaseUser(req);
    if (!user) return json(res, 401, { error: "auth_required" });

    const body = parseJsonBody(req);
    if (!body) return json(res, 400, { error: "invalid_json" });

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

    if (!Number.isInteger(resolved.amountSatang) || resolved.amountSatang < 2000) {
      return json(res, 400, { error: "invalid_amount" });
    }
    if (String(body.method || "") !== "promptpay") {
      return json(res, 400, { error: "unsupported_method" });
    }

    // Payso charge creation goes here once Payso shares its API and webhook verification.
    return json(res, 503, { error: "payso_not_integrated" });
  } catch (e) {
    const message = e instanceof Error ? e.message : "charge_failed";
    return json(res, 500, { error: message });
  }
}
