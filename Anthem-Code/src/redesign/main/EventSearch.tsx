import { useEffect, useMemo, useRef, useState } from "react";
import { hasIntent, intentSummary, parseEventIntent, toggleIntentWord } from "./eventIntent";
import type { EventSearch as Search } from "./useEventSearch";
import { isoDay } from "./useHomeEvents";
import "../styles/event-search.css";

const QUICK = [
  ["free", "ฟรี"],
  ["weekend", "สุดสัปดาห์นี้"],
  ["near", "ใกล้ฉัน"],
] as const;

type Props = {
  /** The search in the URL (?q=). */
  q: string;
  onQuery: (q: string) => void;
  search: Search | null;
};

/**
 * Event tab search (owner 2026-11-28, not in the mock — question for Beam): one field for a whole sentence,
 * quick chips, and one line saying what was understood ("งานวาดรูป · ฟรี · เชียงใหม่ · เสาร์นี้").
 */
export default function EventSearch({ q, onQuery, search }: Props) {
  const [text, setText] = useState(q);
  const pushed = useRef(q);

  // Back / forward or a link changed ?q: show it. Our own pushes come back equal and change nothing.
  useEffect(() => {
    if (q !== pushed.current) {
      pushed.current = q;
      setText(q);
    }
  }, [q]);

  const push = (value: string) => {
    pushed.current = value.trim() ? value : "";
    onQuery(pushed.current);
  };

  useEffect(() => {
    if (text === pushed.current || (!text.trim() && !pushed.current)) return;
    const t = window.setTimeout(() => push(text), 350);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- push only reads the latest props
  }, [text]);

  const local = useMemo(() => parseEventIntent(text, isoDay(new Date())), [text]);

  const toggle = (kind: (typeof QUICK)[number][0]) => {
    const next = toggleIntentWord(text, local, kind);
    setText(next);
    push(next);
  };

  const near = search?.near;
  const nearLabel = near?.status === "ok" ? near.provinces[0]?.label : null;
  const summary = search && !search.intent.empty ? intentSummary(search.intent, nearLabel) : "";
  const note =
    search?.intent.nearMe && near?.status === "failed"
      ? "เปิดตำแหน่งไม่ได้ ลองพิมพ์ชื่อจังหวัดแทนนะ"
      : search?.intent.nearMe && near?.status === "asking"
        ? "กำลังหาตำแหน่ง…"
        : "";

  return (
    <div className="mn-es" role="search">
      <div className="mn-es-box">
        <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8A8A87" strokeWidth="1.5" strokeLinecap="round">
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-3.5-3.5" />
        </svg>
        <input
          type="search"
          className="mn-es-in"
          aria-label="ค้นหาอีเว้นท์"
          placeholder="อยากไปงานไหน เช่น วาดรูปฟรี เชียงใหม่ เสาร์นี้"
          enterKeyHint="search"
          autoComplete="off"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") push(text);
            if (e.key === "Escape" && text) {
              e.preventDefault();
              setText("");
              push("");
            }
          }}
        />
        {text ? (
          <button
            type="button"
            className="mn-es-x"
            aria-label="ล้างคำค้น"
            onClick={() => {
              setText("");
              push("");
            }}
          >
            <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#282929" strokeWidth="1.6" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        ) : null}
      </div>
      <div className="mn-es-row">
        <div className="mn-es-quick" role="group" aria-label="ค้นหาด่วน">
          {QUICK.map(([kind, label]) => (
            <button key={kind} type="button" className="mn-es-chip" aria-pressed={hasIntent(local, kind)} onClick={() => toggle(kind)}>
              {label}
            </button>
          ))}
        </div>
        {summary || note ? (
          <p className="mn-es-sum" aria-live="polite">
            {summary}
            {note ? <span className="mn-es-note">{note}</span> : null}
          </p>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Website Event tab (owner 2026-11-28): no search field on the tab any more — the sentence is typed in the
 * header search (SearchPanel → `/?tab=event&q=`). While a search is on, this one line shows what was asked,
 * what was understood, and × to clear it. The store app shows the same as a tag over the card instead.
 */
export function EventQueryBar({ q, onQuery, search }: Props) {
  const near = search?.near;
  const nearLabel = near?.status === "ok" ? near.provinces[0]?.label : null;
  const summary = search && !search.intent.empty ? intentSummary(search.intent, nearLabel) : "";
  const note =
    search?.intent.nearMe && near?.status === "failed"
      ? "เปิดตำแหน่งไม่ได้ ลองพิมพ์ชื่อจังหวัดแทนนะ"
      : search?.intent.nearMe && near?.status === "asking"
        ? "กำลังหาตำแหน่ง…"
        : "";
  if (!q.trim()) return null;
  return (
    <div className="mn-es-on" role="status">
      <span className="mn-es-tag">
        <span className="mn-es-tag-t">“{q.trim()}”</span>
        <button type="button" className="mn-es-x" aria-label="ล้างคำค้น" onClick={() => onQuery("")}>
          <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#282929" strokeWidth="1.6" strokeLinecap="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </span>
      {summary || note ? (
        <p className="mn-es-sum" aria-live="polite">
          {summary}
          {note ? <span className="mn-es-note">{note}</span> : null}
        </p>
      ) : null}
    </div>
  );
}
