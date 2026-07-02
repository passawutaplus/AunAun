import type { FeedFilter, SpecialFilter } from "@/data/projectTypes";

export type FeedModeOption = "Explore" | SpecialFilter;

export const FEED_MODE_ORDER: FeedModeOption[] = [
  "Explore",
  "Following",
  "Newest",
  "Top 1",
  "Collections",
];

/** Display labels (Thai) — internal values stay English for DB/query compat. */
export const FEED_MODE_LABELS: Record<FeedModeOption, string> = {
  Explore: "สำรวจ",
  Following: "กำลังติดตาม",
  Newest: "ล่าสุด",
  "Top 1": "Most +1",
  Collections: "คอลเลกชัน",
};

export const feedModeLabel = (mode: FeedFilter): string =>
  FEED_MODE_LABELS[mode as FeedModeOption] ?? mode;
