import type { Tier } from "@/hooks/useSubscription";

/** Studio combined quote (an1hem nest) — In-House tier only. */
export function canUseStudioQuote(tier: Tier): boolean {
  return tier === "inhouse";
}
