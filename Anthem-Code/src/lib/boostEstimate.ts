/** Calibrated loosely from preset packages (99/3d, 249/7d, 499/14d). */
const IMPRESSIONS_PER_THB_DAY = 12;
const EST_CTR = 0.03;

export const BOOST_CUSTOM_MIN_THB = 50;
export const BOOST_CUSTOM_MIN_DAYS = 1;
export const BOOST_CUSTOM_MAX_THB = 50_000;
export const BOOST_CUSTOM_MAX_DAYS = 90;

export type BoostEstimate = {
  impressions: { low: number; mid: number; high: number };
  clicks: { low: number; mid: number; high: number };
  ctrLabel: string;
};

export function estimateBoostStats(amountThb: number, days: number): BoostEstimate {
  const safeAmount = Math.max(BOOST_CUSTOM_MIN_THB, Math.floor(amountThb));
  const safeDays = Math.max(BOOST_CUSTOM_MIN_DAYS, Math.floor(days));
  const budgetPerDay = safeAmount / safeDays;
  const mid = Math.max(1, Math.round(budgetPerDay * IMPRESSIONS_PER_THB_DAY * safeDays));
  const low = Math.max(1, Math.round(mid * 0.8));
  const high = Math.max(low + 1, Math.round(mid * 1.2));
  const clicksMid = Math.max(1, Math.round(mid * EST_CTR));
  const clicksLow = Math.max(1, clicksMid - Math.max(1, Math.round(clicksMid * 0.25)));
  const clicksHigh = clicksMid + Math.max(1, Math.round(clicksMid * 0.25));
  return {
    impressions: { low, mid, high },
    clicks: { low: clicksLow, mid: clicksMid, high: clicksHigh },
    ctrLabel: `${(EST_CTR * 100).toFixed(0)}%`,
  };
}

export function formatBoostEstimateRange(low: number, high: number): string {
  return `${low.toLocaleString("th-TH")} – ${high.toLocaleString("th-TH")}`;
}
