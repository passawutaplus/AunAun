import type { PlanId } from "@/data/plans";

export type PaidTier = Exclude<PlanId, "free">;
export type DowngradeTargetTier = "pro" | "pro_plus";
export type UpgradeTargetTier = "pro_plus" | "inhouse";

const TIER_RANK: Record<PaidTier, number> = {
  pro: 1,
  pro_plus: 2,
  inhouse: 3,
};

const TIER_LABEL: Record<PaidTier | "free", string> = {
  free: "Free",
  pro: "Pro",
  pro_plus: "Pro+",
  inhouse: "In-House",
};

export function tierLabel(tier: PlanId): string {
  return TIER_LABEL[tier];
}

export function tierFromPriceId(priceId: string): PaidTier | "free" {
  if (priceId.startsWith("inhouse_")) return "inhouse";
  if (priceId.startsWith("pro_plus_")) return "pro_plus";
  if (priceId.startsWith("pro_")) return "pro";
  return "free";
}

export function billingCycleFromPriceId(priceId: string): "monthly" | "yearly" {
  return priceId.endsWith("_yearly") ? "yearly" : "monthly";
}

export function downgradeTargetPriceId(
  currentPriceId: string,
  targetTier: DowngradeTargetTier,
): string {
  const cycle = billingCycleFromPriceId(currentPriceId);
  return cycle === "yearly" ? `${targetTier}_yearly` : `${targetTier}_monthly`;
}

export function allowedDowngradeTargets(currentTier: PaidTier): DowngradeTargetTier[] {
  if (currentTier === "inhouse") return ["pro_plus", "pro"];
  if (currentTier === "pro_plus") return ["pro"];
  return [];
}

export function allowedUpgradeTargets(currentTier: PaidTier): UpgradeTargetTier[] {
  if (currentTier === "pro") return ["pro_plus", "inhouse"];
  if (currentTier === "pro_plus") return ["inhouse"];
  return [];
}

export function upgradeTargetPriceId(
  currentPriceId: string,
  targetTier: UpgradeTargetTier,
): string {
  const cycle = billingCycleFromPriceId(currentPriceId);
  return cycle === "yearly" ? `${targetTier}_yearly` : `${targetTier}_monthly`;
}

export function isLowerTier(from: PaidTier, to: PaidTier | DowngradeTargetTier): boolean {
  const toTier = to as PaidTier;
  return TIER_RANK[toTier] < TIER_RANK[from];
}

export function isHigherTier(from: PaidTier, to: PaidTier | UpgradeTargetTier): boolean {
  const toTier = to as PaidTier;
  return TIER_RANK[toTier] > TIER_RANK[from];
}

export function isStripeManagedSubscription(stripeSubscriptionId: string): boolean {
  return !stripeSubscriptionId.startsWith("manual_");
}

export function isPaidTier(tier: PlanId): tier is PaidTier {
  return tier !== "free";
}

export interface PendingTierChange {
  targetTier: DowngradeTargetTier;
  targetPriceId: string;
  effectiveAt: string;
}

export interface SubscriptionDowngradeState {
  tier: PaidTier;
  priceId: string;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string | null;
  downgradeTargets: DowngradeTargetTier[];
  pendingTierChange: PendingTierChange | null;
}

export function isPaymentFnError(res: unknown): res is { error: string } {
  return (
    !!res &&
    typeof res === "object" &&
    "error" in res &&
    typeof (res as { error?: unknown }).error === "string"
  );
}
