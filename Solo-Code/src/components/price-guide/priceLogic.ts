// Shared pricing logic for Price Guide AI
export type JobType =
  | "logo"
  | "branding"
  | "website"
  | "uiux"
  | "video"
  | "illustration"
  | "content"
  | "photography"
  | "other";

export type Complexity =
  | "easy"
  | "normal"
  | "urgent"
  | "revision_from_other"
  | "specialized"
  | "hard";

export const JOB_TYPE_OPTIONS: { value: JobType; label: string }[] = [
  { value: "logo", label: "ออกแบบโลโก้" },
  { value: "branding", label: "Branding / CI" },
  { value: "website", label: "เว็บไซต์ / Landing Page" },
  { value: "uiux", label: "UI/UX Design" },
  { value: "video", label: "ตัดต่อวิดีโอ / Motion" },
  { value: "illustration", label: "Illustration / กราฟิก" },
  { value: "content", label: "Content / Copywriting" },
  { value: "photography", label: "ถ่ายภาพ / รีทัช" },
  { value: "other", label: "อื่น ๆ" },
];

export const COMPLEXITY_OPTIONS: { value: Complexity; label: string; markup: number }[] = [
  { value: "easy", label: "ง่าย / สโคปชัด", markup: -0.1 },
  { value: "normal", label: "ปกติ", markup: 0 },
  { value: "urgent", label: "งานด่วน", markup: 0.3 },
  { value: "revision_from_other", label: "งานแก้จากที่อื่น", markup: 0.2 },
  { value: "specialized", label: "ใช้โปรแกรมเฉพาะทาง", markup: 0.25 },
  { value: "hard", label: "หินมาก / สโคปกว้าง", markup: 0.4 },
];

// Fallback market presets (THB) — Thai freelance 2026 baseline
export const MARKET_PRESETS: Record<JobType, { min: number; max: number }> = {
  logo: { min: 3000, max: 7000 },
  branding: { min: 8000, max: 35000 },
  website: { min: 15000, max: 60000 },
  uiux: { min: 10000, max: 50000 },
  video: { min: 5000, max: 25000 },
  illustration: { min: 2000, max: 8000 },
  content: { min: 1500, max: 8000 },
  photography: { min: 3000, max: 15000 },
  other: { min: 3000, max: 15000 },
};

export const HOURLY_RATE = 300; // THB / hour baseline
export const HOURS_PER_DAY = 8;

export interface PriceSuggestion {
  hourlyCost: number;
  baseCost: number;
  min: number;
  recommended: number;
  max: number;
  marketAvg: { min: number; max: number };
  withholding3: number;
  netReceived: number;
}

export function computeSuggestion(
  jobType: JobType,
  days: number,
  complexity: Complexity,
  marketOverride?: { min: number; max: number },
): PriceSuggestion {
  const safeDays = Math.max(0.5, Number(days) || 1);
  const hourlyCost = HOURLY_RATE;
  const baseCost = safeDays * HOURS_PER_DAY * hourlyCost;
  const markup = COMPLEXITY_OPTIONS.find((c) => c.value === complexity)?.markup ?? 0;

  const market = marketOverride ?? MARKET_PRESETS[jobType];
  // Blend 60% time-based + 40% market average
  const blendedMid = baseCost * 0.6 + ((market.min + market.max) / 2) * 0.4;
  const recommended = Math.round((blendedMid * (1 + markup)) / 100) * 100;
  const min = Math.max(
    Math.round((Math.min(baseCost, market.min) * (1 + markup) * 0.9) / 100) * 100,
    500,
  );
  const max = Math.round((Math.max(baseCost, market.max) * (1 + markup) * 1.1) / 100) * 100;

  const withholding3 = Math.round(recommended * 0.03);
  const netReceived = recommended - withholding3;

  return {
    hourlyCost,
    baseCost,
    min,
    recommended,
    max,
    marketAvg: market,
    withholding3,
    netReceived,
  };
}

export function fmt(n: number): string {
  return n.toLocaleString("th-TH");
}
