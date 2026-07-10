import {
  differenceInCalendarDays,
  eachDayOfInterval,
  eachHourOfInterval,
  eachMonthOfInterval,
  eachWeekOfInterval,
  endOfDay,
  endOfHour,
  endOfMonth,
  endOfWeek,
  format,
  startOfDay,
  startOfHour,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { th } from "date-fns/locale";
import type { ProjectStatsRangePreset } from "@/lib/projectStatsDateRange";

export type ViewSeriesGranularity = "hour" | "day" | "week" | "month";

export type ViewSeriesPoint = {
  key: string;
  label: string;
  views: number;
  sortAt: number;
};

const GRANULARITY_LABELS: Record<ViewSeriesGranularity, string> = {
  hour: "ชั่วโมง",
  day: "วัน",
  week: "สัปดาห์",
  month: "เดือน",
};

export function viewGranularityLabel(g: ViewSeriesGranularity): string {
  return GRANULARITY_LABELS[g];
}

export function availableViewGranularities(
  from: Date,
  to: Date,
  preset: ProjectStatsRangePreset,
): ViewSeriesGranularity[] {
  if (preset === "today") return ["hour"];
  const days = differenceInCalendarDays(endOfDay(to), startOfDay(from)) + 1;
  if (days <= 14) return ["day"];
  if (days <= 90) return ["day", "week"];
  return ["week", "month"];
}

export function defaultViewGranularity(
  from: Date,
  to: Date,
  preset: ProjectStatsRangePreset,
): ViewSeriesGranularity {
  return availableViewGranularities(from, to, preset)[0];
}

function bucketKey(date: Date, granularity: ViewSeriesGranularity): string {
  switch (granularity) {
    case "hour":
      return format(startOfHour(date), "yyyy-MM-dd'T'HH");
    case "day":
      return format(startOfDay(date), "yyyy-MM-dd");
    case "week":
      return format(startOfWeek(date, { weekStartsOn: 1 }), "yyyy-MM-dd");
    case "month":
      return format(startOfMonth(date), "yyyy-MM");
  }
}

function slotLabel(date: Date, granularity: ViewSeriesGranularity): string {
  switch (granularity) {
    case "hour":
      return format(date, "HH:mm", { locale: th });
    case "day":
      return format(date, "d MMM", { locale: th });
    case "week":
      return format(date, "d MMM", { locale: th });
    case "month":
      return format(date, "MMM yy", { locale: th });
  }
}

function generateSlots(from: Date, to: Date, granularity: ViewSeriesGranularity): ViewSeriesPoint[] {
  const rangeEnd = granularity === "hour" ? endOfHour(to) : endOfDay(to);

  const dates = (() => {
    switch (granularity) {
      case "hour":
        return eachHourOfInterval({ start: startOfDay(from), end: rangeEnd });
      case "day":
        return eachDayOfInterval({ start: startOfDay(from), end: endOfDay(to) });
      case "week":
        return eachWeekOfInterval(
          { start: startOfWeek(from, { weekStartsOn: 1 }), end: endOfWeek(to, { weekStartsOn: 1 }) },
          { weekStartsOn: 1 },
        );
      case "month":
        return eachMonthOfInterval({ start: startOfMonth(from), end: endOfMonth(to) });
    }
  })();

  return dates.map((date) => {
    const key = bucketKey(date, granularity);
    return {
      key,
      label: slotLabel(date, granularity),
      views: 0,
      sortAt: date.getTime(),
    };
  });
}

export function buildProjectViewSeries(
  viewedAtList: string[],
  from: Date,
  to: Date,
  granularity: ViewSeriesGranularity,
): ViewSeriesPoint[] {
  const counts = new Map<string, number>();
  for (const ts of viewedAtList) {
    const parsed = new Date(ts);
    if (Number.isNaN(parsed.getTime())) continue;
    const key = bucketKey(parsed, granularity);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const slots = generateSlots(from, to, granularity);
  return slots.map((slot) => ({
    ...slot,
    views: counts.get(slot.key) ?? 0,
  }));
}

export function sumViewSeries(points: ViewSeriesPoint[]): number {
  return points.reduce((sum, point) => sum + point.views, 0);
}

export function averageViewSeries(points: ViewSeriesPoint[]): number {
  if (!points.length) return 0;
  return sumViewSeries(points) / points.length;
}

export function viewSeriesTrendPercent(current: number, previous: number): number | null {
  if (previous === 0) return current > 0 ? 100 : null;
  return ((current - previous) / previous) * 100;
}
