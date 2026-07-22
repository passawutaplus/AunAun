/**
 * Tiny shared helpers for Anthem Vercel API routes (CommonJS-friendly ESM).
 */

export function readEnv(name) {
  return process.env[name] || "";
}

export function json(res, status, body, { cache = "no-store" } = {}) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  if (cache) res.setHeader("Cache-Control", cache);
  res.end(JSON.stringify(body));
}

export function parseJsonBody(req) {
  try {
    let payload = req.body;
    if (Buffer.isBuffer(payload)) payload = payload.toString("utf8");
    if (typeof payload === "string") payload = JSON.parse(payload || "{}");
    return payload && typeof payload === "object" ? payload : null;
  } catch {
    return null;
  }
}

export function supabaseServiceConfig() {
  const url = (readEnv("SUPABASE_URL") || readEnv("VITE_SUPABASE_URL")).replace(/\/$/, "");
  const key = readEnv("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return null;
  return { url, key };
}

/** Authenticated user from Bearer JWT via Supabase Auth. */
export async function requireSupabaseUser(req) {
  const auth = req.headers.authorization || req.headers.Authorization || "";
  const match = String(auth).match(/^Bearer\s+(.+)$/i);
  if (!match) return null;
  const url = (readEnv("VITE_SUPABASE_URL") || readEnv("SUPABASE_URL")).replace(/\/$/, "");
  const anon =
    readEnv("VITE_SUPABASE_PUBLISHABLE_KEY") ||
    readEnv("SUPABASE_ANON_KEY") ||
    readEnv("VITE_SUPABASE_ANON_KEY");
  if (!url || !anon) return null;
  try {
    const r = await fetch(`${url}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${match[1]}`, apikey: anon },
    });
    if (!r.ok) return null;
    const user = await r.json();
    return user?.id ? user : null;
  } catch {
    return null;
  }
}

export async function sharedRestGet(cfg, table, query) {
  const r = await fetch(`${cfg.url}/rest/v1/${table}?${query}`, {
    headers: {
      apikey: cfg.key,
      Authorization: `Bearer ${cfg.key}`,
      "Accept-Profile": "shared",
    },
  });
  if (!r.ok) return null;
  const rows = await r.json();
  return Array.isArray(rows) ? rows[0] ?? null : null;
}

export function makeHireReference() {
  const rand = Math.random().toString(36).toUpperCase().replace(/[^A-Z0-9]/g, "");
  return `AP${rand.slice(0, 14).padEnd(14, "0")}`;
}
