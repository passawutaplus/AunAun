/**
 * PromptPay charge for an object order. Amount comes from the order row, never the client.
 * POST /api/object-charge
 * Body: { orderId, title? }
 * Test-only: { action: "mark_paid", chargeId }
 * Buyer poll: { action: "sync", chargeId, orderId }
 */

import {
  json,
  makeHireReference,
  parseJsonBody,
  readEnv,
  requireSupabaseUser,
  supabaseServiceConfig,
} from "./_helpers.js";
import { markObjectOrderPaidFromCharge } from "./object-order-paid.js";

function basicAuth(secretKey) {
  return `Basic ${Buffer.from(`${secretKey}:`).toString("base64")}`;
}

async function omiseRequest(secretKey, path, { method = "POST", body, idempotencyKey } = {}) {
  const headers = {
    Authorization: basicAuth(secretKey),
    "Omise-Version": "2019-05-29",
  };
  if (body) headers["Content-Type"] = "application/x-www-form-urlencoded";
  if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;
  const res = await fetch(`https://api.omise.co${path}`, {
    method,
    headers,
    body,
  });
  const data = await res.json();
  if (!res.ok || data.object === "error") {
    const err = new Error(typeof data.message === "string" ? data.message : "omise_request_failed");
    err.status = res.status;
    throw err;
  }
  return data;
}

async function anthemGetOrder(cfg, orderId) {
  const res = await fetch(
    `${cfg.url}/rest/v1/object_orders?id=eq.${encodeURIComponent(orderId)}&select=id,buyer_id,amount_satang,payment_status,charge_id,object_title,status`,
    {
      headers: {
        apikey: cfg.key,
        Authorization: `Bearer ${cfg.key}`,
        Accept: "application/json",
        "Accept-Profile": "anthem",
      },
    },
  );
  if (!res.ok) return null;
  const rows = await res.json();
  return Array.isArray(rows) ? rows[0] ?? null : null;
}

async function anthemPatchCharge(cfg, orderId, chargeId) {
  await fetch(
    `${cfg.url}/rest/v1/object_orders?id=eq.${encodeURIComponent(orderId)}&payment_status=eq.unpaid`,
    {
      method: "PATCH",
      headers: {
        apikey: cfg.key,
        Authorization: `Bearer ${cfg.key}`,
        "Content-Type": "application/json",
        "Accept-Profile": "anthem",
        "Content-Profile": "anthem",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({ charge_id: chargeId, updated_at: new Date().toISOString() }),
    },
  );
}

function chargePayload(charge) {
  const source = charge.source || {};
  return {
    chargeId: String(charge.id),
    reference: makeHireReference(),
    qrCodeUri: source?.scannable_code?.image?.download_uri || null,
    authorizeUri: typeof charge.authorize_uri === "string" ? charge.authorize_uri : null,
    amountSatang: Number(charge.amount),
    method: "promptpay",
    expiresAt:
      typeof charge.expires_at === "string"
        ? charge.expires_at
        : new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    live: true,
    status: charge.status,
    paid: charge.paid === true,
  };
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return json(res, 405, { error: "method_not_allowed" });
    if (readEnv("PAYMENT_PROVIDER") && readEnv("PAYMENT_PROVIDER") !== "omise") {
      return json(res, 503, { error: "provider_disabled" });
    }

    const secretKey = readEnv("OMISE_SECRET_KEY");
    if (!secretKey) return json(res, 503, { error: "omise_not_configured" });

    const mode = readEnv("OMISE_MODE") === "live" ? "live" : "test";
    if (mode === "live" && readEnv("OMISE_MARKETPLACE_APPROVED") !== "true") {
      return json(res, 503, { error: "live_blocked_until_marketplace_approved" });
    }

    const user = await requireSupabaseUser(req);
    if (!user) return json(res, 401, { error: "auth_required" });

    const body = parseJsonBody(req);
    if (!body) return json(res, 400, { error: "invalid_json" });

    const cfg = supabaseServiceConfig();
    if (!cfg) return json(res, 503, { error: "service_not_configured" });

    if (body.action === "mark_paid" || body.action === "sync") {
      if (body.action === "mark_paid" && mode !== "test") {
        return json(res, 403, { error: "mark_paid_test_only" });
      }
      const chargeId = String(body.chargeId || "");
      if (!chargeId.startsWith("chrg_")) return json(res, 400, { error: "invalid_charge_id" });
      const charge =
        body.action === "mark_paid"
          ? await omiseRequest(secretKey, `/charges/${encodeURIComponent(chargeId)}/mark_as_paid`, {
              body: new URLSearchParams(),
              idempotencyKey: `obj-paid-${chargeId}`.slice(0, 64),
            })
          : await omiseRequest(secretKey, `/charges/${encodeURIComponent(chargeId)}`, { method: "GET" });
      const buyerId = charge?.metadata?.buyer_user_id;
      if (buyerId && String(buyerId) !== String(user.id)) return json(res, 403, { error: "not_order_buyer" });
      const marked = await markObjectOrderPaidFromCharge(cfg, charge);
      return json(res, 200, { ...chargePayload(charge), marked });
    }

    const orderId = String(body.orderId || "");
    if (!/^[0-9a-f-]{36}$/i.test(orderId)) return json(res, 400, { error: "invalid_order" });

    const order = await anthemGetOrder(cfg, orderId);
    if (!order) return json(res, 404, { error: "order_missing" });
    if (String(order.buyer_id) !== String(user.id)) return json(res, 403, { error: "not_order_buyer" });
    if (order.payment_status === "paid") return json(res, 409, { error: "already_paid" });

    const amountSatang = Number(order.amount_satang);
    if (!Number.isInteger(amountSatang) || amountSatang < 600) {
      return json(res, 400, { error: "invalid_amount" });
    }

    if (order.charge_id && String(order.charge_id).startsWith("chrg_")) {
      const existing = await omiseRequest(secretKey, `/charges/${encodeURIComponent(order.charge_id)}`, {
        method: "GET",
      });
      if (existing.paid === true) {
        await markObjectOrderPaidFromCharge(cfg, existing);
      }
      return json(res, 200, chargePayload(existing));
    }

    const params = new URLSearchParams();
    params.set("amount", String(amountSatang));
    params.set("currency", "thb");
    params.set("description", String(body.title || order.object_title || "SAMECOR object").slice(0, 240));
    params.set("source[type]", "promptpay");
    params.set("metadata[object_order_id]", orderId);
    params.set("metadata[buyer_user_id]", String(user.id));
    params.set("metadata[app]", "aplus1");

    const charge = await omiseRequest(secretKey, "/charges", {
      body: params,
      idempotencyKey: `object-${orderId}`.slice(0, 64),
    });
    await anthemPatchCharge(cfg, orderId, String(charge.id));
    return json(res, 200, chargePayload(charge));
  } catch (error) {
    const message = error instanceof Error ? error.message : "charge_failed";
    const code = typeof error?.status === "number" ? error.status : 0;
    const status = code && code < 500 ? code : code ? 502 : 500;
    return json(res, status, { error: message });
  }
}
