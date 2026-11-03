/**
 * Shared CORS allowlist for Supabase Edge Functions invoked from So1o / SAMECOR browsers.
 */

const STATIC_ORIGINS = [
  "https://solofreelancer.com",
  "https://www.solofreelancer.com",
  "https://so1o-freelancer-managment.lovable.app",
  "https://samecor.com",
  "https://www.samecor.com",
  "https://aplus1.app",
  "https://www.aplus1.app",
  "https://aplus1-demo.vercel.app",
  "https://pixel100.com",
  "https://an1hem.app",
  "https://www.an1hem.app",
  "https://hq.solofreelancer.com",
  "https://so1o-ops-hub.vercel.app",
  "http://localhost:3090",
  "http://127.0.0.1:3090",
  "http://localhost:5173",
  "http://localhost:8080",
  "http://localhost:8081",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:8080",
  "http://127.0.0.1:8081",
] as const;

const LOVABLE_PREVIEW_ORIGIN_RE = /^https:\/\/([a-z0-9-]+\.)*lovable\.app$/i;

/** Vercel production + preview deploys for so1o-ops-hub */
const VERCEL_OPS_HUB_ORIGIN_RE = /^https:\/\/so1o-ops[-a-z0-9.]*\.vercel\.app$/i;

/** Vercel preview deployments for SAMECOR (aplus1-demo / an1hem / aplus1-prod). */
const VERCEL_ANTHEM_ORIGIN_RE =
  /^https:\/\/(aplus1-demo|an1hem|aplus1-prod)[a-z0-9-]*\.vercel\.app$/i;

function extraOriginsFromEnv(): string[] {
  const raw = Deno.env.get("CORS_ALLOWED_ORIGINS_EXTRA")?.trim();
  if (!raw) return [];
  return raw
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function isAllowedCorsOrigin(origin: string): boolean {
  if (STATIC_ORIGINS.includes(origin as (typeof STATIC_ORIGINS)[number])) return true;
  if (LOVABLE_PREVIEW_ORIGIN_RE.test(origin)) return true;
  if (VERCEL_OPS_HUB_ORIGIN_RE.test(origin)) return true;
  if (VERCEL_ANTHEM_ORIGIN_RE.test(origin)) return true;
  return extraOriginsFromEnv().includes(origin);
}

/** Only the origin part of the allow-list: for functions that keep their own Allow-Headers/Methods. */
export function corsOriginHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") ?? "";
  const allowed = origin && isAllowedCorsOrigin(origin) ? origin : STATIC_ORIGINS[0];
  return { "Access-Control-Allow-Origin": allowed, Vary: "Origin" };
}

/**
 * Run a handler and stamp the allow-listed origin on whatever Response it returns.
 * Lets a function keep a static corsHeaders object (without Allow-Origin) and still answer
 * each browser with its own origin instead of "*".
 */
export async function serveWithCorsOrigin(
  req: Request,
  handler: (req: Request) => Response | Promise<Response>,
): Promise<Response> {
  const res = await handler(req);
  const origin = corsOriginHeaders(req);
  try {
    for (const [k, v] of Object.entries(origin)) res.headers.set(k, v);
    return res;
  } catch {
    // Immutable headers (a Response passed straight through from fetch): copy it.
    const headers = new Headers(res.headers);
    for (const [k, v] of Object.entries(origin)) headers.set(k, v);
    return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
  }
}

export function corsHeadersForRequest(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") ?? "";
  const allowed = origin && isAllowedCorsOrigin(origin) ? origin : STATIC_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    Vary: "Origin",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-ecosystem-secret",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  };
}
