import type { FeedFilter, SpecialFilter } from "@/data/projectTypes";

export type FeedModeOption = "Explore" | SpecialFilter;

export const FEED_MODE_ORDER: FeedModeOption[] = [
  "Explore",
  "Following",
  "Newest",
  "Top 1",
  "Collections",
];

/** Display labels — internal values stay English for DB/query compat. */
export const FEED_MODE_LABELS: Record<FeedModeOption, string> = {
  Explore: "Explore",
  Following: "Following",
  Newest: "Latest",
  "Top 1": "Top 1",
  Collections: "Collections",
};

export const feedModeLabel = (mode: FeedFilter): string =>
  FEED_MODE_LABELS[mode as FeedModeOption] ?? mode;
