import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useProfilesByIds } from "@/core/profiles/useProfilesByIds";
import { releaseBoot } from "@/lib/bootGate";
import { SC_CATEGORIES, isScCategory } from "../lib/categories";
import { SC_LINKS } from "../routes";
import { BENTO_FIRST, BENTO_STEP, MASONRY_GAP, bentoBlocks, masonrySpan } from "../main/bento";
import ScLoader from "../main/ScLoader";
import WorkTile, { type TileWork } from "../main/WorkTile";
import { useShowcaseWorks } from "../main/useShowcaseWorks";
import { useWorkSaves } from "../main/useWorkSaves";
import "../styles/main.css";

const MODES = [
  ["showcase", "Showcase"],
  ["creators", "Creators"],
  ["event", "Event"],
] as const;
type Mode = (typeof MODES)[number][0];

const MODE_LABEL: Record<Mode, string> = { showcase: "ผลงาน", creators: "ครีเอเตอร์", event: "อีเว้นท์" };

/**
 * Home (mock: pages/Main.dc.html). State lives in the URL: `?tab=creators|event`, `?cat=<CATEGORY>`.
 * This step has the Showcase tab; Creators / Event and the search panels follow.
 */
export default function Main() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const tab = params.get("tab");
  const mode: Mode = tab === "creators" || tab === "event" ? tab : "showcase";
  const catParam = params.get("cat");
  const category = isScCategory(catParam) ? catParam : null;

  const set = (key: "tab" | "cat", value: string | null) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { preventScrollReset: true });
  };

  const { user } = useAuth();
  const saves = useWorkSaves();
  const toggleSave = useCallback(
    (id: string) => {
      if (!saves.signedIn) navigate(SC_LINKS.login);
      else saves.toggle(id);
    },
    [saves, navigate],
  );

  // The start-up brand screen waits for the first feed on "/"; the other tabs have nothing to wait for.
  useEffect(() => {
    if (mode !== "showcase") releaseBoot();
  }, [mode]);

  return (
    <main className="sc-main mn">
      <div className="mn-row">
        <div className="mn-tools">
          {/* Colour search and the search panel come with step 3c; until then search opens the old page. */}
          <Link to={SC_LINKS.search} aria-label="ค้นหา" className="mn-tool">
            <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#282929" strokeWidth="1.33">
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" />
            </svg>
          </Link>
        </div>
        <div role="group" aria-label="เลือกมุมมอง" className="mn-modes">
          {MODES.map(([key, label]) => (
            <button key={key} type="button" className="mn-mode" aria-pressed={mode === key} onClick={() => set("tab", key === "showcase" ? null : key)}>
              {label}
            </button>
          ))}
        </div>
        <Link to={user ? SC_LINKS.upload : SC_LINKS.login} aria-label="ลงงาน" className="mn-add">
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#282929" strokeWidth="1.33">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </Link>
      </div>

      {mode === "showcase" ? (
        <div className="mn-fld">
          <ViewMenu />
          <span aria-hidden="true" className="mn-fld-rule" />
          <div className="mn-chips" role="group" aria-label="หมวดงาน">
            {(["All", ...SC_CATEGORIES] as const).map((f) => (
              <button
                key={f}
                type="button"
                className="mn-chip"
                aria-pressed={f === "All" ? !category : category === f}
                onClick={() => set("cat", f === "All" ? null : f)}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mn-card">
        <h1 className="sc-sr">Samecor — ผลงานล่าสุด</h1>
        {mode === "showcase" ? (
          <Showcase key={category ?? "all"} category={category} label={MODE_LABEL[mode]} savedIds={saves.ids} onToggleSave={toggleSave} />
        ) : null}
      </div>
    </main>
  );
}

/** "Explore" is the only order with real data so far; the other views of the mock stay hidden until they have one. */
function ViewMenu() {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="mn-view-wrap" ref={wrapRef}>
      <button type="button" className="mn-view" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        Explore
      </button>
      {open ? (
        <div role="menu" aria-label="มุมมองผลงาน" className="mn-view-menu">
          <button type="button" role="menuitemradio" aria-checked="true" className="mn-view-opt" onClick={() => setOpen(false)}>
            <span>Explore</span>
            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#282929" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12.5l4.5 4.5L19 7.5" />
            </svg>
          </button>
        </div>
      ) : null}
    </div>
  );
}

type ShowcaseProps = {
  category: (typeof SC_CATEGORIES)[number] | null;
  label: string;
  savedIds: Set<string>;
  onToggleSave: (id: string) => void;
};

function Showcase({ category, label, savedIds, onToggleSave }: ShowcaseProps) {
  const { data: rows, isPending, isError, hasNextPage, isFetchingNextPage, fetchNextPage } = useShowcaseWorks(category);
  const owners = useMemo(() => [...new Set((rows ?? []).map((r) => r.owner_id).filter((id): id is string => !!id))], [rows]);
  const { data: profiles } = useProfilesByIds(owners);

  const works = useMemo<TileWork[]>(
    () =>
      (rows ?? []).flatMap((r) => {
        const cover = r.cover_url || r.gallery_urls?.[0] || "";
        if (!cover) return [];
        const who = r.owner_id ? profiles?.map[r.owner_id] : undefined;
        const artist = who?.display_name?.trim() || who?.username || "";
        return [{
          id: r.id,
          title: r.title?.trim() || "",
          artist,
          sub: [r.sc_category, artist].filter(Boolean).join(" · "),
          cover,
          ratio: r.cover_width && r.cover_height ? r.cover_width / r.cover_height : null,
        }];
      }),
    [rows, profiles],
  );

  // Bento shows 14, then 17 more per step, so blocks already on screen never move.
  const [shown, setShown] = useState(BENTO_FIRST);
  const visible = useMemo(() => (category ? works : works.slice(0, shown)), [category, works, shown]);
  const moreLoaded = !category && shown < works.length;
  const moreLeft = moreLoaded || !!hasNextPage;

  const [atEnd, setAtEnd] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = moreRef.current;
    if (!el || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver((entries) => setAtEnd(entries[entries.length - 1].isIntersecting), { rootMargin: "0px 0px 120px 0px" });
    io.observe(el);
    return () => io.disconnect();
    // observed again after every step: a fresh observer reports even when the loader never left the screen
  }, [moreLeft, isPending, shown, works.length]);

  useEffect(() => {
    if (!atEnd) return;
    if (moreLoaded) {
      setAtEnd(false);
      setShown((n) => n + BENTO_STEP);
    } else if (hasNextPage && !isFetchingNextPage) {
      setAtEnd(false);
      void fetchNextPage();
    }
  }, [atEnd, moreLoaded, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const blocks = useMemo(() => (category ? [] : bentoBlocks(visible, (w) => w.ratio ?? 1)), [category, visible]);

  useEffect(() => {
    if (!isPending) releaseBoot();
  }, [isPending]);

  if (isPending) return <ScLoader label="กำลังโหลดผลงานเพิ่ม" />;
  if (isError) return null;
  if (!works.length) return <p className="mn-none">ไม่เจอสิ่งที่ตรงกัน</p>;

  return (
    <>
      {category ? (
        <Masonry works={visible} label={label} savedIds={savedIds} onToggleSave={onToggleSave} />
      ) : (
        <section aria-label={label} className="mn-bento">
          {blocks.map((block, b) => (
            <div className="mn-bk" key={b}>
              {block.cols.map((col, c) => (
                <div className="mn-bcol" key={c} style={{ width: col.width }}>
                  {col.cells.map((cell) => (
                    <WorkTile
                      key={cell.item.id}
                      work={cell.item}
                      saved={savedIds.has(cell.item.id)}
                      onToggleSave={onToggleSave}
                      isNew={cell.isNew}
                      delay={col.delay}
                      eager={b === 0}
                    />
                  ))}
                </div>
              ))}
            </div>
          ))}
        </section>
      )}
      {moreLeft ? (
        <div ref={moreRef}>
          <ScLoader label="กำลังโหลดผลงานเพิ่ม" />
        </div>
      ) : null}
    </>
  );
}

function Masonry({ works, label, savedIds, onToggleSave }: { works: TileWork[]; label: string; savedIds: Set<string>; onToggleSave: (id: string) => void }) {
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
            <WorkTile work={w} saved={savedIds.has(w.id)} onToggleSave={onToggleSave} eager={i < 4} />
          </div>
        );
      })}
    </section>
  );
}
