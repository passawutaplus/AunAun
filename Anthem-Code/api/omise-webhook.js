import crypto from "node:crypto";
import {
  expectedQuoteChargeSatang,
  isUuid,
  json,
  readEnv,
  restRows,
  restRpc,
  supabaseServiceConfig,
} from "./_helpers.js";

/** Keep the exact bytes Omise signed — HMAC breaks if we re-serialize parsed JSON. */
export const config = { api: { bodyParser: false } };

async function readRawBody(req) {
  if (typeof req.on !== "function" || req.readableEnded) return null;
  return await new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

/** Re-read the charge from Omise so we never act on a forged or stale payload. */
async function fetchOmiseCharge(chargeId) {
  const secret = readEnv("OMISE_SECRET_KEY");
  if (!secret || !/^chrg_[A-Za-z0-9_]+$/.test(chargeId)) return null;
  const r = await fetch(`https://api.omise.co/charges/${encodeURIComponent(chargeId)}`, {
    headers: {
      Authorization: `Basic ${Buffer.from(`${secret}:`).toString("base64")}`,
      "Omise-Version": "2019-05-29",
    },
  });
  if (!r.ok) throw new Error(`omise_charge_fetch_${r.status}`);
  return await r.json();
}

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
  // charge.complete also fires for FAILED / expired charges — never trust the event name alone.
  const status = String(charge?.status || "").toLowerCase();
  return charge?.paid === true && status === "successful";
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

/** Find the hire order this charge pays for (metadata first, then order.metadata.charge_id). */
async function findOrderForCharge(cfg, chargeId, meta) {
  const cols =
    "id,status,buyer_id,conversation_id,hiring_request_id,quote_id,buyer_pays_satang,balance_due_satang,deposit_percent";
  const metaOrder = metaValue(meta, "hire_order_id");
  if (metaOrder && isUuid(metaOrder)) {
    const [row] = await restRows(cfg, "shared", "hire_orders", `id=eq.${metaOrder}&select=${cols}&limit=1`);
    if (row) return row;
  }
  const [row] = await restRows(
    cfg,
    "shared",
    "hire_orders",
    `metadata->>charge_id=eq.${encodeURIComponent(chargeId)}&select=${cols}&limit=1`,
  );
  return row ?? null;
}

async function processPaidCharge(cfg, payloadCharge, eventType) {
  if (!payloadCharge?.id) return { skipped: "no_charge" };
  const chargeId = String(payloadCharge.id);

  // Source of truth = Omise API, not the webhook body.
  const charge = (await fetchOmiseCharge(chargeId)) ?? payloadCharge;
  if (!isPaidChargeEvent(eventType, charge)) return { skipped: "not_paid", status: charge.status ?? null };

  const meta = charge.metadata || {};
  const paidSatang = Number(charge.amount);
  const now = new Date().toISOString();
  const result = { chargeId, amountSatang: paidSatang, orderConfirmed: false, hireUpdated: false, messageInserted: false };

  const order = await findOrderForCharge(cfg, chargeId, meta);

  // What should this charge have been?
  let expected = null;
  if (order) {
    expected =
      order.status === "deposit_paid" ? Number(order.balance_due_satang) : Number(order.buyer_pays_satang);
  } else {
    const quoteId = metaValue(meta, "quote_id");
    if (quoteId && isUuid(quoteId)) {
      const [quote] = await restRows(
        cfg,
        "shared",
        "hire_quotes",
        `id=eq.${quoteId}&select=amount_satang,deposit_percent,wht_enabled,payload&limit=1`,
      );
      if (quote) expected = expectedQuoteChargeSatang(quote);
    }
  }
  if (expected == null || !Number.isFinite(expected) || expected <= 0) {
    // Paid, but we cannot tie it to anything yet (order not created) — keep the event for retry/reconcile.
    throw new Error("unlinked_paid_charge");
  }
  if (!Number.isFinite(paidSatang) || paidSatang < expected) {
    throw new Error(`amount_mismatch paid=${paidSatang} expected=${expected}`);
  }

  // Payment row (if the app created one).
  await restRequest(cfg, {
    schema: "shared",
    table: "payments",
    method: "PATCH",
    query: `provider_charge_id=eq.${encodeURIComponent(chargeId)}&status=neq.paid`,
    body: { status: "paid", paid_at: now, updated_at: now },
    prefer: "return=minimal",
  });

  let hiringRequestId = metaValue(meta, "hiring_request_id");
  const wasPayable = !order || ["draft", "awaiting_payment", "deposit_paid"].includes(String(order.status));
  if (order && !wasPayable) {
    return { ...result, skipped: "already_confirmed", orderId: order.id };
  }
  if (order) {
    const paidStatus =
      order.status === "deposit_paid"
        ? "paid_pending"
        : Number(order.deposit_percent) < 100
          ? "deposit_paid"
          : "paid_pending";
    await restRpc(cfg, "public", "confirm_hire_order_payment", {
      _order_id: order.id,
      _charge_id: chargeId,
      _paid_status: paidStatus,
    });
    result.orderConfirmed = true;
    result.orderId = order.id;
    hiringRequestId = order.hiring_request_id || hiringRequestId;
  }

  if (hiringRequestId && isUuid(hiringRequestId)) {
    const hirePatch = await restRequest(cfg, {
      schema: "anthem",
      table: "hiring_requests",
      method: "PATCH",
      query: `id=eq.${hiringRequestId}&status=neq.ปิดแล้ว`,
      body: { status: "ตอบรับ", updated_at: now },
      prefer: "return=minimal",
    });
    result.hireUpdated = hirePatch.ok;
  }

  // System message in the chat (sender = buyer is required by the messages schema).
  const conversationId = order?.conversation_id || null;
  const senderId = order?.buyer_id || null;
  if (conversationId && senderId) {
    const amountLabel = `฿${(paidSatang / 100).toLocaleString("th-TH")}`;
    const msgRes = await restRequest(cfg, {
      schema: "shared",
      table: "messages",
      method: "POST",
      body: {
        conversation_id: conversationId,
        sender_id: senderId,
        content: `ชำระเงิน ${amountLabel} สำเร็จ — ระบบรับเงินค้ำประกันแล้ว ผู้รับงานส่งผลงานได้เมื่อพร้อม`,
        message_type: "system",
      },
      prefer: "return=minimal",
    });
    result.messageInserted = msgRes.ok;
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

    let rawBody = await readRawBody(req);
    let payload;
    if (rawBody == null) {
      // Fallback for runtimes that pre-parse: signature will only match if bytes are identical.
      const b = req.body;
      if (Buffer.isBuffer(b)) rawBody = b.toString("utf8");
      else if (typeof b === "string") rawBody = b;
      else if (b && typeof b === "object") rawBody = JSON.stringify(b);
      else return json(res, 400, { error: "empty_body" });
    }
    try {
      payload = JSON.parse(rawBody || "");
    } catch {
      return json(res, 400, { error: "invalid_json" });
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

    // Paid but not linkable yet (order row created after payment) or DB hiccup → non-2xx so Omise retries.
    const retryable =
      processError && (processError.startsWith("unlinked_paid_charge") || processError.startsWith("db_read_failed") || processError.startsWith("omise_charge_fetch"));
    if (!cfg) return json(res, 503, { ok: false, error: "db_not_configured" });

    return json(res, retryable ? 503 : 200, {
      ok: !processError,
      eventId: String(eventId),
      processed: processResult,
      processError,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return json(res, 500, { ok: false, error: message });
  }
}
