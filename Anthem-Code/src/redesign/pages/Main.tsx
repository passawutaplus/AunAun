import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useProfilesByIds } from "@/core/profiles/useProfilesByIds";
import { releaseBoot } from "@/lib/bootGate";
import { COLOR_MATCH_MIN, parseColorList } from "@/lib/colorSearch";
import { useCoverColorScores } from "@/hooks/useCoverColorScores";
import { SC_CATEGORIES, isScCategory } from "../lib/categories";
import { SC_LINKS } from "../routes";
import { useShellPanels } from "../shell/panels";
import LoadError from "../shell/LoadError";
import { loginHref } from "../lib/loginHref";
import { seedSiteSearch } from "../lib/useSiteSearch";
import { usePageSeo, type PageSeo } from "../lib/usePageSeo";
import { absoluteUrl } from "@/lib/seo";
import { BENTO_FIRST, BENTO_STEP, bentoBlocks } from "../main/bento";
import ColorSearch from "../main/ColorSearch";
import Creators from "../main/Creators";
import Events from "../main/Events";
import EmptyNote from "../main/EmptyNote";
import { FIND_PARAM } from "../main/homeFind";
import ScLoader from "../main/ScLoader";
import { EVENT_TYPES, EVENT_VIEWS, EVENT_VIEW_LABEL, isEventType, type EventView } from "../main/useHomeEvents";
import { CREATOR_VIEWS, type CreatorView } from "../main/useCreators";
import WorkTile, { type TileWork } from "../main/WorkTile";
import Masonry from "../main/Masonry";
import { SHOWCASE_VIEWS, VIEW_NEEDS_LOGIN, useShowcaseWorks, type ShowcaseView } from "../main/useShowcaseWorks";
import { useSaveFlow } from "../main/useSaveFlow";
import { createPortal } from "react-dom";
import { usePresence } from "../lib/usePresence";
import { useAppHeaderSlot } from "../shell/appHeaderSlot";
import AppHomeBar, { AppActiveFilters, type ActiveFilter } from "../main/AppHomeBar";
import AppSearch, { type AppFilterRow } from "../main/AppSearch";
import "../styles/main.css";

const MODES = [
  ["showcase", "Showcase"],
  ["creators", "Creators"],
  ["event", "Event"],
] as const;
type Mode = (typeof MODES)[number][0];

const MODE_LABEL: Record<Mode, string> = { showcase: "ผลงาน", creators: "ครีเอเตอร์", event: "อีเว้นท์" };

/** Old home links: `?mode=creators` (`designers` before the rename), `?mode=event(s)`; other modes were cut → Showcase. */
const OLD_MODE_TAB: Record<string, "creators" | "event"> = { creators: "creators", designers: "creators", event: "event", events: "event" };

/** The home page's tags; the search box of Google (SearchAction) opens `/?q=`, like api/seo-preview.js. */
const homeSeo = (mode: Mode): PageSeo =>
  mode === "showcase"
    ? {
        path: "/",
        jsonLd: [
          { "@type": "Organization", name: "SAMECOR", url: absoluteUrl("/"), logo: absoluteUrl("/icons/icon-512.png"), email: "support@samecor.com" },
          {
            "@type": "WebSite",
            name: "SAMECOR",
            url: absoluteUrl("/"),
            inLanguage: ["th", "en"],
            potentialAction: { "@type": "SearchAction", target: `${absoluteUrl("/")}?q={search_term_string}`, "query-input": "required name=search_term_string" },
          },
        ],
      }
    : mode === "creators"
      ? { title: "Creators", description: "ครีเอเตอร์ไทยบน SAMECOR ดูผลงาน ติดตาม แล้วทักทายกันได้เลย", path: "/" }
      : { title: "Events", description: "นิทรรศการ เวิร์กช็อป ทอล์ก และ Open Call สายสร้างสรรค์ บน SAMECOR", path: "/" };

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
  // Store apps (owner 2026-11-28): search + mode switch sit in the header; search opens a full-screen search.
  const appSlot = useAppHeaderSlot();
  const appSearch = usePresence(260);
  const appSearchBtn = useRef<HTMLButtonElement | null>(null);
  const oldMode = params.get("mode");
  const tab = params.get("tab") ?? (oldMode ? OLD_MODE_TAB[oldMode.toLowerCase()] : null);
  const mode: Mode = tab === "creators" || tab === "event" ? tab : "showcase";
  usePageSeo(homeSeo(mode));
  const catParam = params.get("cat");
  const category = isScCategory(catParam) ? catParam : null;
  // The text filter of Showcase / Creators (`?find=`), sent by the app's search screen.
  const find = mode === "event" ? "" : params.get(FIND_PARAM)?.trim() ?? "";

  const typeParam = params.get("type");
  const evType = isEventType(typeParam) ? typeParam : null;

  // Colour search: `?color=2e4a6b,c8553d` (Showcase only).
  const colorParam = params.get("color");
  const colors = useMemo(() => parseColorList(colorParam), [colorParam]);

  // The chosen category is a folder tab joined to the card. Over the card's rounded top corner the
  // tab would float above a gap (owner 2026-11-28), so that corner turns square while the tab is there.
  const cardRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const card = cardRef.current;
    const chips = card?.parentElement?.querySelector<HTMLElement>(".mn-chips");
    if (!card || !chips) return;
    const CORNER = 38;
    const TAB_SPILL = 6; // the tab's ::before reaches 6px past the button on each side
    const fit = () => {
      const chip = chips.querySelector<HTMLElement>('.mn-chip[aria-pressed="true"]');
      const c = card.getBoundingClientRect();
      const box = chips.getBoundingClientRect();
      let left = false;
      let right = false;
      if (chip) {
        const r = chip.getBoundingClientRect();
        // Only the part of the tab the scrolling row still shows counts.
        const l = Math.max(r.left - TAB_SPILL, box.left);
        const rt = Math.min(r.right + TAB_SPILL, box.right);
        if (rt > l) {
          left = l < c.left + CORNER;
          right = rt > c.right - CORNER;
        }
      }
      card.toggleAttribute("data-tab-l", left);
      card.toggleAttribute("data-tab-r", right);
    };
    fit();
    chips.addEventListener("scroll", fit, { passive: true });
    window.addEventListener("resize", fit);
    // Sizes also move without a resize event: the page scrollbar appearing, the fonts arriving.
    const ro = typeof ResizeObserver === "function" ? new ResizeObserver(fit) : null;
    ro?.observe(card);
    ro?.observe(chips);
    const active = chips.querySelector<HTMLElement>('.mn-chip[aria-pressed="true"]');
    if (active) ro?.observe(active);
    let alive = true;
    void document.fonts?.ready.then(() => alive && fit());
    return () => {
      alive = false;
      ro?.disconnect();
      chips.removeEventListener("scroll", fit);
      window.removeEventListener("resize", fit);
    };
  }, [mode, category, evType]);

  // `/?q=` (Google's search box), the `/search` shortcut (`?search`): the search panel opens with the term.
  // On the Event tab `?q=` is the Event search instead. `?mode=` (old links) becomes `?tab=`. Read once.
  const searchBtn = useRef<HTMLButtonElement>(null);
  const askedQ = mode === "event" ? "" : params.get("q")?.trim() ?? "";
  const askedSearch = params.has("search");
  useEffect(() => {
    if (!oldMode && !askedSearch && !askedQ) return;
    const next = new URLSearchParams(params);
    if (oldMode) {
      next.delete("mode");
      const t = OLD_MODE_TAB[oldMode.toLowerCase()];
      if (t && !next.has("tab")) next.set("tab", t);
    }
    if (askedSearch || askedQ) {
      next.delete("search");
      if (askedQ) next.delete("q");
      seedSiteSearch(askedQ);
      panels.openSearch(searchBtn.current, "main");
    }
    setParams(next, { replace: true, preventScrollReset: true });
  }, [oldMode, askedSearch, askedQ, params, setParams, panels]);

  const set = (key: "tab" | "cat" | "view" | "type" | "color", value: string | null) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { preventScrollReset: true });
  };

  // The Event search text (?q=): typing replaces the history entry instead of adding one per word.
  // Reads the newest params: the field pushes after a short pause, other params may have changed meanwhile.
  const setQuery = (value: string) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value) next.set("q", value);
        else next.delete("q");
        return next;
      },
      { replace: true, preventScrollReset: true },
    );

  // The view names differ per tab, so changing tab drops ?view (the category stays).
  const pickMode = (m: Mode) => {
    const next = new URLSearchParams(params);
    if (m === "showcase") next.delete("tab");
    else next.set("tab", m);
    next.delete("view");
    if (m !== "event") {
      next.delete("type");
      next.delete("q");
    } else next.delete(FIND_PARAM); // Showcase and Creators share the term, like the old app
    if (m !== "showcase") next.delete("color");
    setParams(next, { preventScrollReset: true });
  };

  // App search screen: Showcase / Creators filter their grid (`?find=`), Event runs its search (`?tab=event&q=`);
  // the colours are Showcase's.
  const closeAppSearch = () => {
    appSearch.close();
    appSearchBtn.current?.focus();
  };
  const runAppSearch = (m: Mode, q: string) => {
    const next = new URLSearchParams(params);
    if (m !== mode) {
      if (m === "showcase") next.delete("tab");
      else next.set("tab", m);
      next.delete("view");
    }
    if (m !== "event") next.delete("type");
    if (m !== "showcase") next.delete("color");
    next.delete("q");
    next.delete(FIND_PARAM);
    if (q) next.set(m === "event" ? "q" : FIND_PARAM, q);
    setParams(next);
  };
  const applyAppColors = (list: string[]) => {
    const next = new URLSearchParams(params);
    if (mode !== "showcase") ["tab", "view", "type"].forEach((k) => next.delete(k));
    next.delete("q");
    if (list.length) next.set("color", list.map((c) => c.replace("#", "").toLowerCase()).join(","));
    else next.delete("color");
    setParams(next);
    closeAppSearch();
  };
  const openAppSearch = (el: HTMLButtonElement) => {
    appSearchBtn.current = el;
    appSearch.open();
  };
  // The view / category / type rows moved from the page into the app search screen; a button applies at once.
  const applyAppFilter = (m: Mode, key: AppFilterRow["key"], value: string) => {
    const needsLogin = key === "view" && ((m === "showcase" && VIEW_NEEDS_LOGIN[value as ShowcaseView]) || (m === "creators" && value === "following"));
    if (needsLogin && !user) {
      appSearch.close();
      navigate(SC_LINKS.login);
      return;
    }
    const next = new URLSearchParams(params);
    if (m !== mode) {
      if (m === "showcase") next.delete("tab");
      else next.set("tab", m);
      next.delete("view");
      if (m !== "event") ["type", "q"].forEach((k) => next.delete(k));
      else next.delete(FIND_PARAM);
      if (m !== "showcase") next.delete("color");
    }
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true, preventScrollReset: true });
  };
  const appFiltersFor = (m: Mode): AppFilterRow[] => {
    const here = m === mode;
    // Section headings in English (owner 2026-11-28).
    const cats: AppFilterRow = { key: "cat", label: "Category", value: category ?? "", options: [["", "All"], ...SC_CATEGORIES.map((c) => [c, c] as const)] };
    if (m === "showcase") {
      const options = SHOWCASE_VIEWS.map((v) => [v === "explore" ? "" : v, VIEW_LABEL[v]] as const);
      return [{ key: "view", label: "View", value: here && view !== "explore" ? view : "", options }, cats];
    }
    if (m === "creators") {
      const options = CREATOR_VIEWS.map((v) => [v === "discover" ? "" : v, CREATOR_VIEW_LABEL[v]] as const);
      return [{ key: "view", label: "View", value: here && crView !== "discover" ? crView : "", options }, cats];
    }
    // Event: When + Type sit on the Event page under the header (owner 2026-11-28), not in the search screen.
    return [];
  };
  // What the page is filtered by, as tags over the card (the rows themselves are in the search screen).
  const appActiveFilters = (): ActiveFilter[] => {
    const out: ActiveFilter[] = [];
    const q = params.get("q");
    if (mode === "showcase" && view !== "explore") out.push({ key: "view", name: VIEW_LABEL[view], label: VIEW_LABEL[view], onRemove: () => set("view", null) });
    if (mode === "creators" && crView !== "discover") {
      out.push({ key: "view", name: CREATOR_VIEW_LABEL[crView], label: CREATOR_VIEW_LABEL[crView], onRemove: () => set("view", null) });
    }
    if (mode !== "event" && category) out.push({ key: "cat", name: category, label: category, onRemove: () => set("cat", null) });
    if (mode === "showcase" && colors.length) {
      const label = (
        <>
          {colors.map((c) => (
            <span key={c} aria-hidden="true" className="ap-dot" style={{ background: c }} />
          ))}
          สี
        </>
      );
      out.push({ key: "color", name: "สี", label, onRemove: () => set("color", null) });
    }
    if (mode === "event" && q) out.push({ key: "q", name: `"${q}"`, label: `“${q}”`, onRemove: () => setQuery("") });
    if (find) out.push({ key: FIND_PARAM, name: `"${find}"`, label: `“${find}”`, onRemove: () => clearFind() });
    return out;
  };

  const { user, loading: authLoading } = useAuth();
  const signedOut = !user && !authLoading;
  const viewParam = params.get("view");
  const wanted: ShowcaseView = (SHOWCASE_VIEWS as readonly string[]).includes(viewParam ?? "") ? (viewParam as ShowcaseView) : "explore";
  // Following and Collections belong to a signed-in person; a signed-out visitor gets Explore.
  const view: ShowcaseView = VIEW_NEEDS_LOGIN[wanted] && signedOut ? "explore" : wanted;
  const pickView = (v: ShowcaseView) => {
    if (VIEW_NEEDS_LOGIN[v] && !user) navigate(loginHref());
    else set("view", v === "explore" ? null : v);
  };
  const crWanted: CreatorView = (CREATOR_VIEWS as readonly string[]).includes(viewParam ?? "") ? (viewParam as CreatorView) : "discover";
  const crView: CreatorView = crWanted === "following" && signedOut ? "discover" : crWanted;
  const pickCrView = (v: CreatorView) => {
    if (v === "following" && !user) navigate(loginHref());
    else set("view", v === "discover" ? null : v);
  };
  const evView: EventView = (EVENT_VIEWS as readonly string[]).includes(viewParam ?? "") ? (viewParam as EventView) : "all";
  // "ไม่เจอสิ่งที่ตรงกัน" → "ล้างตัวกรอง": back to every work / creator of this tab.
  const filtered =
    !!find || (mode === "showcase" ? !!category || colors.length > 0 || view !== "explore" : mode === "creators" && (!!category || crView !== "discover"));
  const clearFilters = () => {
    const next = new URLSearchParams(params);
    for (const k of ["cat", "color", "view", FIND_PARAM]) next.delete(k);
    setParams(next, { preventScrollReset: true });
  };
  const clearFind = () => {
    const next = new URLSearchParams(params);
    next.delete(FIND_PARAM);
    setParams(next, { preventScrollReset: true });
  };
  // Saving opens SaveToast (collections); signed out → log-in page.
  const saves = useSaveFlow();
  const { toggle: saveWork } = saves;
  const toggleSave = useCallback((w: TileWork, el: HTMLElement) => saveWork({ id: w.id, title: w.title }, el), [saveWork]);

  // The start-up brand screen waits for the first feed on "/"; the other tabs have nothing to wait for.
  useEffect(() => {
    if (mode !== "showcase") releaseBoot();
  }, [mode]);

  // Event filters: When + Type. On the website they sit over the card; in the store app they are part of the
  // header (owner 2026-11-28), so they hide and come back with it while scrolling.
  // The app has no When menu (owner 2026-11-28: always Anytime); its header shows the type chips below the bar.
  const eventView = (
    <ViewMenu label="ช่วงเวลา" options={EVENT_VIEWS} labels={EVENT_VIEW_LABEL} value={evView} onPick={(v) => set("view", v === "all" ? null : v)} />
  );
  const eventChips = (
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
  );
  const eventFld = (
    <div className="mn-fld" data-mode="event">
      {eventView}
      <span aria-hidden="true" className="mn-fld-rule" />
      {eventChips}
    </div>
  );

  return (
    <main className="sc-main mn">
      <div className="mn-row">
        <div className="mn-tools">
          {mode === "showcase" ? (
            <ColorSearch
              colors={colors}
              onApply={(list) => set("color", list.length ? list.map((c) => c.replace("#", "").toLowerCase()).join(",") : null)}
            />
          ) : null}
          <button
            ref={searchBtn}
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
          <Link to={loginHref(SC_LINKS.upload)} aria-label="ลงงาน" className="mn-add">
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
        eventFld
      )}

      {appSlot ? <AppActiveFilters items={appActiveFilters()} onOpen={(e) => openAppSearch(e.currentTarget)} /> : null}
      <div ref={cardRef} className="mn-card">
        <h1 className="sc-sr">Samecor — ผลงานล่าสุด</h1>
        {find && !appSlot ? (
          <div className="mn-find">
            <button type="button" className="mn-find-chip" aria-label={`ล้างคำค้น ${find}`} onClick={clearFind}>
              <span className="mn-find-t">{find}</span>
              <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>
        ) : null}
        {mode === "showcase" ? (
          <Showcase
            key={`${view}:${category ?? "all"}:${colors.join(",")}:${find}`}
            view={view}
            category={category}
            find={find}
            colors={colors}
            label={MODE_LABEL[mode]}
            savedIds={saves.ids}
            onToggleSave={toggleSave}
            onClear={filtered ? clearFilters : undefined}
          />
        ) : mode === "creators" ? (
          <Creators view={crView} category={category} find={find} onClear={filtered ? clearFilters : undefined} />
        ) : (
          <Events view={evView} type={evType} q={params.get("q") ?? ""} onQuery={setQuery} />
        )}
      </div>
      {saves.element}
      {appSlot
        ? createPortal(
            <AppHomeBar
              mode={mode}
              onPick={pickMode}
              onSearch={(e) => openAppSearch(e.currentTarget)}
              onCalendar={mode === "event" ? (e) => panels.openCalendar(e.currentTarget) : undefined}
              below={
                mode === "event" ? (
                  <div className="mn-fld" data-mode="event">
                    {eventChips}
                  </div>
                ) : null
              }
            />,
            appSlot,
          )
        : null}
      {appSearch.mounted ? (
        <AppSearch
          initialMode={mode}
          initialValue={(mode === "event" ? params.get("q") : find) ?? ""}
          colors={colors}
          leaving={appSearch.leaving}
          onClose={closeAppSearch}
          onSubmit={runAppSearch}
          onColors={applyAppColors}
          filtersFor={appFiltersFor}
          onFilter={applyAppFilter}
        />
      ) : null}
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
  /** The text filter (`?find=`). */
  find: string;
  /** Colour search: only works whose cover matches, closest first. */
  colors: string[];
  label: string;
  savedIds: Set<string>;
  onToggleSave: (work: TileWork, button: HTMLElement) => void;
  /** Set while a category, colour or view narrows the grid. */
  onClear?: () => void;
};

function Showcase({ view, category, find, colors, label, savedIds, onToggleSave, onClear }: ShowcaseProps) {
  const { data: rows, isPending, isError, isFetchNextPageError, hasNextPage, isFetchingNextPage, fetchNextPage, refetch } = useShowcaseWorks(view, category, find);
  const owners = useMemo(() => [...new Set((rows ?? []).map((r) => r.owner_id).filter((id): id is string => !!id))], [rows]);
  const { data: profiles } = useProfilesByIds(owners);

  const allWorks = useMemo<TileWork[]>(
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

  // Colour search measures the covers in the browser (the existing colour search of the site).
  const colorKey = colors.join(",");
  const targets = useMemo(() => (colorKey ? allWorks.map((w) => ({ id: w.id, image: w.cover })) : []), [colorKey, allWorks]);
  const { scores, pending: measuring } = useCoverColorScores(targets, colorKey || null);
  const scoreKey = colorKey ? [...scores].map(([id, s]) => `${id}:${s.toFixed(3)}`).join("|") : "";
  const works = useMemo(() => {
    if (!colorKey) return allWorks;
    const score = (id: string) => scores.get(id) ?? 0;
    return allWorks.filter((w) => score(w.id) >= COLOR_MATCH_MIN).sort((a, b) => score(b.id) - score(a.id));
    // scores is a new Map on every render; scoreKey says when its content changed
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colorKey, allWorks, scoreKey]);

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

  // A tile opens the work over this page; ‹ › on the work go through the works in this order.
  const location = useLocation();
  const linkState = useMemo(() => ({ backgroundLocation: location, scList: works.map((w) => w.id) }), [location, works]);

  useEffect(() => {
    if (!isPending) releaseBoot();
  }, [isPending]);

  if (isPending || (colorKey && measuring && !works.length)) return <ScLoader label="กำลังโหลดผลงานเพิ่ม" />;
  if (isError && !works.length) return <LoadError onRetry={() => void refetch()} />;
  if (!works.length) return <EmptyNote text="ไม่เจอสิ่งที่ตรงกัน" action={onClear ? { label: "ล้างตัวกรอง", onClick: onClear } : null} />;

  return (
    <>
      {category ? (
        <Masonry works={visible} label={label} savedIds={savedIds} onToggleSave={onToggleSave} linkState={linkState} />
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
                      linkState={linkState}
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
      {moreLeft && isFetchNextPageError && !moreLoaded ? (
        <LoadError onRetry={() => void fetchNextPage()} />
      ) : moreLeft ? (
        <div ref={moreRef}>
          <ScLoader label="กำลังโหลดผลงานเพิ่ม" />
        </div>
      ) : null}
    </>
  );
}

