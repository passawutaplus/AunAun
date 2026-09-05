/** Calibrated from current ad packages (CPM mid ≈ ฿250 / 1,000 impressions).
 * Basic ฿990 / 7 วัน ≈ 3,000 · Standard ฿2,490 / 14 วัน ≈ 10,000 · Premium ฿5,900 / 30 วัน ≈ 30,000
 */
export const AD_CPM_THB = 250;
export const AD_CUSTOM_MIN_THB = 300;
export const AD_CUSTOM_MAX_THB = 50_000;
export const AD_CUSTOM_MIN_DAYS = 1;
export const AD_CUSTOM_MAX_DAYS = 90;
export const AD_THB_TO_PX = 10;

export type AdImpressionEstimate = {
  low: number;
  mid: number;
  high: number;
  dailyMid: number;
};

export function clampAdCustomAmount(amountThb: number): number {
  const n = Math.floor(Number.isFinite(amountThb) ? amountThb : AD_CUSTOM_MIN_THB);
  return Math.min(AD_CUSTOM_MAX_THB, Math.max(AD_CUSTOM_MIN_THB, n));
}

export function clampAdCustomDays(days: number): number {
  const n = Math.floor(Number.isFinite(days) ? days : AD_CUSTOM_MIN_DAYS);
  return Math.min(AD_CUSTOM_MAX_DAYS, Math.max(AD_CUSTOM_MIN_DAYS, n));
}

export function estimateAdImpressions(amountThb: number, days: number): AdImpressionEstimate {
  const safeAmount = clampAdCustomAmount(amountThb);
  const safeDays = clampAdCustomDays(days);
  const mid = Math.max(1, Math.round((safeAmount / AD_CPM_THB) * 1000));
  const low = Math.max(1, Math.round(mid * 0.8));
  const high = Math.max(low + 1, Math.round(mid * 1.2));
  const dailyMid = Math.max(1, Math.round(mid / safeDays));
  return { low, mid, high, dailyMid };
}

export function formatAdEstimateRange(low: number, high: number): string {
  return `${low.toLocaleString("th-TH")} – ${high.toLocaleString("th-TH")}`;
}
