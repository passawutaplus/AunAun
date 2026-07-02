import type { LeadScoreInput } from "./types";

const WEIGHTS = {
  keywordMatch: 20,
  painPointMatch: 20,
  engagement: 15,
  recentActivity: 15,
  buyingSignal: 15,
  platformRelevance: 10,
  locationMatch: 5,
} as const;

/** Normalize 0–1 factor to weighted contribution. */
function part(factor: number, weight: number): number {
  const clamped = Math.max(0, Math.min(1, factor));
  return clamped * weight;
}

export function computeLeadScore(input: LeadScoreInput): number {
  const total =
    part(input.keywordMatch, WEIGHTS.keywordMatch) +
    part(input.painPointMatch, WEIGHTS.painPointMatch) +
    part(input.engagementScore, WEIGHTS.engagement) +
    part(input.recentActivity, WEIGHTS.recentActivity) +
    part(input.buyingSignal, WEIGHTS.buyingSignal) +
    part(input.platformRelevance, WEIGHTS.platformRelevance) +
    part(input.locationMatch, WEIGHTS.locationMatch);
  return Math.round(Math.max(0, Math.min(100, total)));
}

export function scoreLeadFromFields(fields: {
  hasKeywordMatch?: boolean;
  hasPainMatch?: boolean;
  engagement?: number;
  isRecent?: boolean;
  hasBuyingSignal?: boolean;
  platformRelevant?: boolean;
  locationMatch?: boolean;
}): number {
  return computeLeadScore({
    keywordMatch: fields.hasKeywordMatch ? 1 : 0.2,
    painPointMatch: fields.hasPainMatch ? 1 : 0.15,
    engagementScore: Math.min(1, (fields.engagement ?? 0) / 1000),
    recentActivity: fields.isRecent ? 1 : 0.3,
    buyingSignal: fields.hasBuyingSignal ? 1 : 0.2,
    platformRelevance: fields.platformRelevant !== false ? 0.8 : 0.3,
    locationMatch: fields.locationMatch ? 1 : 0.4,
  });
}
