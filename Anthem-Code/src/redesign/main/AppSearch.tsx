import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useSearchHistory, type SearchHistoryScope } from "@/hooks/useSearchHistory";
import { useSiteSearch, type SearchKind } from "../lib/useSiteSearch";
import { onEscape } from "../shell/panels";
import { AppModeSwitch, type HomeMode } from "./AppHomeBar";
import ColorSearch from "./ColorSearch";

const RECENT_LIMIT = 8;
const HIT_LIMIT = 6;

const SCOPE: Record<HomeMode, { label: string; placeholder: string; hint: string; kind: SearchKind; history?: SearchHistoryScope }> = {
  showcase: { label: "Showcase", placeholder: "ค้นหาผลงาน", hint: "พิมพ์ชื่อผลงาน สไตล์ หรือเครื่องมือที่ใช้", kind: "WORK" },
  creators: { label: "Creators", placeholder: "ค้นหาครีเอเตอร์", hint: "พิมพ์ชื่อครีเอเตอร์ ทักษะ หรือเครื่องมือ", kind: "CREATOR", history: "creators" },
  // Same recent list as the old app's Exhibition search.
  event: { label: "Event", placeholder: "อยากไปงานไหน", hint: "เช่น วาดรูปฟรี เชียงใหม่ เสาร์นี้", kind: "EVENT", history: "exhibition" },
};

const thumb = (url: string) => (url ? { backgroundImage: `url(${JSON.stringify(url)})` } : undefined);

type Props = {
  initialMode: HomeMode;
  initialValue: string;
  /** Colours in use on Showcase (`?color=`). */
  colors: string[];
  leaving: boolean;
  onClose: () => void;
  /** Runs the Event search on the home page (`?tab=event&q=`); the screen closes itself. */
  onSubmit: (mode: HomeMode, query: string) => void;
  onColors: (colors: string[]) => void;
};

/**
 * Store app search (owner 2026-11-28: "เหมือนแอปเก่าเป๊ะ"): the old app's full-screen phone search in the new
 * design. Title, recent searches, the mode pill and the text box sit at the bottom near the thumb; Showcase
 * also has the colour search. Typing lists matching works / creators / events of that mode; Event's search
 * button runs the Event tab's own search.
 */
export default function AppSearch({ initialMode, initialValue, colors, leaving, onClose, onSubmit, onColors }: Props) {
  const [mode, setMode] = useState<HomeMode>(initialMode);
  const [value, setValue] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const meta = SCOPE[mode];
  const { queries, record, remove } = useSearchHistory(user?.id, meta.history);
  const typed = !!value.trim();
  const { hits, ready } = useSiteSearch(typed ? value : "");
  const shown = hits.filter((h) => h.kind === meta.kind).slice(0, HIT_LIMIT);
  const recent = queries.slice(0, RECENT_LIMIT);

  useEffect(() => {
    // Focus once the screen has slid up, so the keyboard does not fight the animation.
    const still = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const t = window.setTimeout(() => inputRef.current?.focus(), still ? 0 : 320);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.clearTimeout(t);
      document.body.style.overflow = prev;
    };
  }, []);

  // Esc closes the colour box first (it has its own handler), then this screen.
  useEffect(
    () =>
      onEscape(() => {
        if (!boxRef.current?.querySelector('.cs [aria-expanded="true"]')) onClose();
      }),
    [onClose],
  );

  // Only the Event tab filters its list by text (`?tab=event&q=`). Showcase / Creators have no text filter
  // (home `?q=` opens the Spotlight panel instead), so their matches stay listed right here.
  const submit = (q: string) => {
    const query = q.trim();
    if (query) record(query);
    if (mode === "event") {
      onSubmit(mode, query);
      onClose();
      return;
    }
    setValue(query);
    inputRef.current?.blur();
  };

  return (
    <div
      ref={boxRef}
      className="as"
      role="dialog"
      aria-modal="true"
      aria-label={`ค้นหาใน ${meta.label}`}
      data-leaving={leaving ? "" : undefined}
    >
      <div className="as-in">
        <h2 className="as-h">ค้นหาใน {meta.label}</h2>
        {typed ? (
          <div className="as-hits">
            {shown.map((h) => (
              <Link key={h.key} to={h.href} className="sp-hit" onClick={() => onClose()}>
                <span aria-hidden="true" className="sp-th" data-round={h.kind === "CREATOR" ? "" : undefined} style={thumb(h.thumb)} />
                <span className="sp-name">{h.name}</span>
                <span className="sp-kind">{h.kind}</span>
              </Link>
            ))}
            {ready && !shown.length ? (
              <p className="as-p">{mode === "event" ? "กดค้นหาเพื่อดูทั้งหมดได้เลย" : "ไม่เจอที่ตรงกัน ลองคำอื่นดูนะ"}</p>
            ) : null}
          </div>
        ) : (
          <>
            <p className="as-p">{recent.length ? "ค้นหาล่าสุดของคุณ" : meta.hint}</p>
            {recent.length ? (
              <ul className="as-recent">
                {recent.map((q) => (
                  <li key={q}>
                    <button type="button" className="as-q" onClick={() => submit(q)}>
                      <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8A8A87" strokeWidth="1.33" strokeLinecap="round">
                        <circle cx="12" cy="12" r="8.5" />
                        <path d="M12 7.5V12l3 2" />
                      </svg>
                      <span>{q}</span>
                    </button>
                    <button type="button" className="as-rm" aria-label={`ลบ "${q}" ออกจากประวัติ`} onClick={() => remove(q)}>
                      <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                        <path d="M6 6l12 12M18 6L6 18" />
                      </svg>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </>
        )}

        <AppModeSwitch labels value={mode} onPick={setMode} />

        <form
          className="as-form"
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            submit(value);
          }}
        >
          <label className="as-box">
            <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8A8A87" strokeWidth="1.5" strokeLinecap="round">
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" />
            </svg>
            <input
              ref={inputRef}
              type="search"
              className="as-t"
              enterKeyHint="search"
              autoComplete="off"
              aria-label={meta.placeholder}
              placeholder={meta.placeholder}
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
          </label>
          {mode === "showcase" ? <ColorSearch colors={colors} onApply={onColors} /> : null}
          <button type="button" className="as-x" aria-label="ปิดการค้นหา" onClick={() => onClose()}>
            <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#282929" strokeWidth="1.5" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
}
