import type { CollectionItemsSortMode } from "@/components/collections/CollectionBrowseToolbar";

export type SortableCollectionItem = {
  title?: string | null;
  likes?: number | null;
  views?: number | null;
  created_at?: string | null;
  /** When the work was saved into the collection. */
  added_at?: string | null;
  /** The owner's manual order; null for works saved after the last reorder. */
  position?: number | null;
};

/** Newest/oldest follow the save order (added_at); the work's own created_at is only a fallback. */
function savedAt(item: SortableCollectionItem): number {
  const n = Date.parse(item.added_at ?? item.created_at ?? "");
  return Number.isNaN(n) ? 0 : n;
}

export function sortCollectionItems<T extends SortableCollectionItem>(
  list: readonly T[],
  mode: CollectionItemsSortMode,
): T[] {
  const next = [...list];
  switch (mode) {
    case "manual":
      // Works saved since the last reorder (no position) come first, newest save on top.
      return next.sort(
        (a, b) => (a.position ?? -1) - (b.position ?? -1) || savedAt(b) - savedAt(a),
      );
    case "oldest":
      return next.sort((a, b) => savedAt(a) - savedAt(b));
    case "likes":
      return next.sort((a, b) => (b.likes ?? 0) - (a.likes ?? 0));
    case "views":
      return next.sort((a, b) => (b.views ?? 0) - (a.views ?? 0));
    case "newest":
    default:
      return next.sort((a, b) => savedAt(b) - savedAt(a));
  }
}
