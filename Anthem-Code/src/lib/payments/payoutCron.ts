/**
 * Cron helpers for weekly auto-payout + end-of-month sweep.
 * Wire to Vercel cron / Supabase scheduled job — do not call from browser.
 */

import { decideAutoPayout, PAYOUT_TIMEZONE } from "./payoutPolicy";

export type SellerPayoutCandidate = {
  userId: string;
  availableSatang: number;
};

export type CronPayoutPlan = {
  userId: string;
  amountSatang: number;
  reason: "weekly_threshold" | "eom_sweep";
};

export function planWeeklyAutoPayouts(candidates: SellerPayoutCandidate[]): CronPayoutPlan[] {
  const out: CronPayoutPlan[] = [];
  for (const c of candidates) {
    const d = decideAutoPayout({ availableSatang: c.availableSatang, isEndOfMonthSweep: false });
    if (d.shouldPayout && d.reason !== "skip") {
      out.push({ userId: c.userId, amountSatang: d.amountSatang, reason: d.reason });
    }
  }
  return out;
}

export function planEndOfMonthSweeps(candidates: SellerPayoutCandidate[]): CronPayoutPlan[] {
  const out: CronPayoutPlan[] = [];
  for (const c of candidates) {
    const d = decideAutoPayout({ availableSatang: c.availableSatang, isEndOfMonthSweep: true });
    if (d.shouldPayout && d.reason !== "skip") {
      out.push({ userId: c.userId, amountSatang: d.amountSatang, reason: d.reason });
    }
  }
  return out;
}

/** True on last calendar day of month in Asia/Bangkok. */
export function isBangkokEndOfMonth(date: Date = new Date()): boolean {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: PAYOUT_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = fmt.formatToParts(date);
  const y = Number(parts.find((p) => p.type === "year")?.value);
  const m = Number(parts.find((p) => p.type === "month")?.value);
  const d = Number(parts.find((p) => p.type === "day")?.value);
  const next = new Date(Date.UTC(y, m - 1, d + 1, 12));
  const nextParts = fmt.formatToParts(next);
  const nextDay = Number(nextParts.find((p) => p.type === "day")?.value);
  return nextDay === 1;
}
