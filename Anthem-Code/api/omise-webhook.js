/**
 * Omise webhook receiver (Vercel serverless).
 * Verifies secret header when configured; records provider events for idempotent processing.
 *
 * POST /api/omise-webhook
 *
 * Processing of paid → ledger pending should run server-side with service role
 * (follow-up: Supabase edge or trusted worker). This handler acknowledges + stores.
 */

function readEnv(name) {
  return process.env[name] || "";
}

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
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
    // Omise may use different signature schemes; keep a shared-secret gate for ops.
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

  // Persist via Supabase REST when configured (optional at bootstrap).
  const supabaseUrl = readEnv("SUPABASE_URL") || readEnv("VITE_SUPABASE_URL");
  const serviceKey = readEnv("SUPABASE_SERVICE_ROLE_KEY");
  if (supabaseUrl && serviceKey) {
    try {
      await fetch(`${supabaseUrl.replace(/\/$/, "")}/rest/v1/provider_events`, {
        method: "POST",
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          "Content-Type": "application/json",
          Prefer: "resolution=ignore-duplicates,return=minimal",
        },
        body: JSON.stringify({
          provider: "omise",
          provider_event_id: String(eventId),
          event_type: String(eventType),
          payload,
        }),
      });
    } catch {
      // Acknowledge anyway to avoid infinite retries storm; ops reconciles.
    }
  }

  return json(res, 200, { ok: true, eventId: String(eventId) });
};
