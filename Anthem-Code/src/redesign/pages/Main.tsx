import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useProfilesByIds } from "@/core/profiles/useProfilesByIds";
import { releaseBoot } from "@/lib/bootGate";
import { SC_CATEGORIES, isScCategory } from "../lib/categories";
import { SC_LINKS } from "../routes";
import { useShellPanels } from "../shell/panels";
import { BENTO_FIRST, BENTO_STEP, MASONRY_GAP, bentoBlocks, masonrySpan } from "../main/bento";
import Creators from "../main/Creators";
import Events from "../main/Events";
import ScLoader from "../main/ScLoader";
import { EVENT_TYPES, EVENT_VIEWS, EVENT_VIEW_LABEL, isEventType, type EventView } from "../main/useHomeEvents";
import { CREATOR_VIEWS, type CreatorView } from "../main/useCreators";
import WorkTile, { type TileWork } from "../main/WorkTile";
import { SHOWCASE_VIEWS, VIEW_NEEDS_LOGIN, useShowcaseWorks, type ShowcaseView } from "../main/useShowcaseWorks";
import { useWorkSaves } from "../main/useWorkSaves";
import "../styles/main.css";

const MODES = [
  ["showcase", "Showcase"],
  ["creators", "Creators"],
  ["event", "Event"],
] as const;
type Mode = (typeof MODES)[number][0];

const MODE_LABEL: Record<Mode, string> = { showcase: "ผลงาน", creators: "ครีเอเตอร์", event: "อีเว้นท์" };

const AddIcon = () => (
  <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#282929" strokeWidth="1.33">
    <path d="M12 5v14M5 12h14" />
  </svg>
);

/**
 * Home (mock: pages/Main.dc.html). State lives in the URL: `?tab=creators|event`, `?view=following|latest|collections`, `?cat=<CATEGORY>`.
 * This step has the Showcase tab; Creators / Event and the search panels follow.
 */
export default function Main() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const panels = useShellPanels();
  const tab = params.get("tab");
  const mode: Mode = tab === "creators" || tab === "event" ? tab : "showcase";
  const catParam = params.get("cat");
  const category = isScCategory(catParam) ? catParam : null;

  const typeParam = params.get("type");
  const evType = isEventType(typeParam) ? typeParam : null;

  const set = (key: "tab" | "cat" | "view" | "type", value: string | null) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { preventScrollReset: true });
  };

  // The view names differ per tab, so changing tab drops ?view (the category stays).
  const pickMode = (m: Mode) => {
    const next = new URLSearchParams(params);
    if (m === "showcase") next.delete("tab");
    else next.set("tab", m);
    next.delete("view");
    if (m !== "event") next.delete("type");
    setParams(next, { preventScrollReset: true });
  };

  const { user, loading: authLoading } = useAuth();
  const signedOut = !user && !authLoading;
  const viewParam = params.get("view");
  const wanted: ShowcaseView = (SHOWCASE_VIEWS as readonly string[]).includes(viewParam ?? "") ? (viewParam as ShowcaseView) : "explore";
  // Following and Collections belong to a signed-in person; a signed-out visitor gets Explore.
  const view: ShowcaseView = VIEW_NEEDS_LOGIN[wanted] && signedOut ? "explore" : wanted;
  const pickView = (v: ShowcaseView) => {
    if (VIEW_NEEDS_LOGIN[v] && !user) navigate(SC_LINKS.login);
    else set("view", v === "explore" ? null : v);
  };
  const crWanted: CreatorView = (CREATOR_VIEWS as readonly string[]).includes(viewParam ?? "") ? (viewParam as CreatorView) : "discover";
  const crView: CreatorView = crWanted === "following" && signedOut ? "discover" : crWanted;
  const pickCrView = (v: CreatorView) => {
    if (v === "following" && !user) navigate(SC_LINKS.login);
    else set("view", v === "discover" ? null : v);
  };
  const evView: EventView = (EVENT_VIEWS as readonly string[]).includes(viewParam ?? "") ? (viewParam as EventView) : "now";
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
          <button
            type="button"
            aria-label="ค้นหา"
            aria-haspopup="dialog"
            className="mn-tool"
            onClick={(e) => panels.openSearch(e.currentTarget, "main")}
          >
            <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#282929" strokeWidth="1.33">
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" />
            </svg>
          </button>
        </div>
        <div role="group" aria-label="เลือกมุมมอง" className="mn-modes">
          {MODES.map(([key, label]) => (
            <button key={key} type="button" className="mn-mode" aria-pressed={mode === key} onClick={() => pickMode(key)}>
              {label}
            </button>
          ))}
        </div>
        {user ? (
          <button type="button" aria-label="ลงงาน" aria-haspopup="dialog" className="mn-add" onClick={(e) => panels.openNew(e.currentTarget)}>
            <AddIcon />
          </button>
        ) : (
          <Link to={SC_LINKS.login} aria-label="ลงงาน" className="mn-add">
            <AddIcon />
          </Link>
        )}
      </div>

      {mode === "showcase" || mode === "creators" ? (
        <div className="mn-fld">
          {mode === "showcase" ? (
            <ViewMenu label="มุมมองผลงาน" options={SHOWCASE_VIEWS} labels={VIEW_LABEL} value={view} onPick={pickView} />
          ) : (
            <ViewMenu label="มุมมองครีเอเตอร์" options={CREATOR_VIEWS} labels={CREATOR_VIEW_LABEL} value={crView} onPick={pickCrView} />
          )}
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
      ) : (
        <div className="mn-fld">
          <ViewMenu label="ช่วงเวลา" options={EVENT_VIEWS} labels={EVENT_VIEW_LABEL} value={evView} onPick={(v) => set("view", v === "now" ? null : v)} />
          <span aria-hidden="true" className="mn-fld-rule" />
          <div className="mn-chips" role="group" aria-label="ประเภทอีเว้นท์">
            <button type="button" className="mn-chip" aria-pressed={!evType} onClick={() => set("type", null)}>
              All
            </button>
            {EVENT_TYPES.map(([key, label]) => (
              <button key={key} type="button" className="mn-chip" aria-pressed={evType === key} onClick={() => set("type", key)}>
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mn-card">
        <h1 className="sc-sr">Samecor — ผลงานล่าสุด</h1>
        {mode === "showcase" ? (
          <Showcase key={`${view}:${category ?? "all"}`} view={view} category={category} label={MODE_LABEL[mode]} savedIds={saves.ids} onToggleSave={toggleSave} />
        ) : mode === "creators" ? (
          <Creators view={crView} category={category} />
        ) : (
          <Events view={evView} type={evType} />
        )}
      </div>
    </main>
  );
}

const VIEW_LABEL: Record<ShowcaseView, string> = { explore: "Explore", following: "Following", latest: "Latest", collections: "Collections" };
const CREATOR_VIEW_LABEL: Record<CreatorView, string> = { discover: "Discover", new: "New", following: "Following" };

type ViewMenuProps<V extends string> = {
  /** Accessible name of the menu. */
  label: string;
  options: readonly V[];
  labels: Record<V, string>;
  value: V;
  onPick: (v: V) => void;
};

/** Order of the grid. "Samecor Picks" of the mock stays hidden until the Picker community feeds it. */
function ViewMenu<V extends string>({ label, options, labels, value, onPick }: ViewMenuProps<V>) {
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
        {labels[value]}
      </button>
      {open ? (
        <div role="menu" aria-label={label} className="mn-view-menu">
          {options.map((v) => (
            <button
              key={v}
              type="button"
              role="menuitemradio"
              aria-checked={v === value}
              className="mn-view-opt"
              onClick={() => {
                setOpen(false);
                onPick(v);
              }}
            >
              <span>{labels[v]}</span>
              {v === value ? (
                <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#282929" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12.5l4.5 4.5L19 7.5" />
                </svg>
              ) : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

type ShowcaseProps = {
  view: ShowcaseView;
  category: (typeof SC_CATEGORIES)[number] | null;
  label: string;
  savedIds: Set<string>;
  onToggleSave: (id: string) => void;
};

function Showcase({ view, category, label, savedIds, onToggleSave }: ShowcaseProps) {
  const { data: rows, isPending, isError, hasNextPage, isFetchingNextPage, fetchNextPage } = useShowcaseWorks(view, category);
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
