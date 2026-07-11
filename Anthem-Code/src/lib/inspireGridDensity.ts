export type InspireGridDensity = "large" | "medium" | "small" | "list";

export const INSPIRE_BOARDS_GRID_STORAGE_KEY = "aplus1.inspire.boards.grid.density";
export const INSPIRE_ITEMS_GRID_STORAGE_KEY = "aplus1.inspire.items.grid.density";
export const INSPIRE_LIBRARY_GRID_STORAGE_KEY = "aplus1.inspire.library.grid.density";

export function readInspireGridDensity(
  key: string,
  fallback: InspireGridDensity = "medium",
): InspireGridDensity {
  try {
    const raw = localStorage.getItem(key);
    if (raw === "large" || raw === "medium" || raw === "small" || raw === "list") return raw;
  } catch {
    /* ignore */
  }
  return fallback;
}

export function writeInspireGridDensity(key: string, density: InspireGridDensity): void {
  try {
    localStorage.setItem(key, density);
  } catch {
    /* ignore */
  }
}

export function inspireGridClass(density: InspireGridDensity): string {
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

/** Thumbnail strip on board detail — denser defaults. */
export function inspireThumbGridClass(density: InspireGridDensity): string {
  switch (density) {
    case "large":
      return "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3";
    case "medium":
      return "grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 sm:gap-3";
    case "small":
      return "grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-1.5 sm:gap-2";
    case "list":
      return "flex flex-col gap-2";
  }
}

/** Inspire Library home — masonry columns + list. */
export function inspireLibraryGridClass(density: InspireGridDensity): string {
  switch (density) {
    case "large":
      return "columns-1 sm:columns-2 xl:columns-3 gap-4";
    case "medium":
      return "columns-2 md:columns-3 xl:columns-4 gap-3";
    case "small":
      return "columns-2 sm:columns-3 md:columns-4 xl:columns-5 2xl:columns-6 gap-2";
    case "list":
      return "flex flex-col gap-2";
  }
}
