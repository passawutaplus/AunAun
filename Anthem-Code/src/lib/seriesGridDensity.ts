export type SeriesWorksDensity = "large" | "medium" | "small" | "list";

export const SERIES_GRID_DENSITY_STORAGE_KEY = "aplus1.series.grid.density";
export const SERIES_ITEMS_GRID_STORAGE_KEY = "aplus1.series.items.grid.density";
/** @deprecated use SERIES_GRID_DENSITY_STORAGE_KEY */
export const SERIES_WORKS_DENSITY_STORAGE_KEY = SERIES_GRID_DENSITY_STORAGE_KEY;
/** @deprecated use SERIES_GRID_DENSITY_STORAGE_KEY */
export const SERIES_FOLDERS_DENSITY_STORAGE_KEY = SERIES_GRID_DENSITY_STORAGE_KEY;

export function readSeriesDensity(
  key: string,
  fallback: SeriesWorksDensity = "medium",
): SeriesWorksDensity {
  try {
    const raw = localStorage.getItem(key);
    if (raw === "large" || raw === "medium" || raw === "small" || raw === "list") return raw;
  } catch {
    /* ignore */
  }
  return fallback;
}

export function writeSeriesDensity(key: string, density: SeriesWorksDensity): void {
  try {
    localStorage.setItem(key, density);
  } catch {
    /* ignore */
  }
}

export function seriesDensityGridClass(density: SeriesWorksDensity): string {
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
