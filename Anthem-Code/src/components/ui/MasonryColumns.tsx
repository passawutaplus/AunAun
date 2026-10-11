import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { CollectionGridDensity } from "@/lib/collectionGridDensity";

type GridDensity = Exclude<CollectionGridDensity, "list">;

/** Same column counts as `collectionMasonryClass`, keyed by Tailwind min-widths. */
const COLUMNS: Record<GridDensity, { base: number; lg: number; xl: number; xxl: number }> = {
  large: { base: 1, lg: 2, xl: 3, xxl: 3 },
  medium: { base: 2, lg: 3, xl: 4, xxl: 4 },
  small: { base: 2, lg: 4, xl: 5, xxl: 6 },
};

function columnCount(density: GridDensity): number {
  const c = COLUMNS[density];
  if (typeof window === "undefined" || !window.matchMedia) return c.base;
  if (window.matchMedia("(min-width: 1536px)").matches) return c.xxl;
  if (window.matchMedia("(min-width: 1280px)").matches) return c.xl;
  if (window.matchMedia("(min-width: 1024px)").matches) return c.lg;
  return c.base;
}

function useColumnCount(density: GridDensity): number {
  const [count, setCount] = useState(() => columnCount(density));
  useEffect(() => {
    const update = () => setCount(columnCount(density));
    update();
    const queries = ["(min-width: 1024px)", "(min-width: 1280px)", "(min-width: 1536px)"].map((q) =>
      window.matchMedia(q),
    );
    queries.forEach((m) => m.addEventListener("change", update));
    return () => queries.forEach((m) => m.removeEventListener("change", update));
  }, [density]);
  return count;
}

type Props<T> = {
  items: T[];
  density: CollectionGridDensity;
  getKey: (item: T) => string;
  renderItem: (item: T) => ReactNode;
};

/**
 * Masonry that keeps reading order left-to-right: item 1 top of column 1,
 * item 2 top of column 2, … (CSS `columns` fills column 1 downwards first,
 * which makes "newest first" look scrambled).
 */
export default function MasonryColumns<T>({ items, density, getKey, renderItem }: Props<T>) {
  const grid: GridDensity = density === "list" ? "large" : density;
  const count = useColumnCount(grid);
  const columns = useMemo(() => {
    const n = density === "list" ? 1 : count;
    const cols: T[][] = Array.from({ length: n }, () => []);
    items.forEach((item, i) => cols[i % n].push(item));
    return cols;
  }, [items, density, count]);
  // Same breathing room as the home feed grid.
  const gap = "gap-4 sm:gap-5";

  return (
    <div className={`flex items-start ${gap}`}>
      {columns.map((col, i) => (
        <div key={i} className={`flex min-w-0 flex-1 flex-col ${gap}`}>
          {col.map((item) => (
            <div key={getKey(item)} className="min-w-0">
              {renderItem(item)}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
