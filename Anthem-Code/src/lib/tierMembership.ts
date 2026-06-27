import type { LucideIcon } from "lucide-react";
import { Building2, Crown, Sparkles, User } from "lucide-react";
import type { PlanId } from "@/data/plans";
import { PLANS } from "@/data/plans";
import { PLAN_COMPARISON_TIER_LABELS } from "@/data/planComparison";

const SO1O_STORAGE_LABEL: Record<PlanId, string> = {
  free: "50 MB",
  pro: "2 GB",
  pro_plus: "4 GB",
  inhouse: "10 GB",
};

const FREE_MONTHLY_JOB_LIMIT = 3;
const FREE_STARTER_CREDITS = 25;
const AI_TIER_MONTHLY: Record<Exclude<PlanId, "free">, number> = {
  pro: 800,
  pro_plus: 1400,
  inhouse: 2000,
};

export const TIER_RANK: Record<PlanId, number> = {
  free: 0,
  pro: 1,
  pro_plus: 2,
  inhouse: 3,
};

const TIER_ORDER: PlanId[] = ["free", "pro", "pro_plus", "inhouse"];

const PLAN_IDS = new Set<string>(TIER_ORDER);

/** Coerce unknown DB/API tier strings to a known plan id (prevents settings UI crashes). */
export function normalizePlanId(tier: string | null | undefined): PlanId {
  if (tier && PLAN_IDS.has(tier)) return tier as PlanId;
  return "free";
}

export function tierLabel(tier: PlanId): string {
  return PLAN_COMPARISON_TIER_LABELS[tier];
}

export function getNextTier(tier: PlanId): PlanId | null {
  const idx = TIER_ORDER.indexOf(tier);
  return idx >= 0 && idx < TIER_ORDER.length - 1 ? TIER_ORDER[idx + 1] : null;
}

export function getUpgradeTargets(tier: PlanId): PlanId[] {
  if (tier === "free") return ["pro"];
  if (tier === "pro") return ["pro_plus", "inhouse"];
  if (tier === "pro_plus") return ["inhouse"];
  return [];
}

export function tierProgress(tier: PlanId): number {
  return ((TIER_RANK[tier] + 1) / TIER_ORDER.length) * 100;
}

export interface TierMetric {
  label: string;
  value: string;
}

export function getTierMetrics(tier: PlanId): TierMetric[] {
  const aiMonthly = AI_TIER_MONTHLY[tier as Exclude<PlanId, "free">];
  const ai =
    tier === "free"
      ? `${FREE_STARTER_CREDITS} เริ่มต้น`
      : `${(aiMonthly ?? FREE_STARTER_CREDITS).toLocaleString("th-TH")}`;
  const jobs = tier === "free" ? `${FREE_MONTHLY_JOB_LIMIT}/เดือน` : "ไม่จำกัด";
  return [
    { label: "AI", value: ai },
    { label: "Storage", value: SO1O_STORAGE_LABEL[tier] },
    { label: "Jobs", value: jobs },
  ];
}

export const TIER_CARD_STYLES: Record<
  PlanId,
  { gradient: string; icon: LucideIcon; accent: string }
> = {
  free: {
    gradient: "from-slate-600/30 via-slate-800/20 to-card dark:from-slate-500/25 dark:via-slate-600/15",
    icon: User,
    accent: "text-slate-300 dark:text-slate-200",
  },
  pro: {
    gradient: "from-primary/30 via-primary/10 to-card dark:from-primary/35 dark:via-primary/15",
    icon: Crown,
    accent: "text-primary",
  },
  pro_plus: {
    gradient: "from-violet-600/25 via-indigo-500/10 to-card dark:from-violet-500/30 dark:via-indigo-400/15",
    icon: Sparkles,
    accent: "text-violet-400 dark:text-violet-300",
  },
  inhouse: {
    gradient: "from-amber-500/30 via-amber-600/12 to-card dark:from-amber-500/35 dark:via-amber-400/15",
    icon: Building2,
    accent: "text-amber-400 dark:text-amber-300",
  },
};

export function getTierTagline(tier: PlanId): string {
  return PLANS.find((p) => p.id === tier)?.tagline ?? "";
}

export function getTierHighlights(tier: PlanId, max = 5): string[] {
  return PLANS.find((p) => p.id === tier)?.highlights.slice(0, max) ?? [];
}
