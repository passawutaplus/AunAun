import { BRAND_STORAGE_FEED_GRID } from "@/lib/brandConfig";
import { FEED_PROJECT_GRID } from "@/lib/feedMasonry";

export type FeedGridDensity = "large" | "medium" | "small";

export const FEED_GRID_DENSITY_ORDER: FeedGridDensity[] = ["large", "medium", "small"];

export const FEED_GRID_DENSITY_META: Record<
  FeedGridDensity,
  { label: string; cols: number; ariaLabel: string }
> = {
  large: { label: "ใหญ่", cols: 3, ariaLabel: "ขนาดใหญ่ 3 คอลัมน์" },
  medium: { label: "กลาง", cols: 5, ariaLabel: "ขนาดกลาง 5 คอลัมน์" },
  small: { label: "เล็ก", cols: 7, ariaLabel: "ขนาดเล็ก 7 คอลัมน์" },
};

export const FEED_GRID_DENSITY_STORAGE_KEY = BRAND_STORAGE_FEED_GRID;

export const FEED_GRID_DENSITY_EVENT = "aplus1-feed-grid-density-change";

export function isFeedGridDensity(value: string | null | undefined): value is FeedGridDensity {
  return value === "large" || value === "medium" || value === "small";
}

export function readFeedGridDensity(): FeedGridDensity {
  if (typeof window === "undefined") return "medium";
  const stored = localStorage.getItem(FEED_GRID_DENSITY_STORAGE_KEY);
  return isFeedGridDensity(stored) ? stored : "medium";
}

export function writeFeedGridDensity(density: FeedGridDensity) {
  localStorage.setItem(FEED_GRID_DENSITY_STORAGE_KEY, density);
  window.dispatchEvent(new Event(FEED_GRID_DENSITY_EVENT));
}

export function getFeedProjectGridClass(density: FeedGridDensity): string {
  switch (density) {
    case "large":
      return "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 2xl:grid-cols-3";
    case "small":
      return "grid grid-cols-2 md:grid-cols-5 lg:grid-cols-6 2xl:grid-cols-7";
    case "medium":
    default:
      return FEED_PROJECT_GRID;
  }
}
