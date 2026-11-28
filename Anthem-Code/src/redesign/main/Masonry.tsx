import { useLayoutEffect, useRef, useState } from "react";
import { MASONRY_GAP, masonrySpan } from "./bento";
import WorkTile, { type TileWork } from "./WorkTile";

/** Works on a 4-column grid (2 on phones), each spanning rows by its own picture ratio — never cropped (home, tag/tool, similar pages). */
export type MasonryProps = {
  works: TileWork[];
  label: string;
  savedIds: Set<string>;
  onToggleSave: (work: TileWork, button: HTMLElement) => void;
  linkState: unknown;
};

export default function Masonry({ works, label, savedIds, onToggleSave, linkState }: MasonryProps) {
  const ref = useRef<HTMLElement>(null);
  // Card inner width at 1440 is 1168 → four columns of 277; measured again on every resize.
  const [grid, setGrid] = useState({ columns: 4, columnWidth: 277 });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const columns = getComputedStyle(el).gridTemplateColumns.split(" ").filter(Boolean).length || 4;
      const columnWidth = (el.clientWidth - (columns - 1) * MASONRY_GAP) / columns;
      setGrid((g) => (g.columns === columns && Math.abs(g.columnWidth - columnWidth) < 0.5 ? g : { columns, columnWidth }));
    };
    measure();
    if (!("ResizeObserver" in window)) return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <section ref={ref} aria-label={label} className="mn-mas">
      {works.map((w, i) => {
        const span = masonrySpan(w.ratio ?? 1, grid.columnWidth, grid.columns);
        return (
          <div className="mn-cell" key={w.id} style={{ gridColumn: `span ${span.cols}`, gridRow: `span ${span.rows}` }}>
            <WorkTile work={w} saved={savedIds.has(w.id)} onToggleSave={onToggleSave} linkState={linkState} eager={i < 4} />
          </div>
        );
      })}
    </section>
  );
}
