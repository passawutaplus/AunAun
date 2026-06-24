import Stripe from "stripe";

const getEnv = (key: string): string => {
  const value = process.env[key];
  if (!value) throw new Error(`${key} is not configured`);
  return value;
};

export type StripeEnv = "sandbox" | "live";

const GATEWAY_STRIPE_BASE = "https://connector-gateway.lovable.dev/stripe";

export function getConnectionApiKey(env: StripeEnv): string {
  return env === "sandbox" ? getEnv("STRIPE_SANDBOX_API_KEY") : getEnv("STRIPE_LIVE_API_KEY");
}

/** User-facing hint when Stripe keys or catalog are not ready. */
export function getStripeSetupError(env: StripeEnv): string | null {
  try {
    const key = getConnectionApiKey(env);
    if (key.startsWith("rkcs_")) {
      return (
        "Stripe sandbox ใช้คีย์ชั่วคราว (rkcs_) ยังสร้าง checkout ไม่ได้ — " +
        "เปิด Dashboard → Developers → API keys (Test mode) คัดลอก sk_test_ " +
        "ใส่ STRIPE_SANDBOX_API_KEY แล้วรัน npm run stripe:sync"
      );
    }
    if (!key.startsWith("sk_") && !key.startsWith("rk_")) {
      return "STRIPE API key ไม่ถูกต้อง — ต้องขึ้นต้นด้วย sk_test_ / sk_live_";
    }
    return null;
  } catch {
    return env === "sandbox"
      ? "ตั้ง STRIPE_SANDBOX_API_KEY=sk_test_... ใน Solo-Code/.env"
      : "ตั้ง STRIPE_LIVE_API_KEY=sk_live_... ใน Solo-Code/.env";
  }
}

function useDirectStripe(): boolean {
  const flag = process.env.STRIPE_USE_DIRECT;
  if (flag === "true" || flag === "1") return true;
  if (flag === "false" || flag === "0") return false;
  return !process.env.LOVABLE_API_KEY;
}

export function createStripeClient(env: StripeEnv): Stripe {
  const secretKey = getConnectionApiKey(env);
  const apiVersion = "2026-03-25.dahlia";

  if (useDirectStripe()) {
    return new Stripe(secretKey, { apiVersion });
  }

  const lovableApiKey = getEnv("LOVABLE_API_KEY");
  return new Stripe(secretKey, {
    apiVersion,
    httpClient: Stripe.createFetchHttpClient((url, init) => {
      const gatewayUrl = url.toString().replace("https://api.stripe.com", GATEWAY_STRIPE_BASE);
      return fetch(gatewayUrl, {
        ...init,
        headers: {
          ...Object.fromEntries(new Headers(init?.headers).entries()),
          "X-Connection-Api-Key": secretKey,
          "Lovable-API-Key": lovableApiKey,
        },
      });
    }),
  });
}

export function getStripeConnectSetupHint(message: string): string | null {
  if (/signed up for Connect/i.test(message)) {
    return (
      "บัญชี Stripe ยังไม่ได้เปิด Connect — เปิด Test mode แล้วไปที่ " +
      "https://dashboard.stripe.com/test/connect/overview กด Get started / Complete setup ก่อน " +
      "(ใช้ key ชุดเดียวกับ STRIPE_SANDBOX_API_KEY ใน .env)"
    );
  }
  return null;
}

export function getStripeErrorMessage(error: unknown): string {
  if (error && typeof error === "object") {
    const e = error as {
      message?: string;
      type?: string;
      code?: string;
      raw?: { message?: string; type?: string; code?: string };
    };
    const message = e.raw?.message ?? e.message;
    if (message) {
      const connectHint = getStripeConnectSetupHint(message);
      if (connectHint) return connectHint;
      const details = [e.raw?.type ?? e.type, e.raw?.code ?? e.code].filter(Boolean);
      return details.length ? `${message} (${details.join(", ")})` : message;
    }
  }
  return "Stripe request failed";
}

export async function verifyWebhook(
  req: Request,
  env: StripeEnv,
): Promise<{ type: string; data: { object: any } }> {
  const signature = req.headers.get("stripe-signature");
  const body = await req.text();
  const secret =
    env === "sandbox"
      ? getEnv("PAYMENTS_SANDBOX_WEBHOOK_SECRET")
      : getEnv("PAYMENTS_LIVE_WEBHOOK_SECRET");

  if (!signature || !body) throw new Error("Missing signature or body");

  let timestamp: string | undefined;
  const v1Signatures: string[] = [];
  for (const part of signature.split(",")) {
    const [key, value] = part.split("=", 2);
    if (key === "t") timestamp = value;
    if (key === "v1") v1Signatures.push(value);
  }
  if (!timestamp || v1Signatures.length === 0) throw new Error("Invalid signature format");

  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (age > 300) throw new Error("Webhook timestamp too old");

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signed = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${timestamp}.${body}`),
  );
  const expected = Buffer.from(new Uint8Array(signed)).toString("hex");

  if (!v1Signatures.includes(expected)) throw new Error("Invalid webhook signature");

  return JSON.parse(body);
}
