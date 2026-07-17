/**
 * Omise webhook receiver (Vercel serverless).
 * Verifies secret header when configured; records provider events for idempotent processing.
 * On charge.complete / paid events: best-effort update hire_order + payment + hiring_request.
 *
 * POST /api/omise-webhook
 */

function readEnv(name) {
  return process.env[name] || "";
}

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

function supabaseBase() {
  const supabaseUrl = readEnv("SUPABASE_URL") || readEnv("VITE_SUPABASE_URL");
  const serviceKey = readEnv("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) return null;
  return {
    url: supabaseUrl.replace(/\/$/, ""),
    key: serviceKey,
  };
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

module.exports = async function handler(req, res) {
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

  const webhookSecret = readEnv("OMISE_WEBHOOK_SECRET");
  const provided =
    req.headers["x-omise-webhook-secret"] ||
    req.headers["omise-signature"] ||
    "";
  if (webhookSecret && provided && provided !== webhookSecret) {
    return json(res, 401, { error: "invalid_webhook_secret" });
  }

  let payload = req.body;
  if (typeof payload === "string") {
    try {
      payload = JSON.parse(payload);
    } catch {
      return json(res, 400, { error: "invalid_json" });
    }
  }
  if (!payload || typeof payload !== "object") {
    return json(res, 400, { error: "empty_body" });
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
};
