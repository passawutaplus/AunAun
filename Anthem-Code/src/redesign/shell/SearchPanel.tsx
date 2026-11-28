import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { clearSiteSearchSeed, siteSearchSeed, useSiteSearch } from "../lib/useSiteSearch";
import { onEscape } from "./panels";

type Props = {
  /** CSS `top` of the capsule; set by the shell from where it was opened. */
  top: string;
  /** Centred on `top` (header search) instead of hanging from it (home page). */
  centred: boolean;
  leaving: boolean;
  onClose: (restoreFocus?: boolean) => void;
};

const thumb = (url: string) => (url ? { backgroundImage: `url(${JSON.stringify(url)})` } : undefined);

/**
 * Spotlight search (mock: Main.dc.html "ค้นหาแบบ Spotlight", ChatDock.dc.html "Search"): white capsule over a
 * blurred veil; suggestions only after typing; a result opens the work / profile / event.
 */
export default function SearchPanel({ top, centred, leaving, onClose }: Props) {
  // Opened from `/?q=` or the `/search` shortcut: starts with that term (read once).
  const [q, setQ] = useState(siteSearchSeed);
  const inputRef = useRef<HTMLInputElement>(null);
  // No "nothing found" line any more: the event search row is always there once something is typed.
  const { hits } = useSiteSearch(q);
  const typed = !!q.trim();
  // Event search by sentence (owner 2026-11-28): it moved from the Event tab into this panel. On the Event tab
  // its row comes first and Enter runs it; elsewhere it is the last row.
  const loc = useLocation();
  const navigate = useNavigate();
  const onEventTab = loc.pathname === "/" && new URLSearchParams(loc.search).get("tab") === "event";
  const eventHref = `/?tab=event&q=${encodeURIComponent(q.trim())}`;
  const eventRow = (
    <Link key="event-search" to={eventHref} className="sp-hit" onClick={() => onClose(false)}>
      <span aria-hidden="true" className="sp-th sp-th-ic">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#282929" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
          <path d="M3.5 10h17M8 3v4M16 3v4" />
        </svg>
      </span>
      <span className="sp-name">หาอีเว้นท์ “{q.trim()}”</span>
      <span className="sp-kind">EVENT</span>
    </Link>
  );

  useEffect(() => {
    clearSiteSearchSeed();
    const el = inputRef.current;
    el?.focus();
    el?.setSelectionRange(el.value.length, el.value.length);
  }, []);

  useEffect(() => onEscape(() => onClose()), [onClose]);

  return (
    <>
      <div className="pv-veil sp-veil" aria-hidden="true" data-leaving={leaving ? "" : undefined} onClick={() => onClose()} />
      <div
        className="pv-box sp-box"
        role="dialog"
        aria-modal="true"
        aria-label="ค้นหา"
        style={{ top }}
        data-centred={centred ? "" : undefined}
        data-typed={typed ? "" : undefined}
        data-leaving={leaving ? "" : undefined}
      >
        <div className="sp-row">
          <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#8A8A87" strokeWidth="1.5" strokeLinecap="round">
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            className="sp-in"
            aria-label="ค้นหาผลงาน ศิลปิน อีเว้นท์"
            placeholder={onEventTab ? "อยากไปงานไหน เช่น วาดรูปฟรี เชียงใหม่ เสาร์นี้" : "ค้นหาผลงาน ศิลปิน อีเว้นท์"}
            enterKeyHint="search"
            autoComplete="off"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== "Enter" || !typed || !onEventTab) return;
              e.preventDefault();
              onClose(false);
              navigate(eventHref);
            }}
          />
          <button type="button" aria-label="ปิดค้นหา" className="sp-esc" onClick={() => onClose()}>
            <span aria-hidden="true" className="sp-esc-t">esc</span>
            <svg aria-hidden="true" className="sp-esc-x" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#282929" strokeWidth="1.5" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        {typed ? (
          <div className="sp-res">
            {onEventTab ? eventRow : null}
            {hits.map((h) => (
              <Link key={h.key} to={h.href} className="sp-hit" onClick={() => onClose(false)}>
                <span aria-hidden="true" className="sp-th" data-round={h.kind === "CREATOR" ? "" : undefined} style={thumb(h.thumb)} />
                <span className="sp-name">{h.name}</span>
                <span className="sp-kind">{h.kind}</span>
              </Link>
            ))}
            {onEventTab ? null : eventRow}
          </div>
        ) : null}
      </div>
    </>
  );
}
