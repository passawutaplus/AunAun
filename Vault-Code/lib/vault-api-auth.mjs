import crypto from "node:crypto";

const DEFAULT_SUPABASE_URL = "https://zkflkpbmbozrchqncpzi.supabase.co";

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

export async function resolveAuthContext(req) {
  const token = bearerFromRequest(req);
  if (!token) {
    return { token: "", bearerHash: "", userId: null };
  }

  const url = (process.env.SUPABASE_URL || process.env.VAULT_SUPABASE_URL || DEFAULT_SUPABASE_URL).replace(/\/$/, "");
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VAULT_SUPABASE_SERVICE_ROLE_KEY || "";

  if (serviceKey && token.includes(".")) {
    try {
      const response = await fetch(`${url}/auth/v1/user`, {
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${token}`
        }
      });
      if (response.ok) {
        const user = await response.json();
        if (user?.id) {
          return {
            token,
            bearerHash: hashBearer(user.id),
            userId: user.id
          };
        }
      }
    } catch {}
  }

  const userTokenMatch = /^vault-user-([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i.exec(token);
  if (userTokenMatch) {
    const userId = userTokenMatch[1];
    return {
      token,
      bearerHash: hashBearer(userId),
      userId,
    };
  }

  return { token, bearerHash: hashBearer(token), userId: null };
}

export function requireBearer(req, res) {
  const token = bearerFromRequest(req);
  if (!token) {
    sendUnauthorized(res);
    return null;
  }
  return token;
}

function sendUnauthorized(res) {
  res.statusCode = 401;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.end(JSON.stringify({ success: false, message: "Missing Vault token." }));
}
