import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowUpRight,
  CalendarDays,
  ExternalLink,
  Flag,
  Globe,
  Handshake,
  MessageCircle,
  MapPin,
  Paperclip,
  Ticket,
  TrainFront,
} from "lucide-react";
import SeoHead from "@/components/SeoHead";
import { cn } from "@/lib/utils";
import { GoogleCalendarIcon } from "@/components/icons/GoogleCalendarIcon";
import SeoBreadcrumb from "@/components/seo/SeoBreadcrumb";
import { BackButton } from "@/components/ui/BackButton";
import { HeaderAccountActions } from "@/components/HeaderAccountActions";
import ConnectMessageDialog from "@/components/chat/ConnectMessageDialog";
import SponsorOfferDialog from "@/components/exhibition/SponsorOfferDialog";
import { googleCalendarLink } from "@/lib/googleCalendarLink";
import ReportDialog from "@/components/report/ReportDialog";
import {
  CategoryTag,
  EventGallery,
  EventStatusBadge,
  OriginTag,
  PickTag,
  eventImages,
} from "@/components/exhibition/EventParts";
import EmptyState from "@/components/ui/EmptyState";
import QueryStatusPanel from "@/components/ui/QueryStatusPanel";
import { Button } from "@/components/ui/button";
import { recordEventRegistration, useEvent, useEventInsights, useEventProjects, useEventStats, useMyEventInterests, useRecordEventView } from "@/hooks/useExhibitionEvents";
import { EventInsightsPanel, EventLinkButtons, EventRelatedWorks } from "@/components/exhibition/EventInsights";
import { EventActions } from "@/components/exhibition/EventActions";
import { EventVenuesSection, VenueOpenBadge } from "@/components/exhibition/EventVenuesSection";
import { useEventVenues, useParentEvent } from "@/hooks/useEventVenues";
import { venueMapsUrl, venueOpenState } from "@/lib/eventVenues";
import { useAuth } from "@/hooks/useAuth";
import { navigateToAuth } from "@/lib/authRedirect";
import {
  NOT_SPECIFIED,
  eventPrimaryAction,
  feeLabel,
  formatEventDates,
  isDemoEventId,
  isEventEnded,
  type ExhibitionEvent,
} from "@/lib/exhibitionEvents";

const isHttpUrl = (u: string | null | undefined): u is string => !!u && /^https?:\/\//i.test(u);

function InfoRow({ icon: Icon, children }: { icon: typeof CalendarDays; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 text-sm text-foreground">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
      <div className="min-w-0">{children}</div>
    </div>
  );
}

/** Website shown as readable text: host + path, no scheme or trailing slash. */
function displayUrl(url: string): string {
  try {
    const u = new URL(url);
    let path = u.pathname;
    try {
      path = decodeURIComponent(path); // %E2%80%98 → ‘ so Thai / curly quotes read as text
    } catch {
      /* malformed escape: keep as is */
    }
    return (u.host.replace(/^www\./, "") + path).replace(/\/$/, "");
  } catch {
    return url;
  }
}

/** Main button sends people to register / buy / apply. The event's own site is a text link in the info list. */
function RegistrationCta({ event, onRegister }: { event: ExhibitionEvent; onRegister?: () => void }) {
  const ended = isEventEnded(event);
  const action = ended ? null : eventPrimaryAction(event);
  // No registration link → show nothing at all.
  if (!action || !isHttpUrl(action.url)) return null;
  return (
    <Button asChild size="lg" className="w-full rounded-full bg-brand text-neutral-950 hover:bg-brand/90">
      <a href={action.url} target="_blank" rel="noopener noreferrer nofollow" onClick={onRegister}>
        {action.label} <ExternalLink className="ml-2 h-4 w-4" aria-hidden />
      </a>
    </Button>
  );
}

export default function ExhibitionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: event, isLoading, isError, refetch } = useEvent(id);
  const statIds = useMemo(() => (id ? [id] : []), [id]);
  const { data: stats } = useEventStats(statIds);
  const { data: myInterests } = useMyEventInterests(statIds);
  useRecordEventView(event?.id, event?.status === "published");
  const { data: works = [] } = useEventProjects(event?.project_ids);
  const { data: insights } = useEventInsights(event?.id);
  // Main event → its venues; venue page → its main event (and this venue's own details).
  const { data: venues = [] } = useEventVenues(event?.id);
  const { data: parent } = useParentEvent(event?.id);
  const { data: siblings = [] } = useEventVenues(parent?.id);
  const venue = siblings.find((v) => v.id === event?.id) ?? null;
  const [contactOpen, setContactOpen] = useState(false);
  const [sponsorOpen, setSponsorOpen] = useState(false);

  if (isLoading || isError) {
    return (
      <div className="container mx-auto max-w-6xl px-4 py-10">
        <QueryStatusPanel isLoading={isLoading} isError={isError} onRetry={() => void refetch()} errorTitle="โหลดงานนี้ไม่สำเร็จ" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="container mx-auto max-w-6xl px-4 py-16">
        <EmptyState
          title="ไม่พบงานนี้"
          description="งานอาจถูกถอน หรือยังไม่ผ่านการตรวจ"
          action={
            <Button asChild variant="outline" className="rounded-full">
              <Link to="/exhibition">ดู Exhibition ทั้งหมด</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const isOwner = user?.id === event.owner_id;
  const reachable = !isOwner && !isDemoEventId(event.id);
  // Team-run events are owned by an admin account, so only community events get a direct chat.
  const canChat = reachable && event.origin === "community";
  const openForSponsors = event.open_for_sponsors && !isEventEnded(event);
  const canSponsor = reachable && openForSponsors;
  const path = `/exhibition/${event.id}`;
  const gcalHref = googleCalendarLink({ ...event, url: typeof window !== "undefined" ? window.location.origin + path : null });
  const sourcePage = [event.source_url, event.website_url].find(isHttpUrl) ?? null;
  const [lead, ...rest] = event.description.split(/\n\s*\n/);

  const needsAuth = () => {
    if (user) return false;
    navigateToAuth(navigate);
    return true;
  };
  const contactOrganizer = () => {
    if (!needsAuth()) setContactOpen(true);
  };
  const offerSponsorship = () => {
    if (!needsAuth()) setSponsorOpen(true);
  };

  const crumbs = [
    { name: "หน้าแรก", path: "/" },
    { name: "Exhibition", path: "/exhibition" },
    { name: event.title, path },
  ];

  return (
    <div className="pb-24">
      <SeoHead
        title={event.title}
        description={lead.slice(0, 160)}
        path={path}
        image={event.cover_url ?? undefined}
        noindex={event.status !== "published"}
      />

      {/* Same top bar as a work page: back, breadcrumb, account. */}
      <div className="sticky top-0 z-20 border-b border-border bg-background">
        <div className="mx-auto flex max-w-[1920px] items-center justify-between gap-3 px-3 py-3 sm:px-[calc(1rem+25px)] lg:px-[calc(1.5rem+25px)] 2xl:px-[calc(2.5rem+25px)]">
          <div className="flex min-w-0 items-center gap-3">
            <BackButton fallbackTo="/exhibition" />
            <SeoBreadcrumb items={crumbs} className="mb-0 hidden min-w-0 md:flex" />
          </div>
          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            <HeaderAccountActions />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[calc(84rem+3rem)] px-3 pt-6 sm:px-6 lg:pt-10">

      {event.status !== "published" ? (
        <div className="mb-5 flex flex-wrap items-center gap-3 rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm">
          <EventStatusBadge event={event} />
          <span className="text-muted-foreground">หน้านี้มีแค่คุณและทีมงานที่เห็นจนกว่าจะเผยแพร่</span>
        </div>
      ) : null}

      {/* Same columns as a work page: wide media, narrow info rail. */}
      <div className="mx-auto grid w-full max-w-[84rem] grid-cols-1 lg:grid-cols-[minmax(0,56rem)_22.5rem] lg:justify-center lg:gap-x-10 xl:grid-cols-[minmax(0,56rem)_24rem] xl:gap-x-12 gap-8">
        <EventGallery
          images={eventImages(event).length ? eventImages(event) : parent?.cover_url ? [parent.cover_url] : []}
          title={event.title}
          aspect="aspect-[4/3]"
        />

        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center gap-2">
            {event.is_pick ? <PickTag /> : null}
            <CategoryTag category={event.category} />
            <OriginTag origin={event.origin} />
          </div>
          {parent ? (
            <Link
              to={`/exhibition/${parent.id}#venues`}
              className="-mb-2 text-sm text-muted-foreground underline decoration-foreground/30 underline-offset-4 hover:text-foreground"
            >
              สถานที่หนึ่งของ {parent.title}
            </Link>
          ) : null}
          <h1 className="font-display text-4xl font-semibold leading-[1.05] tracking-tight text-foreground sm:text-5xl">
            {event.title}
          </h1>
          {venue?.name_en ? <p className="-mt-3 text-sm text-muted-foreground">{venue.name_en}</p> : null}
          <EventActions
            event={event}
            stats={stats?.[event.id]}
            interested={myInterests?.has(event.id)}
            labeled
            className="-my-1"
          />

          <div className="space-y-3 border-t border-border pt-5">
            <InfoRow icon={CalendarDays}>
              {event.starts_on ? formatEventDates(event.starts_on, event.ends_on) : venue?.date_note ?? NOT_SPECIFIED}
              <span className="block text-muted-foreground">
                เวลา: {venue?.hours_note ?? event.time_note ?? NOT_SPECIFIED}
              </span>
              {venue ? <VenueOpenBadge state={venueOpenState(venue)} className="mt-1" /> : null}
              {gcalHref ? (
                <a
                  href={gcalHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group mt-1 inline-flex items-center gap-1.5 text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:underline focus-visible:outline-none"
                >
                  <GoogleCalendarIcon className="h-3.5 w-3.5 shrink-0" />
                  เพิ่มลง Google Calendar
                  <ArrowUpRight
                    className="h-3.5 w-3.5 shrink-0 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-focus-visible:-translate-y-0.5 group-focus-visible:translate-x-0.5 motion-reduce:transition-none"
                    aria-hidden
                  />
                </a>
              ) : null}
            </InfoRow>
            <InfoRow icon={MapPin}>
              {event.location_name ? (
                <a
                  href={venue ? venueMapsUrl(venue) : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location_name)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline decoration-foreground/30 underline-offset-4 hover:decoration-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground"
                  title="เปิดใน Google Maps"
                >
                  {event.location_name}
                </a>
              ) : (
                NOT_SPECIFIED
              )}
              {event.location_note ? <span className="block text-muted-foreground">{event.location_note}</span> : null}
            </InfoRow>
            {venue?.transit_note ? <InfoRow icon={TrainFront}>{venue.transit_note}</InfoRow> : null}
            <InfoRow icon={Ticket}>{venue?.admission_note ?? feeLabel(event)}</InfoRow>
            {isEventEnded(event) ? (
              <p className="text-sm font-medium text-muted-foreground">งานนี้จบแล้ว</p>
            ) : null}
            {sourcePage ? (
              <InfoRow icon={Globe}>
                <a
                  href={sourcePage}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="break-all underline decoration-foreground/30 underline-offset-4 hover:decoration-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground"
                >
                  {displayUrl(sourcePage)}
                </a>
              </InfoRow>
            ) : null}
            {/* Documents / links from the organiser's page, right under the facts (no heading — the icon says it). */}
            {insights?.links.length ? (
              <InfoRow icon={Paperclip}>
                <span className="sr-only">เอกสารและลิงก์</span>
                <EventLinkButtons links={insights.links} className="-mt-1" />
              </InfoRow>
            ) : null}
          </div>

          <RegistrationCta
            event={event}
            // Signed-in clicks land in Portfolio → Exhibition → ลงทะเบียน.
            onRegister={user && event.status === "published" ? () => recordEventRegistration(event.id) : undefined}
          />
        </div>
      </div>

      <div className="mt-6 mx-auto grid w-full max-w-[84rem] grid-cols-1 gap-y-6 lg:mt-12 lg:grid-cols-[minmax(0,56rem)_22.5rem] lg:justify-center lg:gap-x-10 lg:gap-y-10 xl:grid-cols-[minmax(0,56rem)_24rem] xl:gap-x-12">
        {/* Phones: a rule separates About from the event facts / documents above. */}
        <section aria-labelledby="about-heading" className="border-t border-border pt-6 lg:border-t-0 lg:pt-0">
          <h2 id="about-heading" className="font-display text-2xl font-semibold text-foreground">
            About This Event
          </h2>
          <div className="mt-3 space-y-3 whitespace-pre-line text-sm leading-relaxed text-foreground/85">
            <p>{lead}</p>
            {rest.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        </section>

        {/* Thin rules between the side sections, and one above Organizer to close off the event facts. */}
        <aside className="divide-y divide-border border-t border-border [&>*]:py-6">
          <section aria-labelledby="organizer-heading">
            <h2 id="organizer-heading" className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Organizer
            </h2>
            <p className="mt-2 text-base font-medium text-foreground">
              {isHttpUrl(event.website_url) ? (
                // The organiser's name opens their website.
                <a
                  href={event.website_url}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="group inline-flex items-center gap-1 underline-offset-4 hover:underline focus-visible:underline focus-visible:outline-none"
                >
                  {event.organizer_name ?? "เว็บไซต์ผู้จัด"}
                  <ArrowUpRight
                    className="h-4 w-4 shrink-0 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-focus-visible:-translate-y-0.5 group-focus-visible:translate-x-0.5 motion-reduce:transition-none"
                    aria-hidden
                  />
                </a>
              ) : (
                (event.organizer_name ?? (event.origin === "community" ? "ผู้จัดงาน" : NOT_SPECIFIED))
              )}
            </p>
            <div className="mt-2 flex flex-wrap gap-2 empty:hidden">
              {/* Team events are owned by an admin account; that profile is not the organiser. */}
              {!isDemoEventId(event.id) && event.origin === "community" ? (
                <Button asChild size="sm" variant="outline" className="rounded-full">
                  <Link to={`/u/${event.owner_id}`}>View Profile</Link>
                </Button>
              ) : null}
              {canChat ? (
                <Button type="button" size="sm" className="rounded-full" onClick={contactOrganizer}>
                  <MessageCircle className="mr-1.5 h-4 w-4" aria-hidden /> Message
                </Button>
              ) : null}
            </div>
          </section>

          {event.sponsors.length || openForSponsors || event.origin === "curated" ? (
            <section aria-labelledby="sponsors-heading">
              <h2 id="sponsors-heading" className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Sponsored by
              </h2>
              {event.sponsors.length ? (
                <ul className="mt-3 space-y-3">
                  {event.sponsors.map((s, i) => (
                    <li key={`${s.name}-${i}`} className="flex items-center gap-3">
                      {s.logo_url ? (
                        <img src={s.logo_url} alt={`โลโก้ ${s.name}`} className="h-10 w-10 rounded-md border border-border bg-background object-contain" loading="lazy" />
                      ) : (
                        <span className="flex h-10 w-10 items-center justify-center rounded-md border border-border bg-muted text-sm font-semibold text-foreground" aria-hidden>
                          {s.name.slice(0, 1).toUpperCase()}
                        </span>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground">{s.name}</p>
                        {s.note ? <p className="text-xs text-muted-foreground">{s.note}</p> : null}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : !openForSponsors ? (
                <p className="mt-2 text-sm text-muted-foreground">{NOT_SPECIFIED}</p>
              ) : null}
              {/* Last in the list: there is still room for one more sponsor. */}
              {openForSponsors ? (
                <div className="mt-4 flex items-start gap-3 rounded-lg bg-muted/50 p-4">
                  <Handshake className="mt-0.5 h-5 w-5 shrink-0 text-foreground" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground">Open for Sponsorship</p>
                    <p className="text-xs text-muted-foreground">
                      {event.sponsors.length ? "ยังรับผู้สนับสนุนเพิ่ม" : "งานนี้กำลังหาผู้สนับสนุน"} — คุยกับผู้จัดได้โดยตรง
                    </p>
                    {canSponsor ? (
                      <Button type="button" size="sm" className="mt-3 rounded-full" onClick={offerSponsorship}>
                        <Handshake className="mr-1.5 h-4 w-4" aria-hidden /> เสนอเป็นผู้สนับสนุน
                      </Button>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </section>
          ) : null}

          {user && !isOwner && event.status === "published" && !isDemoEventId(event.id) ? (
            <div>
              <ReportDialog targetType="event" targetId={event.id} targetOwnerId={event.owner_id}>
                <Button type="button" size="sm" variant="ghost" className="-ml-3 rounded-full text-muted-foreground">
                  <Flag className="mr-1.5 h-4 w-4" aria-hidden /> รายงานงานนี้
                </Button>
              </ReportDialog>
            </div>
          ) : null}
        </aside>
      </div>

      {/* Venues (sub-events) with the pinned map: below About, above the summary. */}
      {venues.length ? (
        <EventVenuesSection parent={event} venues={venues} className="mx-auto mt-10 w-full max-w-[84rem] border-t border-border pt-6 lg:mt-14" />
      ) : null}

      {works.length ? (
        <section className="mt-12" aria-labelledby="works-heading">
          <h2 id="works-heading" className="font-display text-2xl font-semibold text-foreground">
            Works by the Organizer
          </h2>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {works.map((w) => (
              <Link key={w.id} to={`/showcase/${w.id}`} className="group block focus-visible:outline-none">
                <div className="aspect-[4/3] overflow-hidden rounded-md bg-muted group-focus-visible:ring-2 group-focus-visible:ring-foreground">
                  {w.cover_url ? (
                    <img src={w.cover_url} alt="" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" loading="lazy" />
                  ) : null}
                </div>
                <p className="mt-2 line-clamp-1 text-sm font-medium text-foreground">{w.title}</p>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {insights ? <EventInsightsPanel insights={insights} event={event} className={cn("mx-auto w-full max-w-[84rem] lg:mt-14", (venues.length > 0 || works.length > 0) && "mt-10")} /> : null}

      {insights?.related_categories.length ? (
        <EventRelatedWorks categories={insights.related_categories} className="mx-auto mt-14 w-full max-w-[84rem]" />
      ) : null}

      {canChat ? (
        // No `about`: that sends a work card linking to /showcase/<id>; the event link below becomes an event card instead.
        <ConnectMessageDialog
          open={contactOpen}
          onOpenChange={setContactOpen}
          recipientId={event.owner_id}
          recipientName={event.organizer_name ?? "ผู้จัดงาน"}
          appendText={`${window.location.origin}${path}`}
          description="ถามรายละเอียดงาน การเข้าร่วม หรือชวนคุยกับผู้จัดได้เลย — การ์ดงานนี้จะแนบไปกับข้อความ"
        />
      ) : null}
      {canSponsor ? <SponsorOfferDialog open={sponsorOpen} onOpenChange={setSponsorOpen} event={event} /> : null}
      </div>
    </div>
  );
}
