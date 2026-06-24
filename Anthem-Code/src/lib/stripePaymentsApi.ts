import { supabase } from "@/integrations/supabase/client";
import { SO1O_APP_URL } from "@/lib/productLinks";
import { assertExternalDigitalPurchaseAllowed } from "@/lib/nativePlatform";

export type StripePaymentsEnv = "sandbox" | "live";

export function getStripePaymentsEnv(): StripePaymentsEnv {
  const mode = import.meta.env.VITE_STRIPE_MODE as string | undefined;
  if (mode === "live") return "live";
  return "sandbox";
}

async function authHeaders(): Promise<HeadersInit> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("กรุณาเข้าสู่ระบบก่อน");
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

export async function startStripeCheckout(opts: {
  priceId: string;
  successPath: string;
  cancelPath?: string;
}): Promise<void> {
  assertExternalDigitalPurchaseAllowed();
  const origin = window.location.origin;
  const successUrl = opts.successPath.startsWith("http")
    ? opts.successPath
    : `${origin}${opts.successPath}`;
  const cancelUrl = opts.cancelPath
    ? opts.cancelPath.startsWith("http")
      ? opts.cancelPath
      : `${origin}${opts.cancelPath}`
    : `${origin}/earnings?topup=canceled`;

  const res = await fetch(`${SO1O_APP_URL.replace(/\/$/, "")}/api/payments/checkout`, {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({
      priceId: opts.priceId,
      environment: getStripePaymentsEnv(),
      successUrl,
      cancelUrl,
    }),
  });

  let json: { url?: string; error?: string };
  try {
    json = (await res.json()) as { url?: string; error?: string };
  } catch {
    throw new Error(
      res.status === 0
        ? "ไม่สามารถเชื่อมต่อระบบชำระเงินได้ — ลองใหม่อีกครั้ง"
        : "ระบบชำระเงินตอบกลับไม่ถูกต้อง",
    );
  }
  if (!res.ok || json.error || !json.url) {
    throw new Error(json.error ?? "ไม่สามารถเริ่ม checkout ได้");
  }
  window.location.href = json.url;
}

export async function startConnectOnboarding(opts: {
  returnPath: string;
  refreshPath?: string;
}): Promise<void> {
  const origin = window.location.origin;
  const returnUrl = opts.returnPath.startsWith("http")
    ? opts.returnPath
    : `${origin}${opts.returnPath}`;
  const refreshUrl = opts.refreshPath
    ? opts.refreshPath.startsWith("http")
      ? opts.refreshPath
      : `${origin}${opts.refreshPath}`
    : `${origin}/earnings?connect=refresh`;

  const res = await fetch(`${SO1O_APP_URL.replace(/\/$/, "")}/api/payments/connect/onboard`, {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({
      environment: getStripePaymentsEnv(),
      returnUrl,
      refreshUrl,
    }),
  });

  const json = (await res.json()) as { url?: string; error?: string };
  if (!res.ok || json.error || !json.url) {
    throw new Error(json.error ?? "ไม่สามารถเริ่มเชื่อมบัญชีได้");
  }
  window.location.href = json.url;
}

export async function processCashoutViaStripe(cashoutId: string): Promise<string> {
  const res = await fetch(`${SO1O_APP_URL.replace(/\/$/, "")}/api/payments/cashout/process`, {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({
      cashoutId,
      environment: getStripePaymentsEnv(),
    }),
  });

  const json = (await res.json()) as { transferId?: string; error?: string };
  if (!res.ok || json.error || !json.transferId) {
    throw new Error(json.error ?? "โอน Stripe ล้มเหลว");
  }
  return json.transferId;
}

/** Map preset px amounts to Stripe lookup keys. */
export const PX_PRICE_BY_AMOUNT: Record<number, string> = {
  500: "px_500",
  2000: "px_2000",
  10000: "px_10000",
};

export async function startBoostCheckout(opts: {
  boostId: string;
  priceId: string;
  successPath: string;
  cancelPath?: string;
}): Promise<void> {
  assertExternalDigitalPurchaseAllowed();
  const origin = window.location.origin;
  const successUrl = opts.successPath.startsWith("http")
    ? opts.successPath
    : `${origin}${opts.successPath}`;
  const cancelUrl = opts.cancelPath
    ? opts.cancelPath.startsWith("http")
      ? opts.cancelPath
      : `${origin}${opts.cancelPath}`
    : `${origin}/?boost=canceled`;

  const res = await fetch(`${SO1O_APP_URL.replace(/\/$/, "")}/api/payments/checkout`, {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({
      priceId: opts.priceId,
      environment: getStripePaymentsEnv(),
      successUrl,
      cancelUrl,
      boostId: opts.boostId,
    }),
  });

  const json = (await res.json()) as { url?: string; error?: string };
  if (!res.ok || json.error || !json.url) {
    throw new Error(json.error ?? "ไม่สามารถเริ่ม checkout ได้");
  }
  window.location.href = json.url;
}

const AD_PACKAGE_PRICE: Record<string, string> = {
  basic: "ad_basic",
  standard: "ad_standard",
  premium: "ad_premium",
};

export function adPriceIdForPackage(pkg: "basic" | "standard" | "premium"): string {
  return AD_PACKAGE_PRICE[pkg];
}

export async function startAdCheckout(opts: {
  applicationId: string;
  package: "basic" | "standard" | "premium";
  successPath: string;
  cancelPath?: string;
}): Promise<void> {
  const origin = window.location.origin;
  const successUrl = opts.successPath.startsWith("http")
    ? opts.successPath
    : `${origin}${opts.successPath}`;
  const cancelUrl = opts.cancelPath
    ? opts.cancelPath.startsWith("http")
      ? opts.cancelPath
      : `${origin}${opts.cancelPath}`
    : `${origin}/advertise?pay=canceled`;

  const res = await fetch(`${SO1O_APP_URL.replace(/\/$/, "")}/api/payments/checkout`, {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({
      priceId: adPriceIdForPackage(opts.package),
      environment: getStripePaymentsEnv(),
      successUrl,
      cancelUrl,
      applicationId: opts.applicationId,
    }),
  });

  const json = (await res.json()) as { url?: string; error?: string };
  if (!res.ok || json.error || !json.url) {
    throw new Error(json.error ?? "ไม่สามารถเริ่ม checkout ได้");
  }
  window.location.href = json.url;
}
