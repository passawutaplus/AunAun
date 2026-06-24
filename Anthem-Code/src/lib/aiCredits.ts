/** Client-safe AI credits helpers — keep in sync with Solo-Code/src/lib/aiCredits.ts */

export const FREE_STARTER_CREDITS = 25;
export const DAILY_AI_CREDITS = 5;
export const FREE_DAILY_TRIAL_DAYS = 14;

export const AI_TIER_MONTHLY: Record<"free" | "pro" | "pro_plus" | "inhouse", number> = {
  free: FREE_STARTER_CREDITS,
  pro: 800,
  pro_plus: 1400,
  inhouse: 2000,
};

export type AiPeriodType =
  | "free_starter"
  | "free_starter_ended"
  | "free_daily_trial"
  | "free_daily_ended"
  | "monthly"
  | "subscription";

export type AiUsageSummary = {
  tier: string;
  period_key: string;
  period_end: string | null;
  period_type?: AiPeriodType | string;
  included_used: number;
  included_limit: number;
  included_remaining: number;
  purchased_balance: number;
  daily_remaining: number;
  daily_limit: number;
  daily_eligible: boolean;
  daily_period_key?: string | null;
  daily_resets_at?: string | null;
  free_trial_days_left?: number;
  free_trial_ends_at?: string | null;
  total_remaining: number;
};

export type CreditAiBarInput = {
  dailyRemaining: number;
  dailyLimit: number;
  poolRemaining: number;
  poolCapacity: number;
};

export type CreditAiBarSegments = {
  dailyPct: number;
  poolPct: number;
  totalCapacity: number;
};

export function creditAiTotalCapacity(input: CreditAiBarInput): number {
  const poolCap = Math.max(input.poolCapacity, input.poolRemaining, 0);
  const dailyCap = Math.max(input.dailyLimit, 0);
  return Math.max(dailyCap + poolCap, 1);
}

export function creditAiBarSegments(input: CreditAiBarInput): CreditAiBarSegments {
  const totalCapacity = creditAiTotalCapacity(input);
  const dailyPct = Math.min(100, (Math.max(input.dailyRemaining, 0) / totalCapacity) * 100);
  const poolPct = Math.min(100 - dailyPct, (Math.max(input.poolRemaining, 0) / totalCapacity) * 100);
  return {
    dailyPct: Math.round(dailyPct * 100) / 100,
    poolPct: Math.round(poolPct * 100) / 100,
    totalCapacity,
  };
}

export function describeAiCreditsPlan(
  summary: Pick<
    AiUsageSummary,
    "tier" | "period_type" | "included_limit" | "daily_limit" | "daily_eligible" | "free_trial_days_left"
  >,
): string {
  const daily =
    summary.daily_eligible && summary.daily_limit > 0
      ? `Credit AI ${summary.daily_limit}/วัน`
      : null;

  if (summary.period_type === "free_starter") {
    return daily
      ? `${daily} + แพ็กเริ่มต้น ${summary.included_limit.toLocaleString("th-TH")} เครดิต`
      : "แพ็กเริ่มต้นฟรี";
  }
  if (summary.period_type === "free_starter_ended" && summary.tier === "free") {
    return "เครดิตหมดแล้ว — อัพเกรดหรือเติมเพื่อใช้ต่อ";
  }
  if (summary.period_type === "free_daily_trial") {
    const days = summary.free_trial_days_left ?? FREE_DAILY_TRIAL_DAYS;
    return `${daily ?? `Credit AI ${DAILY_AI_CREDITS}/วัน`} · เหลืออีก ${days} วัน`;
  }
  if (summary.period_type === "free_daily_ended" && summary.tier === "free") {
    return "ทดลอง Credit AI หมดแล้ว — อัพเกรด Pro เพื่อใช้ต่อ";
  }
  if (summary.period_type === "subscription") {
    const pack = `${summary.included_limit.toLocaleString("th-TH")} เครดิต/รอบบิล`;
    return daily ? `${daily} + ${pack}` : pack;
  }
  const monthly = `${summary.included_limit.toLocaleString("th-TH")} เครดิต/เดือน`;
  return daily ? `${daily} + ${monthly}` : monthly;
}

export function formatAiPeriodEnd(iso: string | null | undefined): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatDailyResetAt(iso: string | null | undefined): string | null {
  if (!iso) return null;
  return new Date(iso).toLocaleString("th-TH", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function aiRemainingPercent(remaining: number, capacity: number): number {
  if (capacity <= 0) return 0;
  return Math.min(100, Math.round((remaining / capacity) * 100));
}

export function aiRemainingBarColor(remaining: number): string {
  if (remaining < 10) return "bg-destructive";
  if (remaining < 20) return "bg-amber-500";
  return "bg-primary";
}

export function poolRemainingFromSummary(summary: Pick<AiUsageSummary, "included_remaining" | "purchased_balance">): number {
  return Math.max(0, summary.included_remaining) + Math.max(0, summary.purchased_balance);
}
