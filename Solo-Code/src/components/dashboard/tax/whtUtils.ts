import type { IncomeType } from "@/data/mockData";
import { parseThaiDate } from "@/lib/thaiDate";

export { parseThaiDate };

/** Map AI-returned section code (40_2) to internal IncomeType. */
export function sectionToIncomeType(section: string): IncomeType {
  switch (section) {
    case "40_1":
    case "40_2":
      return "freelance";
    case "40_3":
    case "40_6":
      return "professional";
    case "40_5":
      return "rental";
    case "40_8":
      return "online_sales";
    default:
      return "freelance";
  }
}

/** Thai progressive tax brackets (2024+) — netIncome thresholds in THB */
export const TAX_BRACKETS: Array<{ from: number; to: number; rate: number }> = [
  { from: 0, to: 150_000, rate: 0 },
  { from: 150_000, to: 300_000, rate: 0.05 },
  { from: 300_000, to: 500_000, rate: 0.1 },
  { from: 500_000, to: 750_000, rate: 0.15 },
  { from: 750_000, to: 1_000_000, rate: 0.2 },
  { from: 1_000_000, to: 2_000_000, rate: 0.25 },
  { from: 2_000_000, to: 5_000_000, rate: 0.3 },
  { from: 5_000_000, to: Infinity, rate: 0.35 },
];

export function currentBracket(net: number) {
  const idx = TAX_BRACKETS.findIndex((b) => net > b.from && net <= b.to);
  return idx === -1 ? TAX_BRACKETS.length - 1 : idx;
}

/** Snap an inferred WHT rate to the nearest standard preset. */
export function inferWhtRate(gross: number, wht: number): number {
  if (!gross || !wht) return 0;
  const raw = (wht / gross) * 100;
  const presets = [0.5, 1, 1.5, 2, 3, 5, 10, 15];
  return presets.reduce(
    (best, p) => (Math.abs(p - raw) < Math.abs(best - raw) ? p : best),
    presets[0],
  );
}
