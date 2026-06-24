import type { LucideIcon } from "lucide-react";
import { Building2, Crown, Sparkles, User } from "lucide-react";
import type { PlanId } from "@/data/plans";
import { PLANS } from "@/data/plans";
import { AI_TIER_MONTHLY, DAILY_AI_CREDITS } from "@/lib/aiCredits";
import { FREE_MONTHLY_JOB_LIMIT } from "@/lib/planLimits";
import { SO1O_STORAGE_QUOTA_LABEL } from "@/lib/storageQuotas";

export const TIER_RANK: Record<PlanId, number> = {
  free: 0,
  pro: 1,
  pro_plus: 2,
  inhouse: 3,
};

const TIER_ORDER: PlanId[] = ["free", "pro", "pro_plus", "inhouse"];

export function getNextTier(tier: PlanId): PlanId | null {
  const idx = TIER_ORDER.indexOf(tier);
  return idx >= 0 && idx < TIER_ORDER.length - 1 ? TIER_ORDER[idx + 1] : null;
}

export function tierProgress(tier: PlanId): number {
  return ((TIER_RANK[tier] + 1) / TIER_ORDER.length) * 100;
}

export interface TierMetric {
  label: string;
  value: string;
}

export function getTierMetrics(tier: PlanId): TierMetric[] {
  const ai =
    tier === "free"
      ? `Credit AI ${DAILY_AI_CREDITS}/วัน`
      : `Credit AI ${DAILY_AI_CREDITS}/วัน + ${AI_TIER_MONTHLY[tier].toLocaleString("th-TH")}`;
  const jobs = tier === "free" ? `${FREE_MONTHLY_JOB_LIMIT}/เดือน` : "ไม่จำกัด";
  return [
    { label: "AI", value: ai },
    { label: "Storage", value: SO1O_STORAGE_QUOTA_LABEL[tier] },
    { label: "Jobs", value: jobs },
  ];
}

export const TIER_CARD_STYLES: Record<
  PlanId,
  { gradient: string; icon: LucideIcon; accent: string }
> = {
  free: {
    gradient: "from-slate-600/30 via-slate-800/20 to-card",
    icon: User,
    accent: "text-slate-300",
  },
  pro: {
    gradient: "from-primary/30 via-primary/10 to-card",
    icon: Crown,
    accent: "text-primary",
  },
  pro_plus: {
    gradient: "from-violet-600/25 via-indigo-500/10 to-card",
    icon: Sparkles,
    accent: "text-violet-400",
  },
  inhouse: {
    gradient: "from-amber-500/30 via-amber-600/12 to-card",
    icon: Building2,
    accent: "text-amber-400",
  },
};

export function getTierTagline(tier: PlanId): string {
  return PLANS.find((p) => p.id === tier)?.tagline ?? "";
}

export function getTierHighlights(tier: PlanId, max = 5): string[] {
  return PLANS.find((p) => p.id === tier)?.highlights.slice(0, max) ?? [];
}
