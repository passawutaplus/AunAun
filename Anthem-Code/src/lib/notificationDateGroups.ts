import { format, isToday, isYesterday, startOfDay, subDays } from "date-fns";
import { th } from "date-fns/locale";

export type DateGroupKey = "today" | "yesterday" | "week" | "older";

export function notificationDateGroup(iso: string, now = new Date()): DateGroupKey {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "older";
  if (isToday(d)) return "today";
  if (isYesterday(d)) return "yesterday";
  const weekStart = startOfDay(subDays(now, 7));
  if (d >= weekStart) return "week";
  return "older";
}

export function notificationDateGroupLabel(key: DateGroupKey): string {
  switch (key) {
    case "today":
      return "วันนี้";
    case "yesterday":
      return "เมื่อวาน";
    case "week":
      return "สัปดาห์นี้";
    default:
      return "เก่ากว่า";
  }
}

/** Group items by date bucket preserving original order within each group. */
export function groupByNotificationDate<T extends { created_at: string }>(
  items: T[],
): { key: DateGroupKey; label: string; items: T[] }[] {
  const order: DateGroupKey[] = ["today", "yesterday", "week", "older"];
  const buckets = new Map<DateGroupKey, T[]>();
  for (const key of order) buckets.set(key, []);
  for (const item of items) {
    const key = notificationDateGroup(item.created_at);
    buckets.get(key)!.push(item);
  }
  return order
    .map((key) => ({
      key,
      label: notificationDateGroupLabel(key),
      items: buckets.get(key) ?? [],
    }))
    .filter((g) => g.items.length > 0);
}

export function formatNotificationDay(iso: string): string {
  const d = new Date(iso);
  if (isToday(d)) return "วันนี้";
  if (isYesterday(d)) return "เมื่อวาน";
  return format(d, "d MMM yyyy", { locale: th });
}
