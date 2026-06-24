import { supabaseAdmin } from "@/integrations/supabase/client.server";

const HOUR_MS = 60 * 60 * 1000;

type RateLimitBucket = { count: number; resetAt: number };

const ipBuckets = new Map<string, RateLimitBucket>();

/** Best-effort client IP (Vercel / nginx set x-forwarded-for). */
export function getClientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    "unknown"
  );
}

export type IpRateLimitOptions = {
  /** Unique namespace so limits do not collide across routes. */
  key: string;
  /** Max requests per window. */
  limit: number;
  /** Window length in milliseconds. */
  windowMs: number;
};

/**
 * In-memory sliding window per IP + route key.
 * Works per serverless instance — use for abuse throttling, not hard quotas.
 */
export function isIpRateLimited(ip: string, opts: IpRateLimitOptions): boolean {
  const bucketKey = `${opts.key}:${ip}`;
  const now = Date.now();
  const row = ipBuckets.get(bucketKey);
  if (!row || now > row.resetAt) {
    ipBuckets.set(bucketKey, { count: 1, resetAt: now + opts.windowMs });
    return false;
  }
  row.count += 1;
  return row.count > opts.limit;
}

/** Standard 429 for rate-limited API routes. */
export function rateLimitResponse(body: Record<string, string> = { error: "rate_limited" }): Response {
  return Response.json(body, {
    status: 429,
    headers: { "Retry-After": "60" },
  });
}

/** Guard a request; returns a 429 Response when limited, otherwise null. */
export function guardIpRateLimit(request: Request, opts: IpRateLimitOptions): Response | null {
  if (isIpRateLimited(getClientIp(request), opts)) {
    return rateLimitResponse();
  }
  return null;
}

/** Presets tuned for public / expensive endpoints. */
export const IP_RATE_LIMITS = {
  cspReport: { key: "csp-report", limit: 30, windowMs: 60_000 },
  clientCheckout: { key: "client-checkout", limit: 20, windowMs: 60_000 },
  authenticatedCheckout: { key: "authenticated-checkout", limit: 12, windowMs: 60_000 },
  connectOnboard: { key: "connect-onboard", limit: 10, windowMs: 60_000 },
  escrowRelease: { key: "escrow-release", limit: 6, windowMs: 60_000 },
  cashoutProcess: { key: "cashout-process", limit: 6, windowMs: 60_000 },
  assistantStream: { key: "assistant-stream", limit: 30, windowMs: 60_000 },
  webhook: { key: "stripe-webhook", limit: 120, windowMs: 60_000 },
} as const satisfies Record<string, IpRateLimitOptions>;

/** Max anonymous error reports per email per hour. */
export async function isErrorReportRateLimited(opts: {
  userId: string | null;
  contactEmail?: string;
}): Promise<boolean> {
  const since = new Date(Date.now() - HOUR_MS).toISOString();
  const limit = 3;

  if (opts.userId) {
    const { count, error } = await (supabaseAdmin as any)
      .from("support_tickets")
      .select("id", { count: "exact", head: true })
      .eq("source", "error_page")
      .eq("user_id", opts.userId)
      .gte("created_at", since);
    if (error) {
      console.error("[rateLimit] support_tickets count:", error.message);
      return false;
    }
    return (count ?? 0) >= limit;
  }

  const email = opts.contactEmail?.trim().toLowerCase();
  if (!email) return false;

  const { count, error } = await (supabaseAdmin as any)
    .from("beta_feedback")
    .select("id", { count: "exact", head: true })
    .eq("feature", "error_page")
    .eq("user_email", email)
    .gte("created_at", since);
  if (error) {
    console.error("[rateLimit] beta_feedback count:", error.message);
    return false;
  }
  return (count ?? 0) >= limit;
}
