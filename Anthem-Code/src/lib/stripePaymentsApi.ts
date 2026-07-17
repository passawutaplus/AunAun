/**
 * @deprecated Solo Stripe hub for Aplus1 — CUT OVER.
 * Do not call Solo `/api/payments/*` for new Aplus1 flows.
 * Use `src/lib/payments/*` + Omise (see docs/payments-omise.md).
 *
 * Exports kept so existing UI can show a controlled coming-soon error.
 */
import {
  APLUS1_SOLO_PAYMENTS_CUTOVER_TH,
  assertAplus1PaymentsEnabled,
} from "@/lib/aplus1Launch";

export type StripePaymentsEnv = "sandbox" | "live";

export function getStripePaymentsEnv(): StripePaymentsEnv {
  const mode = import.meta.env.VITE_STRIPE_MODE as string | undefined;
  if (mode === "live") return "live";
  return "sandbox";
}

function refuseSoloPayment(): never {
  throw new Error(APLUS1_SOLO_PAYMENTS_CUTOVER_TH);
}

/** @deprecated Cut — no Solo checkout. */
export async function startStripeCheckout(_opts: {
  priceId: string;
  successPath: string;
  cancelPath?: string;
  amountPx?: number;
}): Promise<void> {
  assertAplus1PaymentsEnabled();
  refuseSoloPayment();
}

/** @deprecated Cut — no Solo Connect. */
export async function startConnectOnboarding(_opts: {
  returnPath: string;
  refreshPath?: string;
}): Promise<void> {
  assertAplus1PaymentsEnabled();
  refuseSoloPayment();
}

/** @deprecated Cut — admin must use Omise/manual payout path. */
export async function processCashoutViaStripe(
  _cashoutId: string,
  _opts?: { admin?: boolean },
): Promise<string> {
  refuseSoloPayment();
}

/** Map preset px amounts (UI labels only — paid top-up via Solo is cut). */
export const PX_PRICE_BY_AMOUNT: Record<number, string> = {
  500: "px_500",
  2000: "px_2000",
  10000: "px_10000",
};

export const PX_CUSTOM_PRICE_ID = "px_custom";
export const PX_CUSTOM_MIN = 100;
export const PX_CUSTOM_MAX = 10_000;

/** @deprecated Cut — no Solo boost checkout. */
export async function startBoostCheckout(_opts: {
  boostId: string;
  priceId: string;
  successPath: string;
  cancelPath?: string;
}): Promise<void> {
  assertAplus1PaymentsEnabled();
  refuseSoloPayment();
}

const AD_PACKAGE_PRICE: Record<string, string> = {
  basic: "ad_basic",
  standard: "ad_standard",
  premium: "ad_premium",
};

export function adPriceIdForPackage(pkg: "basic" | "standard" | "premium"): string {
  return AD_PACKAGE_PRICE[pkg];
}

/** @deprecated Cut — no Solo ad checkout. */
export async function startAdCheckout(_opts: {
  applicationId: string;
  package: "basic" | "standard" | "premium";
  successPath: string;
  cancelPath?: string;
}): Promise<void> {
  assertAplus1PaymentsEnabled();
  refuseSoloPayment();
}
