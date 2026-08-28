export type InspireGridDensity = "large" | "medium" | "small" | "list";

export const INSPIRE_BOARDS_GRID_STORAGE_KEY = "aplus1.inspire.boards.grid.density";
export const INSPIRE_ITEMS_GRID_STORAGE_KEY = "aplus1.inspire.items.grid.density.v2";
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
      return "grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4";
    case "medium":
      return "grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3";
    case "small":
      return "grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2";
    case "list":
      return "flex flex-col gap-2";
  }
}

/** Thumbnail strip on board detail — mobile 1/2 col, PC small/medium/extra. */
export function inspireThumbGridClass(density: InspireGridDensity): string {
  switch (density) {
    case "large":
      return "grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-3";
    case "medium":
      return "grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-2 sm:gap-3";
    case "small":
      return "grid grid-cols-2 lg:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-10 gap-1.5 sm:gap-2";
    case "list":
      return "flex flex-col gap-2";
  }
}

/** Inspire Library home — masonry columns + list. */
export function inspireLibraryGridClass(density: InspireGridDensity): string {
  switch (density) {
    case "large":
      return "columns-1 lg:columns-2 xl:columns-3 gap-4";
    case "medium":
      return "columns-2 lg:columns-3 xl:columns-4 gap-3";
    case "small":
      return "columns-2 lg:columns-4 xl:columns-5 2xl:columns-6 gap-2";
    case "list":
      return "flex flex-col gap-2";
  }
}
