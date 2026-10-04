import { bearerFromRequest, hashBearer } from "./vault-api-auth.mjs";
import { clientIp, rateLimit } from "./rate-limit.mjs";

// Vercel rejects request bodies above ~4.5 MB before our code runs; stay under it.
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
const MAX_JSON_BYTES = 2 * 1024 * 1024;

export function applyCors(res, methods = "GET, POST, OPTIONS") {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", methods);
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (!res.getHeader?.("Cache-Control")) res.setHeader("Cache-Control", "no-store");
}

export function sendJson(res, status, data) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(data));
}

function tooLarge() {
  const error = new Error("Payload too large");
  error.status = 413;
  return error;
}

function readStream(req, limit) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", chunk => {
      size += chunk.length;
      if (size > limit) {
        reject(tooLarge());
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

export async function readJsonBody(req) {
  if (req.body && typeof req.body === "object" && !Buffer.isBuffer(req.body)) return req.body;
  const raw = typeof req.body === "string" ? req.body : (await readStream(req, MAX_JSON_BYTES)).toString("utf8");
  if (raw.length > MAX_JSON_BYTES) throw tooLarge();
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    const error = new Error("Invalid JSON body.");
    error.status = 400;
    throw error;
  }
}

export async function readRawBody(req, limit = MAX_UPLOAD_BYTES) {
  if (Buffer.isBuffer(req.body)) {
    if (req.body.length > limit) throw tooLarge();
    return req.body;
  }
  return readStream(req, limit);
}

function errorStatus(error, fallback) {
  if (error?.status) return error.status;
  const message = String(error?.message || "");
  if (/not configured/i.test(message)) return 503;
  if (/too large/i.test(message)) return 413;
  return fallback;
}

/**
 * Shared route wrapper: CORS, OPTIONS, method check, bearer requirement, rate limit and
 * error → status mapping. `handle(req, res, ctx)` returns the JSON body (status 200).
 */
export function createHandler({ methods, requireToken = true, limit, fallbackStatus = 400, fallbackMessage = "Request failed.", handle }) {
  const allowed = new Set(methods);
  const corsMethods = [...methods, "OPTIONS"].join(", ");
  return async function handler(req, res) {
    applyCors(res, corsMethods);
    if (req.method === "OPTIONS") {
      res.statusCode = 204;
      return res.end();
    }
    if (!allowed.has(req.method)) return sendJson(res, 405, { success: false, message: "Method not allowed." });
    const token = bearerFromRequest(req);
    if (requireToken && !token) return sendJson(res, 401, { success: false, message: "Missing Vault token." });

    try {
      if (limit) {
        const window = typeof limit === "function" ? limit(req) : limit;
        rateLimit(`${window.name || req.url}:${token ? hashBearer(token) : clientIp(req)}`, window);
        rateLimit(`${window.name || req.url}:ip:${clientIp(req)}`, { limit: window.limit * 4, windowMs: window.windowMs });
      }
      const body = await handle(req, res, { token });
      if (res.writableEnded) return;
      return sendJson(res, 200, body);
    } catch (error) {
      if (error?.retryAfter) res.setHeader("Retry-After", String(error.retryAfter));
      return sendJson(res, errorStatus(error, fallbackStatus), {
        success: false,
        ...(error?.code ? { code: error.code } : error?.status === 429 ? { code: "RATE_LIMITED" } : {}),
        message: error?.message || fallbackMessage,
      });
    }
  };
}
