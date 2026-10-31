export type BetaTier = "beta_tester" | "beta_builder" | "core_builder";

export type BetaBadge = {
  count: number;
  points: number;
  tier: BetaTier | null;
  co_creator: boolean;
};

export const BETA_TIERS: { tier: BetaTier; label: string; min: number }[] = [
  { tier: "beta_tester", label: "Beta Tester", min: 1 },
  { tier: "beta_builder", label: "Beta Builder", min: 5 },
  { tier: "core_builder", label: "Core Builder", min: 15 },
];

export const CO_CREATOR_LABEL = "Co-creator";

/** Points per counted feedback (non-empty, max 3 per day — counted server-side). */
export const BETA_POINTS_PER_FEEDBACK = 10;

export function betaTierLabel(tier: BetaTier | null | undefined): string | null {
  return BETA_TIERS.find((t) => t.tier === tier)?.label ?? null;
}

/** Label to show next to a name: Co-creator wins over count tiers. */
export function betaBadgeLabel(badge: BetaBadge | null | undefined): string | null {
  if (!badge) return null;
  if (badge.co_creator) return CO_CREATOR_LABEL;
  return betaTierLabel(badge.tier);
}

export function nextBetaTier(count: number): { label: string; remaining: number; min: number } | null {
  const next = BETA_TIERS.find((t) => count < t.min);
  return next ? { label: next.label, remaining: next.min - count, min: next.min } : null;
}

export function parseBetaBadge(raw: unknown): BetaBadge | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const count = Number(o.count) || 0;
  const tier = BETA_TIERS.some((t) => t.tier === o.tier) ? (o.tier as BetaTier) : null;
  return {
    count,
    points: Number(o.points) || count * BETA_POINTS_PER_FEEDBACK,
    tier,
    co_creator: o.co_creator === true,
  };
}
