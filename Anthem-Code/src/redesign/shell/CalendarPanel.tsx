import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { eventPath } from "@/lib/exhibitionEvents";
import { proxiedImageUrl } from "@/lib/imageProxy";
import { EVENT_KIND, dayOf, isoDay, lastDay, shortDate, useHomeEvents } from "../main/useHomeEvents";
import { onEscape } from "./panels";

type Props = {
  leaving: boolean;
  onClose: (restoreFocus?: boolean) => void;
};

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const MONTHS_TH = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
const MS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WD = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

/** Google Calendar subscribes to the feed served by api/events-ics.js. */
const SUBSCRIBE = "https://calendar.google.com/calendar/render?cid=webcal%3A%2F%2Fwww.samecor.com%2Fevents.ics";

const shortDay = (iso: string) => {
  const d = dayOf(iso);
  return `${d.getDate()} ${MS[d.getMonth()]}`;
};

/**
 * Event Calendar (mock: Calendar.dc.html, embedded): a centre popup on large screens, full screen on phones.
 * Pick a day to see what runs on it; red dots mark days with events.
 */
export default function CalendarPanel({ leaving, onClose }: Props) {
  const { data } = useHomeEvents();
  const now = new Date();
  const today = { y: now.getFullYear(), m: now.getMonth(), d: now.getDate() };
  const [sel, setSel] = useState(today);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
  }, []);
  useEffect(() => onEscape(() => onClose()), [onClose]);

  const events = useMemo(() => (data?.events ?? []).filter((e) => !!e.starts_on), [data]);
  const on = (iso: string) => events.filter((e) => e.starts_on! <= iso && (lastDay(e) ?? e.starts_on!) >= iso);

  const { y, m } = sel;
  const first = (new Date(y, m, 1).getDay() + 6) % 7;
  const days = new Date(y, m + 1, 0).getDate();
  const prevDays = new Date(y, m, 0).getDate();
  /** Days of the month; the padding days of the months around it have no `iso`. */
  const cells: Array<{ n: number; iso: string | null; key: string }> = [];
  for (let i = 0; i < first; i++) cells.push({ n: prevDays - first + 1 + i, iso: null, key: `p${i}` });
  for (let d = 1; d <= days; d++) cells.push({ n: d, iso: isoDay(new Date(y, m, d)), key: `d${d}` });
  for (let k = 1; cells.length % 7; k++) cells.push({ n: k, iso: null, key: `n${k}` });

  const selIso = isoDay(new Date(y, m, sel.d));
  const list = on(selIso).sort((a, b) => (a.starts_on ?? "").localeCompare(b.starts_on ?? ""));
  const isToday = y === today.y && m === today.m && sel.d === today.d;
  const goMonth = (dm: number) => {
    const n = new Date(y, m + dm, 1);
    setSel({ y: n.getFullYear(), m: n.getMonth(), d: 1 });
  };

  return (
    <div className="cal-wrap" data-leaving={leaving ? "" : undefined}>
      <div className="pv-veil" aria-hidden="true" data-leaving={leaving ? "" : undefined} onClick={() => onClose()} />
      <div className="pv-box cal-box" role="dialog" aria-modal="true" aria-labelledby="sc-cal-h" data-leaving={leaving ? "" : undefined}>
        <div className="cal-hd">
          <div>
            <h2 id="sc-cal-h" lang="en">Event Calendar</h2>
          </div>
          <button ref={closeRef} type="button" aria-label="ปิดปฏิทิน" className="cal-x" onClick={() => onClose()}>
            <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#282929" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <div className="cal-grid">
          <div className="cal-left">
            <div className="cal-mnav">
              <button type="button" className="cal-nv" aria-label="เดือนก่อน" onClick={() => goMonth(-1)}>
                <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#282929" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14.5 6l-6 6 6 6" />
                </svg>
              </button>
              <span aria-live="polite" lang="en">{`${MONTHS[m]} ${y}`}</span>
              <button type="button" className="cal-nv" aria-label="เดือนถัดไป" onClick={() => goMonth(1)}>
                <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#282929" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9.5 6l6 6-6 6" />
                </svg>
              </button>
            </div>
            <div className="cal-days">
              {WD.map((w) => (
                <span key={w} className="cal-wd" lang="en">
                  {w}
                </span>
              ))}
              {cells.map((c) => {
                if (!c.iso) {
                  return (
                    <span key={c.key} className="cal-out" aria-hidden="true">
                      {c.n}
                    </span>
                  );
                }
                const has = on(c.iso).length > 0;
                const picked = c.n === sel.d;
                const td = y === today.y && m === today.m && c.n === today.d;
                return (
                  <button
                    key={c.key}
                    type="button"
                    className="cal-cd"
                    aria-pressed={picked}
                    aria-label={`${c.n} ${MONTHS_TH[m]}${td ? " วันนี้" : ""}${has ? " มีอีเว้นท์" : ""}`}
                    data-today={td ? "" : undefined}
                    data-has={has ? "" : undefined}
                    onClick={() => setSel({ y, m, d: c.n })}
                  >
                    <span>{c.n}</span>
                    <i aria-hidden="true" />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="cal-right">
            {/* The count sits on the date's line, at the right (owner 2026-11-28). */}
            <div className="cal-dayhd">
              <p lang="en">{`${DW[new Date(y, m, sel.d).getDay()]}, ${sel.d} ${MS[m]} ${y}`}</p>
              <span className="cal-cnt">{`${list.length} อีเว้นท์`}</span>
              {isToday ? null : (
                <button type="button" className="cal-today" onClick={() => setSel(today)} lang="en">
                  Today
                </button>
              )}
            </div>
            <div className="cal-list">
              {list.map((e) => {
                const end = lastDay(e);
                return (
                  <Link key={e.id} to={eventPath(e)} className="cal-ev" aria-label={e.title} onClick={() => onClose(false)}>
                    {e.cover_url ? (
                      <img alt="" src={proxiedImageUrl(e.cover_url, 160)} loading="lazy" decoding="async" />
                    ) : (
                      <span aria-hidden="true" className="cal-noimg" />
                    )}
                    <span className="cal-ev-tx">
                      <span className="cal-ev-kind" lang="en">
                        {e.category === "open_call" ? <i aria-hidden="true" /> : null}
                        {EVENT_KIND[e.category] ?? EVENT_KIND.other}
                      </span>
                      <span className="cal-ev-title">{e.title}</span>
                      <span className="cal-ev-meta">
                        <span>
                          <svg aria-hidden="true" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#8A8A87" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
                            <path d="M3.5 10h17M8 3v4M16 3v4" />
                          </svg>
                          {end && end !== e.starts_on ? `${shortDay(e.starts_on!)} – ${shortDay(end)}` : shortDate(e.starts_on!)}
                        </span>
                        {e.location_name?.trim() || e.area?.trim() ? (
                          <span>
                            <svg aria-hidden="true" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#8A8A87" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11z" />
                              <circle cx="12" cy="10" r="2.3" />
                            </svg>
                            {e.location_name?.trim() || e.area?.trim()}
                          </span>
                        ) : null}
                      </span>
                    </span>
                    <span aria-hidden="true" className="cal-ev-go">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#282929" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12h14M13 6l6 6-6 6" />
                      </svg>
                    </span>
                  </Link>
                );
              })}
              {list.length ? null : <p className="cal-empty">ไม่มีอีเว้นท์วันนี้ · ลองเลือกวันที่มีจุดแดง</p>}
            </div>
          </div>
        </div>

        <div className="cal-ft">
          {/* Owner 2026-11-28: the footer button subscribes in Google Calendar (was "View All Events"). */}
          <a href={SUBSCRIBE} target="_blank" rel="noopener noreferrer" className="cal-all" lang="en">
            Follow in Google Calendar
            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M7 17L17 7M9 7h8v8" />
            </svg>
          </a>
        </div>
      </div>
    </div>
  );
}
