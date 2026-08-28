export type CollectionGridDensity = "large" | "medium" | "small" | "list";

export const COLLECTION_LIST_GRID_STORAGE_KEY = "aplus1.collections.list.grid.density.v2";
export const COLLECTION_ITEMS_GRID_STORAGE_KEY = "aplus1.collections.items.grid.density.v2";

export function readCollectionGridDensity(
  key: string,
  fallback: CollectionGridDensity = "large",
): CollectionGridDensity {
  try {
    const raw = localStorage.getItem(key);
    if (raw === "large" || raw === "medium" || raw === "small" || raw === "list") return raw;
  } catch {
    /* ignore */
  }
  return fallback;
}

export function writeCollectionGridDensity(key: string, density: CollectionGridDensity): void {
  try {
    localStorage.setItem(key, density);
  } catch {
    /* ignore */
  }
}

export function collectionGridClass(density: CollectionGridDensity): string {
  switch (density) {
    case "large":
      return "grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4";
    case "medium":
      return "grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3";
    case "small":
      return "grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2";
    case "list":
      return "flex flex-col gap-2";
  }
}

/** Pinterest-style masonry — mobile 1/2 col, PC small/medium/extra. */
export function collectionMasonryClass(density: CollectionGridDensity): string {
  switch (density) {
    case "large":
      return "columns-1 lg:columns-2 xl:columns-3 gap-2";
    case "medium":
      return "columns-2 lg:columns-3 xl:columns-4 gap-2";
    case "small":
      return "columns-2 lg:columns-4 xl:columns-5 2xl:columns-6 gap-1.5";
    case "list":
      return "flex flex-col gap-2";
  }
}

export function collectionMasonryItemClass(density: CollectionGridDensity): string {
  if (density === "list") return "";
  return density === "small" ? "mb-1.5 break-inside-avoid" : "mb-2 break-inside-avoid";
}
