import { createHash, timingSafeEqual } from "node:crypto";

/** Constant-time compare that does not leak length (both sides hashed to 32 bytes). */
function safeEqual(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

/**
 * Authorize internal cron routes with CRON_SECRET (preferred).
 *
 * SUPABASE_SERVICE_ROLE_KEY is still accepted as a legacy fallback so existing callers keep
 * working, but it logs a warning. Set CRON_DISALLOW_SERVICE_KEY=true once every cron caller
 * sends CRON_SECRET to remove the fallback.
 */
export function authorizeCronBearer(request: Request): Response | null {
  const cronSecret = process.env.CRON_SECRET?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const allowServiceKey = process.env.CRON_DISALLOW_SERVICE_KEY !== "true";

  if (!cronSecret && !(allowServiceKey && serviceKey)) {
    return Response.json({ error: "Server configuration error" }, { status: 500 });
  }

  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = authHeader.slice("Bearer ".length).trim();
  if (cronSecret && safeEqual(token, cronSecret)) return null;

  if (allowServiceKey && serviceKey && safeEqual(token, serviceKey)) {
    console.warn("[cronAuth] request authorized with legacy service-role key; migrate caller to CRON_SECRET");
    return null;
  }

  return Response.json({ error: "Forbidden" }, { status: 403 });
}
