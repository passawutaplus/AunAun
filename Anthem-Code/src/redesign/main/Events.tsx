import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useMyEventInterests } from "@/hooks/useExhibitionEvents";
import { eventPath } from "@/lib/exhibitionEvents";
import { proxiedImageUrl } from "@/lib/imageProxy";
import { toggleEventInterest } from "@/server/mutations/eventInterest";
import type { HomeEventRow } from "@/server/queries/homeEvents";
import { SC_LINKS } from "../routes";
import ScLoader from "./ScLoader";
import { EVENT_KIND, dayOf, inView, isoDay, lastDay, monthCaps, shortDate, useHomeEvents, weekdayDay, type EventType, type EventView } from "./useHomeEvents";

const DAY = 24 * 60 * 60 * 1000;
const fullDate = (iso: string) => shortDate(iso, true);

const Chevron = ({ d }: { d: string }) => (
  <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#282929" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

/**
 * Event tab of the home page (mock: Main.dc.html, isEvents): HIGHLIGHT, then the list.
 * "ดูเส้นทาง" opens the Locations page of a multi-venue highlight (step 6).
 */
export default function Events({ view, type }: { view: EventView; type: EventType | null }) {
  const { data, isPending, isError } = useHomeEvents();
  const today = isoDay(new Date());

  const featured = useMemo(
    () => (data?.events ?? []).filter((e) => e.is_featured && (!e.featured_until || e.featured_until >= today) && (lastDay(e) ?? today) >= today),
    [data, today],
  );

  const listed = useMemo(() => {
    const rows = (data?.events ?? []).filter((e) => inView(e, view, today) && (!type || type === "highlight" || e.category === type));
    if (view === "now") return [...rows].sort((a, b) => (lastDay(a) ?? "9").localeCompare(lastDay(b) ?? "9"));
    if (view === "past") return [...rows].sort((a, b) => (b.starts_on ?? "").localeCompare(a.starts_on ?? ""));
    return rows;
  }, [data, view, type, today]);

  if (isPending) return <ScLoader label="กำลังโหลดผลงานเพิ่ม" />;
  if (isError) return null;

  return (
    <>
      {featured.length ? <Highlight events={featured} venues={data!.venues} today={today} /> : null}
      {type === "highlight" ? (
        featured.length ? null : <p className="mn-none">ไม่เจอสิ่งที่ตรงกัน</p>
      ) : listed.length ? (
        <EventList events={listed} byDay={view !== "now"} today={today} />
      ) : (
        <p className="mn-none">ไม่เจอสิ่งที่ตรงกัน</p>
      )}
    </>
  );
}

function Highlight({ events, venues, today }: { events: HomeEventRow[]; venues: Map<string, HomeEventRow[]>; today: string }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [index, setIndex] = useState(0);
  const [venuesOpen, setVenuesOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const copiedTimer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(copiedTimer.current), []);

  const e = events[index % events.length];
  const ids = useMemo(() => events.map((x) => x.id), [events]);
  const { data: mine } = useMyEventInterests(ids);
  const interested = !!mine?.has(e.id);
  const toggle = useMutation({
    mutationFn: toggleEventInterest,
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ["events", "my-interests"] });
      void qc.invalidateQueries({ queryKey: ["events", "stats"] });
      void qc.invalidateQueries({ queryKey: ["events", "my-list"] });
    },
  });

  const go = (step: number) => {
    setIndex((i) => (i + step + events.length) % events.length);
    setVenuesOpen(false);
  };

  const share = async () => {
    try {
      await navigator.clipboard.writeText(window.location.origin + eventPath(e));
    } catch {
      return; // clipboard blocked: say nothing rather than claim it was copied
    }
    setCopied(true);
    window.clearTimeout(copiedTimer.current);
    copiedTimer.current = window.setTimeout(() => setCopied(false), 1800);
  };

  const live = !!e.starts_on && e.starts_on <= today;
  const end = lastDay(e);
  const daysLeft = end ? Math.round((dayOf(end).getTime() - dayOf(today).getTime()) / DAY) : null;
  const places = venues.get(e.id) ?? [];

  return (
    <section aria-label="Highlight" className="mn-ev-hl">
      <div className="mn-ev-bar">
        <h2 lang="en">HIGHLIGHT</h2>
        {events.length > 1 ? (
          <div className="mn-ev-nav">
            <span className="mn-ev-pos">{`${(index % events.length) + 1} / ${events.length}`}</span>
            <button type="button" className="cr-arrow" aria-label="ไฮไลต์ก่อนหน้า" onClick={() => go(-1)}>
              <Chevron d="M14.5 6l-6 6 6 6" />
            </button>
            <button type="button" className="cr-arrow" aria-label="ไฮไลต์ถัดไป" onClick={() => go(1)}>
              <Chevron d="M9.5 6l6 6-6 6" />
            </button>
          </div>
        ) : null}
      </div>
      <div className="mn-ev-wrap">
        <Link
          to={eventPath(e)}
          aria-label={`เปิด ${e.title}`}
          className="mn-ev-pic"
          style={e.cover_url ? { backgroundImage: `url(${JSON.stringify(proxiedImageUrl(e.cover_url, 1200))})` } : undefined}
        />
        <div className="mn-ev-info">
          <p className="mn-ev-kind">
            <span>{EVENT_KIND[e.category] ?? EVENT_KIND.other}</span>
            <i aria-hidden="true" />
            <span className="mn-ev-status" data-live={live ? "" : undefined}>
              {live ? (daysLeft !== null ? `ON NOW · จบใน ${daysLeft} วัน` : "ON NOW") : "COMING SOON"}
            </span>
          </p>
          <h3>{e.title}</h3>
          {e.starts_on ? (
            <p className="mn-ev-dates">{end && end !== e.starts_on ? `${fullDate(e.starts_on)} – ${fullDate(end)}` : fullDate(e.starts_on)}</p>
          ) : null}
          {places.length ? (
            <div className="mn-ev-chips">
              <button type="button" className="mn-ev-pill" aria-expanded={venuesOpen} onClick={() => setVenuesOpen((v) => !v)}>
                <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#282929" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11z" />
                  <circle cx="12" cy="10" r="2.3" />
                </svg>
                {places.length > 1 ? `${places[0].title} + อีก ${places.length - 1} แห่ง` : places[0].title}
              </button>
            </div>
          ) : null}
          {venuesOpen ? (
            <ol className="mn-ev-venues">
              {places.map((p, i) => (
                <li key={p.id}>
                  <span>{i + 1}</span>
                  <span>{p.title}</span>
                </li>
              ))}
            </ol>
          ) : null}
          <div className="mn-ev-acts">
            {places.length ? (
              <Link to={`${eventPath(e)}/locations`} className="mn-ev-route">
                <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="6" cy="18" r="2.5" />
                  <circle cx="18" cy="6" r="2.5" />
                  <path d="M8.5 18H15a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h6.5" />
                </svg>
                ดูเส้นทาง
              </Link>
            ) : null}
            <button
              type="button"
              className="mn-ev-save"
              aria-pressed={interested}
              onClick={() => (user ? toggle.mutate(e.id) : navigate(SC_LINKS.login))}
            >
              <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" stroke="#282929" strokeWidth="1.5" strokeLinejoin="round">
                <path d="M6 3h12v18l-6-4.5L6 21z" />
              </svg>
              {interested ? "สนใจแล้ว" : "สนใจ"}
            </button>
            <button type="button" className="mn-ev-share" aria-label="แชร์ (คัดลอกลิงก์)" onClick={() => void share()}>
              <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#282929" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="18" cy="5.5" r="2.5" />
                <circle cx="6" cy="12" r="2.5" />
                <circle cx="18" cy="18.5" r="2.5" />
                <path d="M8.2 10.8l7.6-4.1M8.2 13.2l7.6 4.1" />
              </svg>
            </button>
            <span role="status" aria-hidden={!copied} className="mn-ev-copied" data-on={copied ? "" : undefined}>
              คัดลอกลิงก์แล้ว
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

function EventList({ events, byDay, today }: { events: HomeEventRow[]; byDay: boolean; today: string }) {
  const groups = useMemo(() => {
    if (!byDay) return [{ day: today, items: events }];
    const map = new Map<string, HomeEventRow[]>();
    for (const e of events) map.set(e.starts_on!, [...(map.get(e.starts_on!) ?? []), e]);
    return [...map.entries()].map(([day, items]) => ({ day, items }));
  }, [events, byDay, today]);

  const first = groups[0].day;
  // the first two days start open, as in the mock
  const [closed, setClosed] = useState<Record<string, boolean>>({});
  const isOpen = (day: string, i: number) => !(closed[day] ?? i > 1);

  return (
    <section aria-label="อีเว้นท์" className="mn-ev-list">
      <div className="mn-ev-month">
        <span lang="en">{monthCaps(first)}</span>
      </div>
      <div className="mn-ev-days">
        {groups.map((g, i) => (
          <div className="mn-ev-group" key={g.day}>
            {byDay ? (
              <button type="button" className="mn-ev-day" aria-expanded={isOpen(g.day, i)} onClick={() => setClosed((c) => ({ ...c, [g.day]: isOpen(g.day, i) }))}>
                <span lang="en">{g.day.slice(0, 7) === first.slice(0, 7) ? weekdayDay(g.day) : `${weekdayDay(g.day)} ${monthCaps(g.day)}`}</span>
                <svg aria-hidden="true" width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="#282929" strokeWidth="1">
                  <path d="M14 25V3M5 12l9-9 9 9" />
                </svg>
              </button>
            ) : null}
            {!byDay || isOpen(g.day, i) ? (
              <div className="mn-ev-grid">
                {g.items.map((e) => (
                  <div className="mn-ev-cell" key={e.id}>
                    <EventItem event={e} untilEnd={!byDay} />
                  </div>
                ))}
                {Array.from({ length: (3 - (g.items.length % 3)) % 3 }, (_, k) => (
                  <div className="mn-ev-cell" data-empty="" key={`empty-${k}`}>
                    <svg aria-hidden="true" viewBox="0 0 100 100" preserveAspectRatio="none">
                      <line x1="0" y1="100" x2="100" y2="0" stroke="#C8C8C5" strokeWidth="1" vectorEffect="non-scaling-stroke" />
                    </svg>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ))}
        <div className="mn-ev-end" />
      </div>
    </section>
  );
}

function EventItem({ event: e, untilEnd }: { event: HomeEventRow; untilEnd: boolean }) {
  const openCall = e.category === "open_call";
  const end = lastDay(e);
  const when = openCall
    ? end ? `ปิดรับ ${shortDate(end)}` : ""
    : untilEnd
      ? end ? `ถึง ${shortDate(end)}` : (e.time_note ?? "")
      : e.time_note?.trim() || (end && end !== e.starts_on ? `ถึง ${shortDate(end)}` : "");

  return (
    <Link to={eventPath(e)} className="mn-ev-item">
      {e.cover_url ? (
        <img alt="" src={proxiedImageUrl(e.cover_url, 640)} loading="lazy" decoding="async" />
      ) : (
        <span aria-hidden="true" className="mn-ev-noimg" />
      )}
      <span className="mn-ev-meta">
        {openCall ? <span aria-hidden="true" className="mn-ev-dot" /> : null}
        {EVENT_KIND[e.category] ?? EVENT_KIND.other}
        {e.origin === "curated" ? <span className="mn-ev-tag">CURATED BY SAMECOR</span> : null}
      </span>
      <span className="mn-ev-title">{e.title}</span>
      <span className="mn-ev-ww">
        <span>{when}</span>
        <span>{e.location_name?.trim() || e.area?.trim() || ""}</span>
      </span>
    </Link>
  );
}
