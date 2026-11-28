import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useSiteSearch } from "../lib/useSiteSearch";
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
  const [q, setQ] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const { hits, ready } = useSiteSearch(q);
  const typed = !!q.trim();

  useEffect(() => {
    inputRef.current?.focus();
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
            placeholder="ค้นหาผลงาน ศิลปิน อีเว้นท์"
            enterKeyHint="search"
            autoComplete="off"
            value={q}
            onChange={(e) => setQ(e.target.value)}
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
            {hits.map((h) => (
              <Link key={h.key} to={h.href} className="sp-hit" onClick={() => onClose(false)}>
                <span aria-hidden="true" className="sp-th" data-round={h.kind === "CREATOR" ? "" : undefined} style={thumb(h.thumb)} />
                <span className="sp-name">{h.name}</span>
                <span className="sp-kind">{h.kind}</span>
              </Link>
            ))}
            {ready && !hits.length ? <p className="sp-none">ไม่เจอสิ่งที่ตรงกัน</p> : null}
          </div>
        ) : null}
      </div>
    </>
  );
}
