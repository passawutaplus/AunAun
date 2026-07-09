import { BRAND_STORAGE_FEED_AREA_MOBILE, BRAND_STORAGE_FEED_GRID_MOBILE } from "@/lib/brandConfig";

/** Mobile / tablet feed width — 1 or 2 columns only. */
export type FeedMobileColumns = "one" | "two";

export const FEED_MOBILE_COLUMNS_ORDER: FeedMobileColumns[] = ["one", "two"];

export const FEED_MOBILE_COLUMNS_META: Record<
  FeedMobileColumns,
  { label: string; cols: number; ariaLabel: string }
> = {
  one: { label: "1 คอลัมน์", cols: 1, ariaLabel: "1 คอลัมน์" },
  two: { label: "2 คอลัมน์", cols: 2, ariaLabel: "2 คอลัมน์" },
};

export const FEED_GRID_MOBILE_STORAGE_KEY = BRAND_STORAGE_FEED_GRID_MOBILE;
export const FEED_AREA_MOBILE_STORAGE_KEY = BRAND_STORAGE_FEED_AREA_MOBILE;

export const FEED_GRID_MOBILE_EVENT = "aplus1-feed-grid-mobile-change";
export const FEED_AREA_MOBILE_EVENT = "aplus1-feed-area-mobile-change";

export function isFeedMobileColumns(value: string | null | undefined): value is FeedMobileColumns {
  return value === "one" || value === "two";
}

export function readFeedGridMobileColumns(): FeedMobileColumns {
  if (typeof window === "undefined") return "two";
  const stored = localStorage.getItem(FEED_GRID_MOBILE_STORAGE_KEY);
  return isFeedMobileColumns(stored) ? stored : "two";
}

export function writeFeedGridMobileColumns(columns: FeedMobileColumns) {
  localStorage.setItem(FEED_GRID_MOBILE_STORAGE_KEY, columns);
  window.dispatchEvent(new Event(FEED_GRID_MOBILE_EVENT));
}

export function readFeedAreaMobileColumns(): FeedMobileColumns {
  if (typeof window === "undefined") return "two";
  const stored = localStorage.getItem(FEED_AREA_MOBILE_STORAGE_KEY);
  return isFeedMobileColumns(stored) ? stored : "two";
}

export function writeFeedAreaMobileColumns(columns: FeedMobileColumns) {
  localStorage.setItem(FEED_AREA_MOBILE_STORAGE_KEY, columns);
  window.dispatchEvent(new Event(FEED_AREA_MOBILE_EVENT));
}

export function getFeedProjectGridClassMobile(columns: FeedMobileColumns): string {
  return columns === "one" ? "grid grid-cols-1" : "grid grid-cols-2";
}

export function getFeedAreaContainerClassMobile(columns: FeedMobileColumns): string {
  return columns === "one" ? "flex flex-col gap-3 w-full" : "columns-2";
}

export function getFeedAreaItemClassMobile(columns: FeedMobileColumns): string {
  return columns === "one" ? "w-full" : "break-inside-avoid mb-2";
}

export function getFeedAreaGapClassMobile(columns: FeedMobileColumns): string {
  return columns === "two" ? "gap-2" : "";
}
