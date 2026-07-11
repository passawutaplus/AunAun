export type CollectionGridDensity = "large" | "medium" | "small" | "list";

export const COLLECTION_LIST_GRID_STORAGE_KEY = "aplus1.collections.list.grid.density";
export const COLLECTION_ITEMS_GRID_STORAGE_KEY = "aplus1.collections.items.grid.density";

export function readCollectionGridDensity(
  key: string,
  fallback: CollectionGridDensity = "medium",
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
      return "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4";
    case "medium":
      return "grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3";
    case "small":
      return "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2";
    case "list":
      return "flex flex-col gap-2";
  }
}
