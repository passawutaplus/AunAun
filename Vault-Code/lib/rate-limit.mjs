// Per-instance fixed-window limiter. Fluid compute reuses instances, so this blunts bursts
// from one client; a global limit belongs in the Vercel WAF.
const buckets = new Map();
const MAX_KEYS = 10_000;

export function rateLimit(key, { limit, windowMs }) {
  const now = Date.now();
  let bucket = buckets.get(key);
  if (!bucket || bucket.reset <= now) {
    if (buckets.size >= MAX_KEYS) {
      for (const [k, b] of buckets) if (b.reset <= now) buckets.delete(k);
      if (buckets.size >= MAX_KEYS) buckets.delete(buckets.keys().next().value);
    }
    bucket = { count: 0, reset: now + windowMs };
    buckets.set(key, bucket);
  }
  bucket.count += 1;
  if (bucket.count > limit) {
    const error = new Error("Too many requests. Please slow down and try again shortly.");
    error.status = 429;
    error.retryAfter = Math.ceil((bucket.reset - now) / 1000);
    throw error;
  }
}

export function clientIp(req) {
  const forwarded = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
  return forwarded || req.headers["x-real-ip"] || req.socket?.remoteAddress || "unknown";
}

export function resetRateLimits() {
  buckets.clear();
}
