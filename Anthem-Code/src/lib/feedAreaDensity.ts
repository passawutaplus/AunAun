import { BRAND_STORAGE_FEED_AREA } from "@/lib/brandConfig";
import { FEED_AREA_MASONRY_SIDEBAR_COLUMNS, FEED_MASONRY_GAP } from "@/lib/feedMasonry";

export type FeedAreaLayout = "feed" | "grid";

export const FEED_AREA_LAYOUT_ORDER: FeedAreaLayout[] = ["feed", "grid"];

export const FEED_AREA_LAYOUT_META: Record<
  FeedAreaLayout,
  { label: string; ariaLabel: string; cols: number }
> = {
  feed: { label: "ฟีด", cols: 1, ariaLabel: "โพสต์ 1 คอลัมน์ แบบฟีด" },
  grid: { label: "กริด", cols: 3, ariaLabel: "โพสต์ 3 คอลัมน์ แบบกริด" },
};

export const FEED_AREA_LAYOUT_STORAGE_KEY = BRAND_STORAGE_FEED_AREA;

export const FEED_AREA_LAYOUT_EVENT = "aplus1-feed-area-layout-change";

export function isFeedAreaLayout(value: string | null | undefined): value is FeedAreaLayout {
  return value === "feed" || value === "grid";
}

export function readFeedAreaLayout(): FeedAreaLayout {
  if (typeof window === "undefined") return "grid";
  const stored = localStorage.getItem(FEED_AREA_LAYOUT_STORAGE_KEY);
  return isFeedAreaLayout(stored) ? stored : "grid";
}

export function writeFeedAreaLayout(layout: FeedAreaLayout) {
  localStorage.setItem(FEED_AREA_LAYOUT_STORAGE_KEY, layout);
  window.dispatchEvent(new Event(FEED_AREA_LAYOUT_EVENT));
}

/** Container class for community / Area feed. */
export function getFeedAreaContainerClass(layout: FeedAreaLayout): string {
  switch (layout) {
    case "feed":
      return "flex flex-col gap-3 sm:gap-4 w-full max-w-lg mx-auto";
    case "grid":
    default:
      return FEED_AREA_MASONRY_SIDEBAR_COLUMNS;
  }
}

/** Per-post wrapper inside Area feed. */
export function getFeedAreaItemClass(layout: FeedAreaLayout): string {
  switch (layout) {
    case "feed":
      return "w-full";
    case "grid":
    default:
      return "break-inside-avoid mb-2 sm:mb-3";
  }
}

export function getFeedAreaGapClass(layout: FeedAreaLayout): string {
  return layout === "grid" ? FEED_MASONRY_GAP : "";
}
