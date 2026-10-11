import crypto from "node:crypto";

/**
 * Tiny shared helpers for Anthem Vercel API routes (CommonJS-friendly ESM).
 */

export function readEnv(name) {
  return process.env[name] || "";
}

/**
 * Constant-time check of `Authorization: Bearer <secret>` (cron endpoints).
 * Hashing first makes both buffers the same length, so timingSafeEqual never throws
 * and the secret's length is not leaked either.
 */
export function safeBearerMatches(req, secret) {
  if (!secret) return false;
  const header = String(req.headers?.authorization || req.headers?.Authorization || "");
  const sha = (s) => crypto.createHash("sha256").update(s).digest();
  return crypto.timingSafeEqual(sha(header), sha(`Bearer ${secret}`));
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

/** GET rows from any exposed schema with the service key. Throws on HTTP error (fail-closed). */
export async function restRows(cfg, schema, table, query) {
  const r = await fetch(`${cfg.url}/rest/v1/${table}?${query}`, {
    headers: {
      apikey: cfg.key,
      Authorization: `Bearer ${cfg.key}`,
      "Accept-Profile": schema,
    },
  });
  if (!r.ok) {
    const err = new Error(`db_read_failed_${table}_${r.status}`);
    err.status = 503;
    throw err;
  }
  const rows = await r.json();
  return Array.isArray(rows) ? rows : [];
}

/** Call a Postgres function with the service key. Throws on HTTP error. */
export async function restRpc(cfg, schema, fn, args) {
  const r = await fetch(`${cfg.url}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: {
      apikey: cfg.key,
      Authorization: `Bearer ${cfg.key}`,
      "Content-Type": "application/json",
      "Content-Profile": schema,
      "Accept-Profile": schema,
    },
    body: JSON.stringify(args ?? {}),
  });
  const text = await r.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!r.ok) {
    const msg = data && typeof data === "object" && data.message ? data.message : `rpc_${fn}_${r.status}`;
    const err = new Error(String(msg));
    err.status = r.status;
    throw err;
  }
  return data;
}

/** Strict UUID check — ids go into PostgREST filters. */
export function isUuid(v) {
  return typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
}

/**
 * Amount the buyer must pay for a quote, mirroring src/lib/payments/fees.ts
 * (PromptPay: (job − WHT) × deposit%). WHT rate is clamped to Thai rates 1–5%.
 */
export function expectedQuoteChargeSatang(quote) {
  const job = Math.round(Number(quote?.amount_satang) || 0);
  if (job <= 0) return 0;
  const dep = Math.min(100, Math.max(1, Math.round(Number(quote?.deposit_percent) || 100)));
  const payload = quote?.payload && typeof quote.payload === "object" ? quote.payload : {};
  const rateRaw = Number(payload.whtRate ?? payload.wht_rate ?? 3);
  const rate = Math.min(5, Math.max(1, Number.isFinite(rateRaw) ? rateRaw : 3));
  const wht = quote?.wht_enabled === false ? 0 : Math.round((job * rate) / 100);
  return Math.round(((job - wht) * dep) / 100);
}

export function makeHireReference() {
  const rand = Math.random().toString(36).toUpperCase().replace(/[^A-Z0-9]/g, "");
  return `AP${rand.slice(0, 14).padEnd(14, "0")}`;
}
