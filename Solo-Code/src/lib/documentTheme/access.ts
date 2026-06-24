import type { Tier } from "@/hooks/useSubscription";

/** Pro, Pro+, and In-House tiers unlock white-label documents. */
export function isProTier(tier: Tier): boolean {
  return tier === "pro" || tier === "pro_plus" || tier === "inhouse";
}

export function showSo1oBadge(tier: Tier): boolean {
  return !isProTier(tier);
}

export function showPoweredBy(tier: Tier): boolean {
  return !isProTier(tier);
}

export function canCustomizeDocumentColors(tier: Tier): boolean {
  return isProTier(tier);
}
