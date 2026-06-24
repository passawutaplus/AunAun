import { todayISO } from "@/lib/dailySeedPick.vendored";

export const DRILL_TAG = "So1oDrill";
export const DRILL_BADGE_LABEL = "Design Drill";
export const DAILY_DRILL_BADGE_LABEL = "โจทย์ประจำวัน";

export function dailyDrillTagForDate(date = todayISO()): string {
  return `DrillDaily${date}`;
}

export function projectHasDrillTag(tags: string[] | null | undefined): boolean {
  return tags?.includes(DRILL_TAG) ?? false;
}

export function projectHasDailyDrillTag(
  tags: string[] | null | undefined,
  date = todayISO(),
): boolean {
  if (!projectHasDrillTag(tags)) return false;
  return tags?.includes(dailyDrillTagForDate(date)) ?? false;
}

export function mergeDrillTags(
  tags: string[],
  drillType?: string,
  drillDate?: string,
): string[] {
  if (drillType !== "daily" && drillType !== "custom") return tags;
  const merged = [...tags, DRILL_TAG];
  if (drillType === "daily") {
    merged.push(drillDate ? dailyDrillTagForDate(drillDate) : dailyDrillTagForDate());
  }
  return [...new Set(merged)];
}

export const PORTFOLIO_DRILL_HASH = "design-drill";
export const portfolioDrillUrl = () => `/portfolio?drill=daily#${PORTFOLIO_DRILL_HASH}`;

/** Chip label in the projects feed toolbar (before All). */
export const DESIGN_DRILL_CHIP = "Design Drill" as const;

export type ProjectChipFilter = import("@/data/projectTypes").Category | "All" | typeof DESIGN_DRILL_CHIP;

export const projectsDrillFeedUrl = () => "/?drill=1";
