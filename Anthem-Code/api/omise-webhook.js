import crypto from "node:crypto";
import { json, readEnv, supabaseServiceConfig } from "./_helpers.js";

/**
 * Omise webhook receiver (Vercel serverless).
 * Requires OMISE_WEBHOOK_SECRET and verifies Omise-Signature HMAC (fail-closed).
 * On charge.complete / paid events: best-effort update hire_order + payment + hiring_request.
 *
 * POST /api/omise-webhook
 */

/**
 * Verify Omise webhook HMAC-SHA256 (secret is base64-encoded).
 * @returns {{ ok: boolean, rawBody: string }}
 */
function verifyOmiseSignature(req, rawBody) {
  const secretB64 = readEnv("OMISE_WEBHOOK_SECRET");
  // Fail closed: unsigned webhooks must never mutate money state.
  if (!secretB64) return { ok: false, reason: "webhook_secret_required" };

  const signatureHeader = req.headers["omise-signature"] || req.headers["Omise-Signature"] || "";
  const timestampHeader =
    req.headers["omise-signature-timestamp"] || req.headers["Omise-Signature-Timestamp"] || "";
  if (!signatureHeader || !timestampHeader) {
    return { ok: false, reason: "missing_signature_headers" };
  }

  const signedPayload = `${timestampHeader}.${rawBody}`;
  let secret;
  try {
    secret = Buffer.from(secretB64, "base64");
  } catch {
    return { ok: false, reason: "invalid_secret_encoding" };
  }
  if (!secret.length) return { ok: false, reason: "empty_secret" };

  const expected = crypto.createHmac("sha256", secret).update(signedPayload, "utf8").digest();
  const signatures = String(signatureHeader)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  for (const sig of signatures) {
    try {
      const sigBuf = Buffer.from(sig, "hex");
      if (sigBuf.length === expected.length && crypto.timingSafeEqual(sigBuf, expected)) {
        return { ok: true };
      }
    } catch {
      /* try next */
    }
  }
  return { ok: false, reason: "signature_mismatch" };
}

function supabaseBase() {
  return supabaseServiceConfig();
}

async function restRequest(cfg, { schema, table, method, query, body, prefer }) {
  const q = query ? `?${query}` : "";
  const headers = {
    apikey: cfg.key,
    Authorization: `Bearer ${cfg.key}`,
    "Content-Type": "application/json",
    Accept: "application/json",
    "Accept-Profile": schema,
    "Content-Profile": schema,
  };
  if (prefer) headers.Prefer = prefer;
  const res = await fetch(`${cfg.url}/rest/v1/${table}${q}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }
  return { ok: res.ok, status: res.status, data };
}

function isPaidChargeEvent(eventType, charge) {
  const key = String(eventType || "").toLowerCase();
  if (key.includes("charge.complete") || key.includes("charge.capture")) return true;
  if (key.includes("charge.create") && charge?.paid === true) return true;
  const status = String(charge?.status || "").toLowerCase();
  return status === "successful" || status === "paid";
}

function extractCharge(payload) {
  const data = payload?.data;
  if (!data) return null;
  if (data.object === "charge") return data;
  if (data.object === "event" && data.data?.object === "charge") return data.data;
  return null;
}

function metaValue(meta, key) {
  if (!meta || typeof meta !== "object") return null;
  const v = meta[key];
  return v != null && String(v).trim() ? String(v).trim() : null;
}

async function processPaidCharge(cfg, charge, eventType) {
  if (!charge?.id) return { skipped: "no_charge" };
  if (!isPaidChargeEvent(eventType, charge)) return { skipped: "not_paid_event" };

  const meta = charge.metadata || {};
  const hireOrderId = metaValue(meta, "hire_order_id");
  const hiringRequestId = metaValue(meta, "hiring_request_id");
  const providerChargeId = String(charge.id);
  const now = new Date().toISOString();

  const result = { hireOrderId, hiringRequestId, paymentUpdated: false, orderUpdated: false, hireUpdated: false, messageInserted: false };

  // Payment row — by provider_charge_id or hire_order_id metadata
  try {
    let paymentQuery = `provider_charge_id=eq.${encodeURIComponent(providerChargeId)}`;
    if (hireOrderId) {
      paymentQuery = `or=(provider_charge_id.eq.${encodeURIComponent(providerChargeId)},hire_order_id.eq.${encodeURIComponent(hireOrderId)})`;
    }
    const payPatch = await restRequest(cfg, {
      schema: "shared",
      table: "payments",
      method: "PATCH",
      query: `${paymentQuery}&status=neq.paid`,
      body: { status: "paid", paid_at: now, updated_at: now },
      prefer: "return=representation",
    });
    if (payPatch.ok && Array.isArray(payPatch.data) && payPatch.data.length) {
      result.paymentUpdated = true;
      if (!hireOrderId && payPatch.data[0]?.hire_order_id) {
        result.hireOrderId = payPatch.data[0].hire_order_id;
      }
    }
  } catch {
    /* columns/table may be missing */
  }

  const orderId = result.hireOrderId || hireOrderId;
  if (orderId) {
    try {
      const orderPatch = await restRequest(cfg, {
        schema: "shared",
        table: "hire_orders",
        method: "PATCH",
        query: `id=eq.${encodeURIComponent(orderId)}&status=in.(awaiting_payment,draft,deposit_paid)`,
        body: {
          status: "paid_pending",
          paid_at: now,
          updated_at: now,
        },
        prefer: "return=representation",
      });
      if (orderPatch.ok && Array.isArray(orderPatch.data) && orderPatch.data.length) {
        result.orderUpdated = true;
        const row = orderPatch.data[0];
        if (!result.hiringRequestId && row.hiring_request_id) {
          result.hiringRequestId = row.hiring_request_id;
        }
        if (row.conversation_id) result.conversationId = row.conversation_id;
        if (row.buyer_id) result.buyerId = row.buyer_id;
      } else if (!result.conversationId) {
        const orderGet = await restRequest(cfg, {
          schema: "shared",
          table: "hire_orders",
          method: "GET",
          query: `id=eq.${encodeURIComponent(orderId)}&select=conversation_id,buyer_id,hiring_request_id`,
        });
        if (orderGet.ok && Array.isArray(orderGet.data) && orderGet.data[0]) {
          result.conversationId = orderGet.data[0].conversation_id;
          result.buyerId = orderGet.data[0].buyer_id;
          if (!result.hiringRequestId) result.hiringRequestId = orderGet.data[0].hiring_request_id;
        }
      }
    } catch {
      /* ignore */
    }
  }

  const hrId = result.hiringRequestId || hiringRequestId;
  if (hrId) {
    try {
      const hirePatch = await restRequest(cfg, {
        schema: "anthem",
        table: "hiring_requests",
        method: "PATCH",
        query: `id=eq.${encodeURIComponent(hrId)}&status=neq.ปิดแล้ว`,
        body: { status: "ตอบรับ", updated_at: now },
        prefer: "return=minimal",
      });
      if (hirePatch.ok) result.hireUpdated = true;
    } catch {
      /* ignore */
    }
  }

  if (result.conversationId) {
    try {
      const amount = charge.amount != null ? Number(charge.amount) / 100 : null;
      const amountLabel = amount != null ? `฿${amount.toLocaleString("th-TH")}` : "ยอดชำระ";
      const content = `ชำระเงิน ${amountLabel} สำเร็จ — Aplus1 รับเงินค่ำประกันแล้ว ผู้รับงานส่งผลงานได้เมื่อพร้อม`;
      const senderId = result.buyerId || metaValue(meta, "buyer_id") || metaValue(meta, "user_id");
      if (senderId) {
        const msgRes = await restRequest(cfg, {
          schema: "shared",
          table: "messages",
          method: "POST",
          body: {
            conversation_id: result.conversationId,
            sender_id: senderId,
            content,
            message_type: "system",
          },
          prefer: "return=minimal",
        });
        if (msgRes.ok) result.messageInserted = true;
      }
    } catch {
      /* ignore */
    }
  }

  return result;
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return json(res, 405, { error: "method_not_allowed" });
    }

    if (readEnv("PAYMENT_PROVIDER") && readEnv("PAYMENT_PROVIDER") !== "omise") {
      return json(res, 503, { error: "provider_disabled" });
    }

    const marketplaceApproved = readEnv("OMISE_MARKETPLACE_APPROVED") === "true";
    const mode = readEnv("OMISE_MODE") === "live" ? "live" : "test";
    if (mode === "live" && !marketplaceApproved) {
      return json(res, 503, { error: "live_blocked_until_marketplace_approved" });
    }

    let rawBody = "";
    let payload = req.body;
    if (Buffer.isBuffer(payload)) {
      rawBody = payload.toString("utf8");
      try {
        payload = JSON.parse(rawBody);
      } catch {
        return json(res, 400, { error: "invalid_json" });
      }
    } else if (typeof payload === "string") {
      rawBody = payload;
      try {
        payload = JSON.parse(payload);
      } catch {
        return json(res, 400, { error: "invalid_json" });
      }
    } else if (payload && typeof payload === "object") {
      // Runtime already parsed JSON — HMAC may fail if secret is set; prefer raw when available.
      rawBody = JSON.stringify(payload);
    } else {
      return json(res, 400, { error: "empty_body" });
    }

    const verified = verifyOmiseSignature(req, rawBody);
    if (!verified.ok) {
      const status = verified.reason === "webhook_secret_required" ? 503 : 401;
      return json(res, status, { error: "invalid_webhook_signature", reason: verified.reason });
    }

    const eventId = payload.id || payload.key || `anon-${Date.now()}`;
    const eventType = payload.key || payload.object || "unknown";

    const cfg = supabaseBase();
    let processResult = null;
    let processError = null;

    if (cfg) {
      try {
        await restRequest(cfg, {
          schema: "shared",
          table: "provider_events",
          method: "POST",
          body: {
            provider: "omise",
            provider_event_id: String(eventId),
            event_type: String(eventType),
            payload,
          },
          prefer: "resolution=ignore-duplicates,return=minimal",
        });
      } catch {
        /* Acknowledge anyway */
      }

      try {
        const charge = extractCharge(payload);
        if (charge) {
          processResult = await processPaidCharge(cfg, charge, eventType);
        }
        if (processResult && processResult.skipped === undefined) {
          await restRequest(cfg, {
            schema: "shared",
            table: "provider_events",
            method: "PATCH",
            query: `provider=eq.omise&provider_event_id=eq.${encodeURIComponent(String(eventId))}`,
            body: {
              processed_at: new Date().toISOString(),
              process_error: null,
            },
            prefer: "return=minimal",
          });
        }
      } catch (e) {
        processError = e instanceof Error ? e.message : String(e);
        try {
          await restRequest(cfg, {
            schema: "shared",
            table: "provider_events",
            method: "PATCH",
            query: `provider=eq.omise&provider_event_id=eq.${encodeURIComponent(String(eventId))}`,
            body: { process_error: processError },
            prefer: "return=minimal",
          });
        } catch {
          /* ignore */
        }
      }
    }

    return json(res, 200, {
      ok: true,
      eventId: String(eventId),
      processed: processResult,
      processError,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return json(res, 200, { ok: false, error: message });
  }
}
