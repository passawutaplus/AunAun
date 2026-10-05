import engine from "../../../config/engine.json";

export type CapLimits = {
  maxItemsPerRun: number;
  maxItemsPerDay: number;
  maxAiCallsPerRun: number;
  maxAiCallsPerDay: number;
  monthlyAiUsd: number;
};

export type CapUsage = {
  /** Items processed (any outcome) since local midnight. */
  itemsToday: number;
  /** AI vision calls since local midnight. */
  aiCallsToday: number;
  /** AI spend this calendar month in USD. */
  monthUsd: number;
};

export type StopReason = "paused" | "kill_switch" | "daily_items_cap" | "daily_ai_cap" | "monthly_budget" | null;

/** Limits from config/engine.json; SEEDER_BUDGET_USD (env) still overrides the monthly budget. */
export function capLimits(envBudget?: string | undefined): CapLimits {
  const env = Number.parseFloat(envBudget ?? "");
  return {
    maxItemsPerRun: engine.SEEDER_MAX_ITEMS_PER_RUN,
    maxItemsPerDay: engine.SEEDER_MAX_ITEMS_PER_DAY,
    maxAiCallsPerRun: engine.SEEDER_MAX_AI_CALLS_PER_RUN,
    maxAiCallsPerDay: engine.SEEDER_MAX_AI_CALLS_PER_DAY,
    monthlyAiUsd: Number.isFinite(env) && env > 0 ? env : engine.SEEDER_MONTHLY_AI_USD,
  };
}

/**
 * Pure stop decision. ONE kill switch stops everything that costs money (AI image fetching and email);
 * `paused` stops only seeding. Order matters: switches first, then caps.
 */
export function stopReason(
  flags: { paused: boolean; killSwitch: boolean },
  usage: CapUsage,
  limits: CapLimits,
): StopReason {
  if (flags.killSwitch) return "kill_switch";
  if (flags.paused) return "paused";
  if (usage.monthUsd >= limits.monthlyAiUsd) return "monthly_budget";
  if (usage.aiCallsToday >= limits.maxAiCallsPerDay) return "daily_ai_cap";
  if (usage.itemsToday >= limits.maxItemsPerDay) return "daily_items_cap";
  return null;
}

/** How many more items a run may still queue under the daily item cap and the per-run cap. */
export function itemsAllowance(usage: CapUsage, limits: CapLimits): number {
  return Math.max(0, Math.min(limits.maxItemsPerRun, limits.maxItemsPerDay - usage.itemsToday));
}

/** Local (Asia/Bangkok) day start as an ISO instant, for "today" counters. */
export function bangkokDayStartIso(now = new Date()): string {
  const bkk = new Date(now.getTime() + 7 * 3600_000);
  bkk.setUTCHours(0, 0, 0, 0);
  return new Date(bkk.getTime() - 7 * 3600_000).toISOString();
}
