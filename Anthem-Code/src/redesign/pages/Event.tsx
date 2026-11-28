import { useEffect, useLayoutEffect, useMemo, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import SeoHead from "@/components/SeoHead";
import { useAuth } from "@/hooks/useAuth";
import { useEventStats, useMyEventInterests } from "@/hooks/useExhibitionEvents";
import { eventJsonLd } from "@/lib/eventJsonLd";
import { deadlineLabel, eventPath, isEventUuid, parseEventInsights } from "@/lib/exhibitionEvents";
import { venueMapsUrl, type OpeningHoursRule } from "@/lib/eventVenues";
import { googleCalendarLink } from "@/lib/googleCalendarLink";
import { proxiedImageUrl } from "@/lib/imageProxy";
import { recordEventRegistration, reportEvent } from "@/server/mutations/eventPage";
import { toggleEventInterest } from "@/server/mutations/eventInterest";
import type { EventPageRow, EventPageVenue, ParentEventRow } from "@/server/queries/eventPage";
import { loginHref } from "../lib/loginHref";
import { SC_LINKS } from "../routes";
import LoadError from "../shell/LoadError";
import { useShellPanels } from "../shell/panels";
import { closingDay, feeLabel, mainAction, mapsSearchUrl, paragraphs, placeNames, siteLabel, summaryRows } from "../event/eventSummary";
import { useCountEventView, useEventPage, useEventVenues, useParentEvent } from "../event/useEventPage";
import EventPictures from "../event/EventPictures";
import EventWorks from "../event/EventWorks";
import Locations from "../event/Locations";
import SponsorOffer from "../event/SponsorOffer";
import { thaiHours, venueStatus } from "../event/venueText";
import { usePosterLabel } from "../event/usePosterLabel";
import { EVENT_KIND, isoDay, shortDate } from "../main/useHomeEvents";
import { useInterestedSwitch } from "../profile/useMyProfile";
import SharePanel from "../work/SharePanel";
import NotFound from "./NotFound";
import "../styles/fonts.css";
import "../styles/tokens.css";
import "../styles/reset.css";
import "../styles/work.css";
import "../styles/event.css";

/** Unpublished events (only the owner and the team can open them): same words as My Studio › Event. */
const STATUS_LABEL: Record<string, string> = { draft: "Draft", pending: "In review", needs_revision: "Needs edit", rejected: "Rejected" };

const COMPACT = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });

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
  if (!e)
    return q.isError ? (
      <main className="sc-main ev-wait">
        <LoadError onRetry={() => void q.refetch()} />
      </main>
    ) : (
      <NotFound />
    );
  // A uuid URL moves to the slug URL, like the old page.
  if (isEventUuid(slug) && e.slug) return <Navigate to={eventPath(e)} replace />;
  return <EventBody event={e} venues={venuesQ.data ?? []} parent={parentQ.data ?? null} />;
}

function EventBody({ event: e, venues, parent }: { event: EventPageRow; venues: EventPageVenue[]; parent: ParentEventRow | null }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();
  const panels = useShellPanels();
  const insights = useMemo(() => parseEventInsights(e.insights), [e.insights]);
  const multi = venues.length > 0;
  const rows = multi ? [] : summaryRows(insights, e.category);
  const about = paragraphs(e.description);
  const openCall = e.category === "open_call";
  const poster = usePosterLabel(e.origin, e.owner_id);
  const path = eventPath(e);
  const url = typeof window === "undefined" ? path : window.location.origin + path;
  const published = e.status === "published";
  const isOwner = !!user && user.id === e.owner_id;
  // Team-run events are owned by an admin account, so only a member's own event gets a profile link and a chat (old page).
  const community = e.origin === "community";
  const lastDay = e.ends_on ?? e.starts_on;
  const over = !!lastDay && lastDay < isoDay(new Date());
  const venue = !!e.parent_id;

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
  const shown = useInterestedSwitch(user?.id);
  const [picked, setPicked] = useState<boolean | null>(null);
  const interested = picked ?? !!mine?.has(e.id);
  // How many people are interested (old EventActions), moved by this person's own tap until the counts refetch.
  const { data: stats } = useEventStats(ids);
  const interestCount = Math.max(0, (stats?.[e.id]?.interest_count ?? 0) + (interested ? 1 : 0) - (mine?.has(e.id) ? 1 : 0));
  const toggle = useMutation({
    mutationFn: toggleEventInterest,
    onSuccess: (on) => {
      setPicked(on);
      // Follows the person's Interested switch (MyProfile → Events, default "เห็นแค่คุณ").
      say(on ? `เก็บไว้ใน Interested · ${shown.on ? "ทุกคนเห็น" : "เห็นแค่คุณ"}` : "เอาออกจาก Interested แล้ว");
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
    if (!user) return navigate(loginHref());
    setPicked(!interested);
    toggle.mutate(e.id);
  };

  // Share: the Work page's panel (preview, link + Copy, apps), so a blocked clipboard still leaves the link to copy.
  const [shareOpen, setShareOpen] = useState(false);

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
    if (!user) return navigate(loginHref());
    setRepWhy(null);
    setRepOpen(true);
  };

  // ---------- main button: a signed-in click on a published event is recorded (old page → My Profile › Events) ----------
  const onRegister = () => {
    if (!user || !published) return;
    void recordEventRegistration(e.id)
      .then(() => qc.invalidateQueries({ queryKey: ["events", "my-list"] }))
      .catch(() => undefined);
  };

  // ---------- organiser: profile / site, ทักทาย, sponsors (old page) ----------
  const orgName = e.organizer_name?.trim() || (community ? "ผู้จัดงาน" : "");
  const orgSite = [e.website_url].find((u): u is string => !!u && /^https?:\/\//i.test(u)) ?? null;
  const canChat = community && published && !isOwner;
  const openForSponsors = !!e.open_for_sponsors && !over;
  const canSponsor = openForSponsors && published && !isOwner;
  const [sponsorOpen, setSponsorOpen] = useState(false);
  const greet = (el: HTMLElement) => {
    if (!user) return navigate(loginHref());
    void panels.openChat({ otherId: e.owner_id }, el).catch((err: unknown) => say(err instanceof Error && err.message ? err.message : "เปิดแชทไม่สำเร็จ ลองอีกครั้ง"));
  };
  const offerSponsor = () => {
    if (!user) return navigate(loginHref());
    setSponsorOpen(true);
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
  // Each place opens its Google Maps page in a new tab (owner 2026-11-28); one place also sends its address.
  const placeLinks = multi ? [] : placeNames(e.location_name);
  const mapsQuery = (name: string) => (placeLinks.length === 1 && e.address?.trim() ? `${name}, ${e.address.trim()}` : name);
  // A venue without a place name: its address opens the venue's own pin (old page: venueMapsUrl).
  const venueMap =
    venue && !placeLinks.length && place
      ? venueMapsUrl({ title: e.title, name_en: e.name_en, address: e.address, lat: e.lat, lng: e.lng, coords_approx: e.coords_approx ?? false })
      : null;
  // Main button: hidden once the event is over / the call has closed (old page, registration_open); a line says so instead.
  const action = mainAction(e, insights, isoDay(new Date()));
  const siteUrl = e.website_url || e.registration_url || e.source_url || "";
  const site = siteLabel(siteUrl);
  // A venue's own page (old page): open-now chip, date note, how to get there, its admission note.
  const openNow = venue
    ? venueStatus({ opening_hours: (Array.isArray(e.opening_hours) ? e.opening_hours : []) as OpeningHoursRule[], starts_on: e.starts_on, ends_on: e.ends_on, date_note: e.date_note })
    : null;
  const dates = e.starts_on ? dateRange(e.starts_on, e.ends_on) : venue ? e.date_note?.trim() || "" : "";
  const fee = (venue && e.admission_note?.trim()) || feeLabel(e.fee_type, e.fee_note);
  const transit = venue ? e.transit_note?.trim() || "" : "";
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
  const own = [e.cover_url, ...(e.gallery_urls ?? [])].filter((u, i, all): u is string => !!u && all.indexOf(u) === i);
  // A venue with no picture of its own shows its event's cover (old page).
  const pictures = own.length ? own : parent?.cover_url ? [parent.cover_url] : [];
  const size = (src: string): [number, number] | null => {
    const s = src === e.cover_url && e.cover_width && e.cover_height ? ([e.cover_width, e.cover_height] as [number, number]) : e.media_sizes?.[src];
    return s && s[0] > 0 && s[1] > 0 ? s : null;
  };

  const firstSize = pictures[0] ? size(pictures[0]) : null;
  const shareRatio = firstSize ? firstSize[0] / firstSize[1] : null;

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

        {published ? null : (
          <div className="ev-draft" role="status">
            <span className="ev-draft-st" lang="en">
              {STATUS_LABEL[e.status] ?? "Draft"}
            </span>
            <span>หน้านี้มีแค่คุณกับทีมงานที่เห็น จนกว่าจะขึ้นเว็บนะ</span>
            {isOwner ? (
              <Link to={`/dashboard/exhibition/${e.id}/edit`} className="ev-draft-edit">
                แก้ไข
              </Link>
            ) : null}
            {(e.status === "needs_revision" || e.status === "rejected") && e.review_note?.trim() ? <span className="ev-draft-note">ทีมงาน: {e.review_note.trim()}</span> : null}
          </div>
        )}

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
                {poster ? (
                  <>
                    <i aria-hidden="true" />
                    <span>{poster}</span>
                  </>
                ) : null}
              </p>
              <h1>{e.title}</h1>
              {venue && e.name_en?.trim() && e.name_en.trim().toLowerCase() !== e.title.trim().toLowerCase() ? (
                <p className="ev-en" lang="en">
                  {e.name_en.trim()}
                </p>
              ) : null}
              {/* Interested and share only on a published event: nobody else can open a draft. */}
              {published ? (
              <div className="ev-acts">
                <button
                  type="button"
                  className="ev-save"
                  aria-pressed={interested}
                  aria-label={`${interested ? "สนใจแล้ว" : "สนใจ"}${interestCount ? ` · ${interestCount} คนสนใจ` : ""}`}
                  onClick={onSave}
                >
                  <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.33" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 3h12v18l-6-4.5L6 21z" />
                  </svg>
                  <span>{interested ? "สนใจแล้ว" : "สนใจ"}</span>
                  {interestCount ? <span className="ev-save-n">{COMPACT.format(interestCount)}</span> : null}
                </button>
                <button type="button" className="ev-cc ev-share" aria-label="แชร์" title="แชร์" aria-haspopup="dialog" onClick={() => setShareOpen(true)}>
                  <Icon>
                    <circle cx="18" cy="5.5" r="2.5" />
                    <circle cx="6" cy="12" r="2.5" />
                    <circle cx="18" cy="18.5" r="2.5" />
                    <path d="M8.2 10.8l7.6-4.1M8.2 13.2l7.6 4.1" />
                  </Icon>
                </button>
              </div>
              ) : null}
            </div>

            <div className="ev-facts">
              {dates ? (
                <div>
                  <span className="ev-ic">
                    <CalIcon />
                  </span>
                  <div>
                    <span>{dates}</span>
                    <span className="ev-sub">{time}</span>
                    {openNow ? (
                      <span className="ev-st" data-k={openNow.kind}>
                        <i aria-hidden="true" />
                        {openNow.label}
                      </span>
                    ) : null}
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
                    {placeLinks.length ? (
                      <span>
                        {placeLinks.map((n, i) => (
                          <span key={`${n}-${i}`}>
                            <a href={mapsSearchUrl(mapsQuery(n))} target="_blank" rel="noopener noreferrer" className="ev-maplink" aria-label={`${n} — เปิดใน Google Maps`}>
                              {n} ↗
                            </a>
                            {i < placeLinks.length - 1 ? " · " : null}
                          </span>
                        ))}
                      </span>
                    ) : venueMap ? (
                      <span>
                        <a href={venueMap} target="_blank" rel="noopener noreferrer" className="ev-maplink" aria-label={`${place} — เปิดใน Google Maps`}>
                          {place} ↗
                        </a>
                      </span>
                    ) : (
                      <span>{place}</span>
                    )}
                    {placeNote ? <span className="ev-sub">{placeNote}</span> : null}
                  </div>
                </div>
              ) : null}
              {transit ? (
                <div>
                  <span className="ev-ic">
                    <Icon>
                      <rect x="5.5" y="3.5" width="13" height="13" rx="3" />
                      <path d="M5.5 10.5h13M9 13.5h.01M15 13.5h.01M8.5 20.5l2-4M15.5 20.5l-2-4" />
                    </Icon>
                  </span>
                  <div>
                    <span className="ev-sub">วิธีเดินทาง</span>
                    <span>{transit}</span>
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
                  <span>{fee}</span>
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
                    <span>
                      <a href={siteUrl} target="_blank" rel="noopener noreferrer nofollow" className="ev-maplink">
                        {site} ↗
                      </a>
                    </span>
                  </div>
                </div>
              ) : null}
            </div>

            {action || files.length ? (
              <div className="ev-act">
                {action?.kind === "go" ? (
                  <a href={action.href} className="ev-cta" target="_blank" rel="noopener noreferrer nofollow" onClick={action.counts ? onRegister : undefined}>
                    {action.label}
                    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="1.33" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
                    </svg>
                  </a>
                ) : action ? (
                  <p className="ev-done" data-k={action.kind}>
                    {action.label}
                  </p>
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

            {orgName ? (
              <div className="ev-org">
                <span lang="en">ORGANIZER</span>
                <span>
                  {community ? (
                    <Link to={`/u/${e.owner_id}`} className="ev-maplink">
                      {orgName}
                    </Link>
                  ) : orgSite ? (
                    <a href={orgSite} target="_blank" rel="noopener noreferrer nofollow" className="ev-maplink">
                      {orgName} ↗
                    </a>
                  ) : (
                    orgName
                  )}
                </span>
                {canChat ? (
                  <button type="button" className="ev-greet" onClick={(ev) => greet(ev.currentTarget)}>
                    ทักทาย
                  </button>
                ) : null}
              </div>
            ) : null}

            {e.sponsors?.length || openForSponsors ? (
              <section className="ev-spon" aria-labelledby="ev-sp-h">
                <h2 id="ev-sp-h" lang="en">
                  SPONSORED BY
                </h2>
                {e.sponsors?.length ? (
                  <ul>
                    {e.sponsors.map((sp, i) => (
                      <li key={`${sp.name}-${i}`}>
                        {sp.logo_url ? (
                          <img src={proxiedImageUrl(sp.logo_url, 120)} alt={`โลโก้ ${sp.name}`} className="ev-spon-logo" loading="lazy" />
                        ) : (
                          <span aria-hidden="true" className="ev-spon-logo">
                            {sp.name.slice(0, 1).toUpperCase()}
                          </span>
                        )}
                        <span className="ev-spon-tx">
                          <span>{sp.name}</span>
                          {sp.note ? <span className="ev-sub">{sp.note}</span> : null}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : null}
                {openForSponsors ? (
                  <div className="ev-spon-open">
                    <p>
                      <span lang="en">Open for Sponsorship</span>
                      <span>{e.sponsors?.length ? "ยังรับสปอนเซอร์เพิ่มนะ" : "งานนี้กำลังหาสปอนเซอร์อยู่"} คุยกับผู้จัดได้เลย</span>
                    </p>
                    {canSponsor ? (
                      <button type="button" className="ev-greet" aria-haspopup="dialog" onClick={offerSponsor}>
                        เสนอเป็นสปอนเซอร์
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </section>
            ) : null}

            {/* Report: other people's published events only (old page). */}
            {!published || isOwner ? null : repOpen ? (
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
        <EventWorks projectIds={e.project_ids} categories={insights?.related_categories} />
      </main>
      {sponsorOpen && user ? (
        <SponsorOffer
          userId={user.id}
          event={e}
          onClose={() => setSponsorOpen(false)}
          onSent={(roomId) => void panels.openChat({ roomId }).catch(() => navigate(`/chat/${roomId}`))}
          say={say}
        />
      ) : null}
      {shareOpen ? (
        <SharePanel url={url} title={e.title} image={pictures[0] ?? ""} imageRatio={shareRatio} onClose={() => setShareOpen(false)} say={say} />
      ) : null}
      {toast ? (
        <div role="status" className="ev-toast">
          {toast}
        </div>
      ) : null}
    </>
  );
}
