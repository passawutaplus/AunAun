/**
 * Quote expiry cron (Vercel cron).
 * GET/POST /api/aplus1-quote-expiry-cron?kind=expire-quotes
 * Protect with CRON_SECRET Bearer.
 *
 * Marks shared.hire_quotes with status=sent and expires_at < now() as expired.
 */

function readEnv(name) {
  return process.env[name] || "";
}

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

async function expireQuotes() {
  const supabaseUrl = readEnv("SUPABASE_URL") || readEnv("VITE_SUPABASE_URL");
  const serviceKey = readEnv("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceKey) {
    return { ok: true, kind: "expire-quotes", expiredCount: 0, stub: true, message: "no service role" };
  }

  const now = new Date().toISOString();
  const base = supabaseUrl.replace(/\/$/, "");
  const res = await fetch(
    `${base}/rest/v1/hire_quotes?status=eq.sent&expires_at=lt.${encodeURIComponent(now)}`,
    {
      method: "PATCH",
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
        "Accept-Profile": "shared",
        "Content-Profile": "shared",
        Prefer: "return=representation",
      },
      body: JSON.stringify({ status: "expired", updated_at: now }),
    },
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `expire failed (${res.status})`);
  }

  const rows = await res.json().catch(() => []);
  const expiredCount = Array.isArray(rows) ? rows.length : 0;
  return { ok: true, kind: "expire-quotes", expiredCount, stub: false };
}

export default async function handler(req, res) {
  const secret = readEnv("CRON_SECRET");
  const auth = req.headers.authorization || "";
  if (secret && auth !== `Bearer ${secret}`) {
    return json(res, 401, { error: "unauthorized" });
  }

  const url = new URL(req.url || "/", "http://localhost");
  const kind = url.searchParams.get("kind") || "expire-quotes";

  if (kind !== "expire-quotes") {
    return json(res, 400, { error: "unknown_kind", kind });
  }

  try {
    const result = await expireQuotes();
    return json(res, 200, result);
  } catch (e) {
    return json(res, 500, {
      ok: false,
      kind,
      error: e instanceof Error ? e.message : "expire_quotes_failed",
    });
  }
}
