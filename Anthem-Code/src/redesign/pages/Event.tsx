import { useEffect, useLayoutEffect, useMemo, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import SeoHead from "@/components/SeoHead";
import { useAuth } from "@/hooks/useAuth";
import { useMyEventInterests } from "@/hooks/useExhibitionEvents";
import { eventJsonLd } from "@/lib/eventJsonLd";
import { deadlineLabel, eventPath, isEventUuid, parseEventInsights } from "@/lib/exhibitionEvents";
import { googleCalendarLink } from "@/lib/googleCalendarLink";
import { reportEvent } from "@/server/mutations/eventPage";
import { toggleEventInterest } from "@/server/mutations/eventInterest";
import type { EventPageRow, EventPageVenue } from "@/server/queries/eventPage";
import { SC_LINKS } from "../routes";
import { useShellPanels } from "../shell/panels";
import { closingDay, feeLabel, paragraphs, siteLabel, summaryRows } from "../event/eventSummary";
import { useCountEventView, useEventPage, useEventVenues, useParentEvent } from "../event/useEventPage";
import EventPictures from "../event/EventPictures";
import Locations from "../event/Locations";
import { thaiHours } from "../event/venueText";
import { EVENT_KIND, shortDate } from "../main/useHomeEvents";
import NotFound from "./NotFound";
import "../styles/fonts.css";
import "../styles/tokens.css";
import "../styles/reset.css";
import "../styles/event.css";

const REPORT_WHYS = [
  ["wrong", "ข้อมูลผิด"],
  ["link", "ลิงก์เสีย"],
  ["closed", "ปิดรับแล้ว"],
  ["other", "อื่นๆ"],
] as const;

/** "26 Oct – 30 Nov 2026" / "29 Oct 2026 – 28 Feb 2027" (mock). */
function dateRange(start: string | null, end: string | null): string {
  if (!start) return "";
  if (!end || end === start) return shortDate(start, true);
  return `${shortDate(start, start.slice(0, 4) !== end.slice(0, 4))} – ${shortDate(end, true)}`;
}

const Icon = ({ d, children }: { d?: string; children?: ReactNode }) => (
  <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.33" strokeLinecap="round" strokeLinejoin="round">
    {d ? <path d={d} /> : children}
  </svg>
);
const Crumb = () => (
  <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#A3A3A0" strokeWidth="1.33" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9.5 6l6 6-6 6" />
  </svg>
);
const CalIcon = () => (
  <Icon>
    <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
    <path d="M3.5 10h17M8 3v4M16 3v4" />
  </Icon>
);

/** `/exhibition/:id` — an event or a venue, by id or slug (old URLs kept). */
export default function EventPage() {
  const { id } = useParams();
  return <EventView key={id} slug={id ?? ""} />;
}

function EventView({ slug }: { slug: string }) {
  const q = useEventPage(slug);
  const e = q.data ?? null;
  const venuesQ = useEventVenues(e && !e.parent_id ? e.id : undefined);
  const parentQ = useParentEvent(e?.parent_id);
  useCountEventView(e?.id, e?.status === "published");

  if (q.isPending) return <main className="sc-main ev-wait" aria-busy="true" />;
  if (!e) return q.isError ? <main className="sc-main ev-wait" /> : <NotFound />;
  // A uuid URL moves to the slug URL, like the old page.
  if (isEventUuid(slug) && e.slug) return <Navigate to={eventPath(e)} replace />;
  return <EventBody event={e} venues={venuesQ.data ?? []} parent={parentQ.data ?? null} />;
}

function EventBody({ event: e, venues, parent }: { event: EventPageRow; venues: EventPageVenue[]; parent: { id: string; slug: string | null; title: string } | null }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();
  const panels = useShellPanels();
  const insights = useMemo(() => parseEventInsights(e.insights), [e.insights]);
  const multi = venues.length > 0;
  const rows = multi ? [] : summaryRows(insights, e.category);
  const about = paragraphs(e.description);
  const openCall = e.category === "open_call";
  const path = eventPath(e);
  const url = typeof window === "undefined" ? path : window.location.origin + path;

  const [toast, setToast] = useState("");
  const toastTimer = useRef<number | undefined>(undefined);
  const say = (t: string) => {
    window.clearTimeout(toastTimer.current);
    setToast(t);
    toastTimer.current = window.setTimeout(() => setToast(""), 2200);
  };
  useEffect(() => () => window.clearTimeout(toastTimer.current), []);

  // ---------- สนใจ ----------
  const ids = useMemo(() => [e.id], [e.id]);
  const { data: mine } = useMyEventInterests(ids);
  const [picked, setPicked] = useState<boolean | null>(null);
  const interested = picked ?? !!mine?.has(e.id);
  const toggle = useMutation({
    mutationFn: toggleEventInterest,
    onSuccess: (on) => {
      setPicked(on);
      say(on ? "เก็บไว้ใน Interested · เห็นแค่คุณ" : "เอาออกจาก Interested แล้ว");
    },
    onError: () => {
      setPicked(null);
      say("บันทึกไม่สำเร็จ");
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ["events", "my-interests"] });
      void qc.invalidateQueries({ queryKey: ["events", "stats"] });
      void qc.invalidateQueries({ queryKey: ["events", "my-list"] });
    },
  });
  const onSave = () => {
    if (!user) return navigate(SC_LINKS.login);
    setPicked(!interested);
    toggle.mutate(e.id);
  };

  const share = async () => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      /* clipboard blocked: the toast still confirms the action like the mock */
    }
    say("คัดลอกลิงก์แล้ว");
  };

  // ---------- About: "อ่านต่อ" only when the text is longer than the closed box ----------
  const aboutRef = useRef<HTMLDivElement>(null);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [aboutLong, setAboutLong] = useState(false);
  useLayoutEffect(() => {
    const el = aboutRef.current;
    if (el) setAboutLong(el.scrollHeight > 96);
  }, [e.description]);

  // ---------- แจ้งปัญหา ----------
  const [repOpen, setRepOpen] = useState(false);
  const [repWhy, setRepWhy] = useState<string | null>(null);
  const [repSent, setRepSent] = useState(false);
  const report = useMutation({
    mutationFn: (label: string) => reportEvent(e.id, e.owner_id, label),
    onSuccess: () => {
      setRepOpen(false);
      setRepSent(true);
      say("ส่งรายงานแล้ว ทีมงานจะตรวจสอบ");
    },
    onError: (err) => say(err instanceof Error && err.message ? err.message : "ส่งไม่สำเร็จ"),
  });
  const openReport = () => {
    if (repSent) return;
    if (!user) return navigate(SC_LINKS.login);
    setRepWhy(null);
    setRepOpen(true);
  };

  // ---------- back: one step back inside the site, else the event (venue) or the Event tab ----------
  const backTo = parent ? eventPath(parent) : SC_LINKS.events;
  const goBack = (ev: MouseEvent<HTMLAnchorElement>) => {
    if (((window.history.state as { idx?: number } | null)?.idx ?? 0) > 0) {
      ev.preventDefault();
      navigate(-1);
    }
  };

  // ---------- facts ----------
  const time = e.time_note?.trim() || (multi ? "เวลาเปิดแต่ละสถานที่ไม่เท่ากัน" : thaiHours(e.opening_hours as never) || e.hours_note?.trim() || "ไม่ระบุเวลา");
  const place = multi
    ? venues.length > 1
      ? `${venues[0].name_en?.trim() || venues[0].title} + อีก ${venues.length - 1} แห่ง`
      : venues[0].title
    : e.location_name?.trim() || e.address?.trim() || "";
  const placeNote = multi ? "" : e.location_note?.trim() || (e.location_name?.trim() ? e.address?.trim() : "") || "";
  const ctaHref = e.registration_url || e.ticket_url || e.website_url || e.source_url || null;
  const ctaLabel = openCall || e.registration_url || e.ticket_url ? "ไปสมัครที่เว็บผู้จัด" : "ไปเว็บไซต์งาน";
  const site = siteLabel(e.website_url || e.registration_url || e.source_url);
  const gcal = googleCalendarLink({
    title: e.title,
    starts_on: e.starts_on,
    ends_on: e.ends_on,
    description: e.description,
    location_name: e.location_name,
    location_note: e.location_note,
    url,
  });
  const files = multi ? [] : (insights?.links ?? []).filter((l) => l.kind === "download" || l.kind === "rules").slice(0, 2);
  const closes = openCall ? closingDay(insights, e.ends_on, e.starts_on) : null;
  const closesLabel = closes ? deadlineLabel(closes, new Date(), "th") : null;

  // ---------- pictures: the cover and the extra pictures, one slider (owner 2026-11-28) ----------
  const pictures = [e.cover_url, ...(e.gallery_urls ?? [])].filter((u, i, all): u is string => !!u && all.indexOf(u) === i);
  const size = (src: string): [number, number] | null => {
    const s = src === e.cover_url && e.cover_width && e.cover_height ? ([e.cover_width, e.cover_height] as [number, number]) : e.media_sizes?.[src];
    return s && s[0] > 0 && s[1] > 0 ? s : null;
  };

  const jsonLd = useMemo(
    () =>
      e.status === "published" && typeof window !== "undefined"
        ? eventJsonLd(e, { origin: window.location.origin, description: e.description || e.title, venues, parent })
        : undefined,
    [e, venues, parent],
  );

  return (
    <>
      <SeoHead
        title={e.title}
        description={(e.description || e.title).slice(0, 160)}
        path={path}
        image={e.cover_url ?? undefined}
        noindex={e.status !== "published"}
        jsonLd={jsonLd}
      />
      <main className="sc-main ev-m">
        <nav aria-label="เส้นทาง" className="ev-crumb">
          <Link to={backTo} aria-label="ย้อนกลับ" className="ev-cc ev-back" onClick={goBack}>
            <Icon d="M19 12H5M11 6l-6 6 6 6" />
          </Link>
          <Link to={SC_LINKS.home} className="ev-cr">Home</Link>
          <Crumb />
          <Link to={SC_LINKS.events} className="ev-cr">Event</Link>
          <Crumb />
          {parent ? (
            <>
              <Link to={eventPath(parent)} className="ev-cr ev-cr-parent">{parent.title}</Link>
              <Crumb />
            </>
          ) : null}
          <span aria-current="page">{e.title}</span>
          <button type="button" className="sc-cal-pill ev-pl" lang="en" aria-haspopup="dialog" onClick={(ev) => panels.openCalendar(ev.currentTarget)}>
            <CalIcon />
            Calendar
          </button>
        </nav>

        <div className="ev-grid">
          <article className="ev-card">
            <EventPictures pictures={pictures} title={e.title} size={size} />

            {about.length ? (
              <section aria-labelledby="ev-ab" className="ev-sec ev-about">
                <h2 id="ev-ab">About</h2>
                <div className="ev-sec-body">
                  <div id="ev-ab-body" ref={aboutRef} className="ev-ab-text" data-closed={aboutLong && !aboutOpen ? "" : undefined}>
                    {about.map((p, i) => (
                      <p key={i}>{p}</p>
                    ))}
                  </div>
                  {aboutLong ? (
                    <button type="button" className="ev-more" aria-expanded={aboutOpen} aria-controls="ev-ab-body" onClick={() => setAboutOpen((v) => !v)}>
                      {aboutOpen ? "ย่อลง" : "อ่านต่อ"}
                      <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#282929" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M6 9.5l6 6 6-6" />
                      </svg>
                    </button>
                  ) : null}
                </div>
              </section>
            ) : null}

            {rows.length ? (
              <section aria-labelledby="ev-sm" className="ev-sec ev-sum">
                <div className="ev-sum-hd">
                  <h2 id="ev-sm">
                    Summary
                    <br />
                    <span>by SAMECOR</span>
                  </h2>
                  {closes && closesLabel ? (
                    <span className="ev-close">
                      <i aria-hidden="true" />
                      {`${closesLabel} · ${shortDate(closes, true)}`}
                    </span>
                  ) : null}
                </div>
                <div className="ev-rows">
                  {rows.map((r) => (
                    <div key={r.key}>
                      <h3 lang="en">{r.title}</h3>
                      <ul data-numbered={r.numbered ? "" : undefined}>
                        {r.items.map((it, i) => (
                          <li key={i}>
                            <span aria-hidden={r.numbered ? undefined : "true"}>{r.numbered ? i + 1 : null}</span>
                            <span>{it}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}
          </article>

          <aside aria-label="ข้อมูลงาน" className="ev-aside">
            <div className="ev-head">
              <p className="ev-kind" lang="en">
                <span data-open-call={openCall ? "" : undefined}>{EVENT_KIND[e.category] ?? EVENT_KIND.other}</span>
                {e.origin === "curated" ? (
                  <>
                    <i aria-hidden="true" />
                    <span>CURATED BY SAMECOR</span>
                  </>
                ) : null}
              </p>
              <h1>{e.title}</h1>
              <div className="ev-acts">
                <button type="button" className="ev-save" aria-pressed={interested} aria-label={interested ? "สนใจแล้ว" : "สนใจ"} onClick={onSave}>
                  <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.33" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 3h12v18l-6-4.5L6 21z" />
                  </svg>
                  <span>{interested ? "สนใจแล้ว" : "สนใจ"}</span>
                </button>
                <button type="button" className="ev-cc ev-share" aria-label="แชร์ คัดลอกลิงก์" title="คัดลอกลิงก์" onClick={() => void share()}>
                  <Icon>
                    <circle cx="18" cy="5.5" r="2.5" />
                    <circle cx="6" cy="12" r="2.5" />
                    <circle cx="18" cy="18.5" r="2.5" />
                    <path d="M8.2 10.8l7.6-4.1M8.2 13.2l7.6 4.1" />
                  </Icon>
                </button>
              </div>
            </div>

            <div className="ev-facts">
              {e.starts_on ? (
                <div>
                  <span className="ev-ic">
                    <CalIcon />
                  </span>
                  <div>
                    <span>{dateRange(e.starts_on, e.ends_on)}</span>
                    <span className="ev-sub">{time}</span>
                    {gcal ? (
                      <a href={gcal} target="_blank" rel="noopener noreferrer" className="ev-gcal">
                        เพิ่มลง Google Calendar ↗
                      </a>
                    ) : null}
                  </div>
                </div>
              ) : null}
              {place ? (
                <div>
                  <span className="ev-ic">
                    <Icon>
                      <path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11z" />
                      <circle cx="12" cy="10" r="2.3" />
                    </Icon>
                  </span>
                  <div>
                    <span>{place}</span>
                    {placeNote ? <span className="ev-sub">{placeNote}</span> : null}
                  </div>
                </div>
              ) : null}
              <div>
                <span className="ev-ic">
                  <Icon>
                    <path d="M3.5 7.5h17v3a1.5 1.5 0 0 0 0 3v3h-17v-3a1.5 1.5 0 0 0 0-3z" />
                    <path d="M14 7.5v9" strokeDasharray="1.5 2" />
                  </Icon>
                </span>
                <div>
                  <span>{feeLabel(e.fee_type, e.fee_note)}</span>
                </div>
              </div>
              {site ? (
                <div>
                  <span className="ev-ic">
                    <Icon>
                      <circle cx="12" cy="12" r="8.5" />
                      <path d="M3.5 12h17M12 3.5c2.5 2.6 2.5 14.4 0 17M12 3.5c-2.5 2.6-2.5 14.4 0 17" />
                    </Icon>
                  </span>
                  <div>
                    <span>{site}</span>
                  </div>
                </div>
              ) : null}
            </div>

            {ctaHref || files.length ? (
              <div className="ev-act">
                {ctaHref ? (
                  <a href={ctaHref} className="ev-cta" target="_blank" rel="noopener noreferrer">
                    {ctaLabel}
                    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="1.33" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
                    </svg>
                  </a>
                ) : null}
                {files.map((l) => (
                  <a key={l.url} href={l.url} target="_blank" rel="noopener noreferrer" className="ev-file">
                    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.33" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 11.5l-8 8a5 5 0 0 1-7-7l8.5-8.5a3.3 3.3 0 0 1 4.7 4.7L9.7 17.2a1.7 1.7 0 0 1-2.4-2.4L15 7" />
                    </svg>
                    {l.label}
                  </a>
                ))}
              </div>
            ) : null}

            {e.organizer_name?.trim() ? (
              <div className="ev-org">
                <span lang="en">ORGANIZER</span>
                <span>{e.organizer_name.trim()}</span>
              </div>
            ) : null}

            {repOpen ? (
              <div role="group" aria-label="แจ้งปัญหางานนี้" className="ev-rep">
                <span>แจ้งปัญหางานนี้</span>
                <div className="ev-rep-whys">
                  {REPORT_WHYS.map(([k, label]) => (
                    <button key={k} type="button" aria-pressed={repWhy === k} onClick={() => setRepWhy(k)}>
                      {label}
                    </button>
                  ))}
                </div>
                <div className="ev-rep-ft">
                  <button type="button" className="ev-rep-cancel" onClick={() => setRepOpen(false)}>
                    ยกเลิก
                  </button>
                  <button
                    type="button"
                    className="ev-rep-send"
                    aria-disabled={!repWhy || report.isPending}
                    onClick={() => {
                      const label = REPORT_WHYS.find(([k]) => k === repWhy)?.[1];
                      if (label && !report.isPending) report.mutate(label);
                    }}
                  >
                    ส่ง
                  </button>
                </div>
              </div>
            ) : (
              <button type="button" className="ev-rep-open" aria-expanded="false" onClick={openReport}>
                <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.33" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 21V4M5 4h12l-2 4 2 4H5" />
                </svg>
                {repSent ? "แจ้งแล้ว · ทีมงานกำลังตรวจ" : "แจ้งปัญหางานนี้"}
              </button>
            )}
          </aside>
        </div>
        {/* Venues of a multi-venue event (mock: dc-import Locations embedded). */}
        {multi ? (
          <div className="ev-locs">
            <Locations event={e} venues={venues} onToast={say} />
          </div>
        ) : null}
      </main>
      {toast ? (
        <div role="status" className="ev-toast">
          {toast}
        </div>
      ) : null}
    </>
  );
}
