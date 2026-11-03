import type { FeedItem } from "@/lib/interleaveAds";

export type HouseFeedItem<T> = FeedItem<T> | { kind: "house"; key: string };

/**
 * Insert one house ad after ~`afterRows` of feed cards, then a random
 * column on the next row. Skips short feeds so the grid does not fill up.
 */
export function insertHouseAd<T>(
  items: FeedItem<T>[],
  opts: { columns: number; afterRows?: number; columnOffset: number },
): HouseFeedItem<T>[] {
  const cols = Math.max(1, opts.columns);
  const afterRows = opts.afterRows ?? 4;
  const afterIndex = afterRows * cols;
  if (items.length < afterIndex) return items;

  const maxOffset = Math.min(cols - 1, Math.max(0, items.length - afterIndex));
  const raw = ((opts.columnOffset % cols) + cols) % cols;
  const offset = Math.min(raw, maxOffset);
  const insertAt = afterIndex + offset;

  return [
    ...items.slice(0, insertAt),
    { kind: "house", key: "house-advertise" },
    ...items.slice(insertAt),
  ];
}
