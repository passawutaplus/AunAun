import { endOfDay, startOfDay, subDays } from "date-fns";

export type ProjectStatsRangePreset = "today" | "7d" | "30d" | "custom";

export type ProjectStatsDateRange = {
  preset: ProjectStatsRangePreset;
  customFrom?: string;
  customTo?: string;
};

export const DEFAULT_PROJECT_STATS_DATE_RANGE: ProjectStatsDateRange = { preset: "30d" };

export type ProjectStatsRangeBounds = {
  from: Date;
  to: Date;
};

export function getProjectStatsRangeBounds(
  range: ProjectStatsDateRange,
): ProjectStatsRangeBounds | null {
  const now = new Date();

  switch (range.preset) {
    case "today":
      return { from: startOfDay(now), to: endOfDay(now) };
    case "7d":
      return { from: startOfDay(subDays(now, 6)), to: endOfDay(now) };
    case "30d":
      return { from: startOfDay(subDays(now, 29)), to: endOfDay(now) };
    case "custom": {
      if (!range.customFrom || !range.customTo) return null;
      const from = startOfDay(new Date(`${range.customFrom}T00:00:00`));
      const to = endOfDay(new Date(`${range.customTo}T00:00:00`));
      if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) return null;
      return { from, to };
    }
  }
}

const thaiShortDate = (d: Date) =>
  d.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" });

export function projectStatsRangeLabel(
  range: ProjectStatsDateRange,
  bounds?: ProjectStatsRangeBounds | null,
): string {
  switch (range.preset) {
    case "today":
      return "วันนี้";
    case "7d":
      return "7 วัน";
    case "30d":
      return "30 วัน";
    case "custom":
      if (bounds) return `${thaiShortDate(bounds.from)} – ${thaiShortDate(bounds.to)}`;
      return "กำหนดเอง";
  }
}

export function projectStatsRangeBoundsKey(bounds: ProjectStatsRangeBounds): string {
  return `${bounds.from.toISOString()}__${bounds.to.toISOString()}`;
}
