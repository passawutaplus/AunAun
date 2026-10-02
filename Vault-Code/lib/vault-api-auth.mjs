import crypto from "node:crypto";
import { serviceRoleKey, supabaseUrl } from "./supabase-rest.mjs";

const SIGNED_PREFIX = "vxt1";
const SIGNED_TOKEN = /^vxt1\.([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\.([A-Za-z0-9_-]{43})$/i;
const JWT_CACHE_TTL_MS = 60_000;
const JWT_CACHE_MAX = 2_000;
const jwtCache = new Map();

export function bearerFromRequest(req) {
  const header = req.headers.authorization || req.headers.Authorization || "";
  if (!header.startsWith("Bearer ")) return "";
  return header.slice(7).trim();
}

export function hashBearer(token) {
  return crypto.createHash("sha256").update(String(token || "")).digest("hex");
}

export function scopeHashFromAuth(auth) {
  if (auth?.userId) return hashBearer(auth.userId);
  return auth?.bearerHash || "";
}

function tokenSecret() {
  if (process.env.VAULT_EXTENSION_TOKEN_SECRET) return process.env.VAULT_EXTENSION_TOKEN_SECRET;
  const serviceKey = serviceRoleKey();
  return serviceKey ? crypto.createHash("sha256").update(`vault-extension-token:${serviceKey}`).digest("hex") : "";
}

function tokenMac(userId, secret) {
  return crypto.createHmac("sha256", secret).update(`${SIGNED_PREFIX}:${String(userId).toLowerCase()}`).digest("base64url");
}

export function authError(message) {
  const error = new Error(message);
  error.status = 401;
  return error;
}

/** Long-lived extension token bound to one user; only the server can mint it. */
export function signVaultToken(userId) {
  const secret = tokenSecret();
  if (!secret) throw new Error("Extension tokens are not configured on the server.");
  const id = String(userId || "").toLowerCase();
  return `${SIGNED_PREFIX}.${id}.${tokenMac(id, secret)}`;
}

export function verifyVaultToken(token) {
  const match = SIGNED_TOKEN.exec(String(token || ""));
  const secret = tokenSecret();
  if (!match || !secret) return null;
  const userId = match[1].toLowerCase();
  const expected = Buffer.from(tokenMac(userId, secret));
  const given = Buffer.from(match[2]);
  if (expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) return null;
  return userId;
}

function jwtExpiryMs(token) {
  try {
    const payload = JSON.parse(Buffer.from(String(token).split(".")[1] || "", "base64url").toString("utf8"));
    return Number(payload?.exp) * 1000 || 0;
  } catch {
    return 0;
  }
}

/**
 * Resolves a Supabase session JWT via the Auth server. Results are cached briefly per token
 * (never past the JWT's own expiry) so bursts of API calls don't each pay an auth round trip.
 */
export async function supabaseUserFromJwt(token) {
  const serviceKey = serviceRoleKey();
  if (!serviceKey || String(token || "").split(".").length !== 3) return null;
  const now = Date.now();
  const cacheKey = hashBearer(token);
  const cached = jwtCache.get(cacheKey);
  if (cached && cached.until > now) return cached.user;

  let user = null;
  try {
    const response = await fetch(`${supabaseUrl()}/auth/v1/user`, {
      headers: { apikey: serviceKey, Authorization: `Bearer ${token}` }
    });
    if (response.ok) {
      const data = await response.json();
      user = data?.id ? { id: data.id, email: data.email || null } : null;
    }
  } catch {
    return null;
  }

  const exp = jwtExpiryMs(token);
  if (user && exp > now) {
    if (jwtCache.size >= JWT_CACHE_MAX) jwtCache.delete(jwtCache.keys().next().value);
    jwtCache.set(cacheKey, { user, until: Math.min(now + JWT_CACHE_TTL_MS, exp) });
  }
  return user;
}

/**
 * Signed `vxt1.` tokens and Supabase JWTs resolve to a user. Other random strings keep a
 * private anonymous scope (guest alpha). Throws 401 for forged or retired user tokens.
 */
export async function resolveAuthContext(req) {
  const token = bearerFromRequest(req);
  if (!token) return { token: "", bearerHash: "", userId: null };

  if (token.startsWith(`${SIGNED_PREFIX}.`)) {
    const userId = verifyVaultToken(token);
    if (!userId) throw authError("Invalid Vault token. Copy a new extension token from Vault Settings.");
    return { token, bearerHash: hashBearer(userId), userId };
  }

  if (/^vault-user-/i.test(token)) {
    throw authError("This extension token has been retired. Copy a new token from Vault Settings.");
  }

  if (token.split(".").length === 3) {
    const user = await supabaseUserFromJwt(token);
    if (user) return { token, bearerHash: hashBearer(user.id), userId: user.id };
    throw authError("Your Vault session expired. Copy a new extension token from Vault Settings.");
  }

  if (token.length > 512) throw authError("Invalid Vault token.");
  return { token, bearerHash: hashBearer(token), userId: null };
}
