import { z } from "zod";

export const paymentsEnvSchema = z.enum(["sandbox", "live"]);

export const PX_CUSTOM_MIN = 100;
export const PX_CUSTOM_MAX = 10_000;

export const checkoutApiInput = z
  .object({
    priceId: z
      .string()
      .min(1)
      .max(64)
      .regex(/^[a-z0-9_]+$/),
    environment: paymentsEnvSchema.optional(),
    successUrl: z.string().url().max(500),
    cancelUrl: z.string().url().max(500),
    quantity: z.number().int().min(1).max(50).optional(),
    amountPx: z.number().int().min(PX_CUSTOM_MIN).max(PX_CUSTOM_MAX).optional(),
    boostId: z.string().uuid().optional(),
    applicationId: z.string().uuid().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.priceId === "px_custom" && data.amountPx == null) {
      ctx.addIssue({
        code: "custom",
        message: "amountPx required for custom px checkout",
        path: ["amountPx"],
      });
    }
  });

export const connectOnboardApiInput = z.object({
  environment: paymentsEnvSchema.optional(),
  returnUrl: z.string().url().max(500),
  refreshUrl: z.string().url().max(500),
});

export const cashoutProcessApiInput = z.object({
  cashoutId: z.string().uuid(),
  environment: paymentsEnvSchema.optional(),
});

export const escrowReleaseApiInput = z.object({
  escrowId: z.string().uuid(),
  environment: paymentsEnvSchema.optional(),
});

export function parseEscrowReleaseApiBody(body: unknown) {
  return escrowReleaseApiInput.parse(body);
}

export function parseCheckoutApiBody(body: unknown) {
  return checkoutApiInput.parse(body);
}

export function parseConnectOnboardApiBody(body: unknown) {
  return connectOnboardApiInput.parse(body);
}

export function parseCashoutProcessApiBody(body: unknown) {
  return cashoutProcessApiInput.parse(body);
}

export const clientCheckoutApiInput = z.object({
  token: z.string().uuid(),
  paymentType: z.enum(["deposit", "final", "escrow"]).optional(),
  environment: paymentsEnvSchema.optional(),
  successUrl: z.string().url().max(500).optional(),
  cancelUrl: z.string().url().max(500).optional(),
});

export function parseClientCheckoutApiBody(body: unknown) {
  return clientCheckoutApiInput.parse(body);
}

const STATIC_ALLOWED_ORIGINS = [
  "https://solofreelancer.com",
  "https://www.solofreelancer.com",
  "https://so1o-freelancer-managment.lovable.app",
  "https://aplus1.app",
  "https://www.aplus1.app",
  "https://an1hem.app",
  "https://www.an1hem.app",
  "https://aplus1-demo.vercel.app",
  "https://1px-demo.vercel.app",
  "https://pixel100.com",
  "http://localhost:5173",
  "http://localhost:3000",
  "http://localhost:8080",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:8080",
] as const;

const LOVABLE_PREVIEW_ORIGIN_RE = /^https:\/\/([a-z0-9-]+\.)*lovable\.app$/i;
/** Vercel preview deployments for an1hem / aplus1-demo. */
const VERCEL_ANTHEM_PREVIEW_ORIGIN_RE = /^https:\/\/(aplus1-demo|an1hem|1px-demo)[a-z0-9-]*\.vercel\.app$/i;

/** Origins permitted for Stripe checkout / portal / Connect redirect URLs. */
export function getAllowedPaymentRedirectOrigins(): string[] {
  const origins = new Set<string>(STATIC_ALLOWED_ORIGINS);

  for (const key of ["SITE_URL", "VITE_SITE_URL", "VITE_ANTHEM_APP_URL", "ANTHEM_APP_URL"] as const) {
    const raw = process.env[key]?.trim();
    if (!raw) continue;
    try {
      origins.add(new URL(raw).origin);
    } catch {
      /* ignore invalid env */
    }
  }

  const extra = process.env.PAYMENT_REDIRECT_ORIGINS_EXTRA?.trim();
  if (extra) {
    for (const part of extra.split(/[\s,]+/)) {
      const p = part.trim();
      if (!p) continue;
      try {
        origins.add(p.includes("://") ? new URL(p).origin : new URL(`https://${p}`).origin);
      } catch {
        /* ignore */
      }
    }
  }

  return [...origins];
}

function isAllowedPaymentRedirectOrigin(origin: string): boolean {
  if (getAllowedPaymentRedirectOrigins().includes(origin)) return true;
  if (LOVABLE_PREVIEW_ORIGIN_RE.test(origin)) return true;
  if (VERCEL_ANTHEM_PREVIEW_ORIGIN_RE.test(origin)) return true;
  return false;
}

/**
 * Validate Stripe redirect URLs — blocks open redirects to attacker domains.
 * Returns normalized URL string or throws.
 */
export function assertAllowedPaymentRedirectUrl(raw: string): string {
  let parsed: URL;
  try {
    parsed = new URL(raw.trim());
  } catch {
    throw new Error("Invalid redirect URL");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Redirect URL must use http or https");
  }

  if (parsed.protocol === "http:" && !parsed.hostname.match(/^(localhost|127\.0\.0\.1)$/)) {
    throw new Error("Insecure redirect URL");
  }

  if (!isAllowedPaymentRedirectOrigin(parsed.origin)) {
    throw new Error("Redirect URL origin not allowed");
  }

  return parsed.toString();
}

/** Same allowlist as payment redirects — used for payment REST API CORS. */
export function getPaymentApiCorsOrigin(requestOrigin: string | null): string | null {
  if (!requestOrigin) return null;
  try {
    const origin = new URL(requestOrigin).origin;
    return isAllowedPaymentRedirectOrigin(origin) ? origin : null;
  } catch {
    return null;
  }
}

export function paymentApiCorsHeaders(request: Request): Record<string, string> {
  const origin = getPaymentApiCorsOrigin(request.headers.get("Origin"));
  const base: Record<string, string> = {
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    Vary: "Origin",
  };
  if (origin) {
    base["Access-Control-Allow-Origin"] = origin;
  }
  return base;
}
