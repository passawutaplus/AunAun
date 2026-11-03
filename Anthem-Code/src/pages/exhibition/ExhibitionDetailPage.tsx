import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  CalendarDays,
  ExternalLink,
  Flag,
  Globe,
  Handshake,
  MessageCircle,
  MapPin,
  Ticket,
} from "lucide-react";
import SeoHead from "@/components/SeoHead";
import SeoBreadcrumb from "@/components/seo/SeoBreadcrumb";
import { BackButton } from "@/components/ui/BackButton";
import { HeaderAccountActions } from "@/components/HeaderAccountActions";
import ConnectMessageDialog from "@/components/chat/ConnectMessageDialog";
import SponsorOfferDialog from "@/components/exhibition/SponsorOfferDialog";
import ReportDialog from "@/components/report/ReportDialog";
import {
  CategoryTag,
  EventGallery,
  EventSourceNote,
  EventStatusBadge,
  OriginTag,
  PickTag,
  eventImages,
} from "@/components/exhibition/EventParts";
import EmptyState from "@/components/ui/EmptyState";
import QueryStatusPanel from "@/components/ui/QueryStatusPanel";
import { Button } from "@/components/ui/button";
import { recordEventRegistration, useEvent, useEventProjects, useEventStats, useMyEventLikes, useRecordEventView } from "@/hooks/useExhibitionEvents";
import { EventActions } from "@/components/exhibition/EventActions";
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
    return (u.host.replace(/^www\./, "") + u.pathname).replace(/\/$/, "");
  } catch {
    return url;
  }
}

/** Main button sends people to register / buy / apply. The event's own site is a text link in the info list. */
function RegistrationCta({ event, onRegister }: { event: ExhibitionEvent; onRegister?: () => void }) {
  const ended = isEventEnded(event);
  const action = ended ? null : eventPrimaryAction(event);
  return (
    <div className="space-y-2">
      {action && isHttpUrl(action.url) ? (
        <Button asChild size="lg" className="w-full rounded-full bg-brand text-neutral-950 hover:bg-brand/90">
          <a href={action.url} target="_blank" rel="noopener noreferrer nofollow" onClick={onRegister}>
            {action.label} <ExternalLink className="ml-2 h-4 w-4" aria-hidden />
          </a>
        </Button>
      ) : !ended && event.origin === "curated" ? (
        <p className="rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
          ลิงก์ลงทะเบียน: {NOT_SPECIFIED} — ดูรายละเอียดที่เว็บไซต์ต้นทาง
        </p>
      ) : null}
    </div>
  );
}

export default function ExhibitionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: event, isLoading, isError, refetch } = useEvent(id);
  const statIds = useMemo(() => (id ? [id] : []), [id]);
  const { data: stats } = useEventStats(statIds);
  const { data: myLikes } = useMyEventLikes(statIds);
  useRecordEventView(event?.id, event?.status === "published");
  const { data: works = [] } = useEventProjects(event?.project_ids);
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
        <EventGallery images={eventImages(event)} title={event.title} aspect="aspect-[4/3]" />

        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center gap-2">
            {event.is_pick ? <PickTag /> : null}
            <CategoryTag category={event.category} />
            <OriginTag origin={event.origin} />
          </div>
          <h1 className="font-display text-4xl font-semibold leading-[1.05] tracking-tight text-foreground sm:text-5xl">
            {event.title}
          </h1>
          <p className="text-base text-foreground/80">{lead}</p>

          <div className="space-y-3 border-t border-border pt-5">
            <InfoRow icon={CalendarDays}>
              {event.starts_on ? formatEventDates(event.starts_on, event.ends_on) : NOT_SPECIFIED}
              <span className="block text-muted-foreground">
                เวลา: {event.time_note ?? NOT_SPECIFIED}
              </span>
            </InfoRow>
            <InfoRow icon={MapPin}>
              {event.location_name ? (
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location_name)}`}
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
            <InfoRow icon={Ticket}>{feeLabel(event)}</InfoRow>
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
                {event.source_url ? <span className="block text-muted-foreground">เว็บไซต์ต้นทาง</span> : null}
              </InfoRow>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <RegistrationCta
                event={event}
                // Signed-in clicks land in Portfolio → Exhibition → ลงทะเบียน.
                onRegister={user && event.status === "published" ? () => recordEventRegistration(event.id) : undefined}
              />
            </div>
            <EventActions event={event} stats={stats?.[event.id]} liked={myLikes?.has(event.id)} showViews />
          </div>
          <EventSourceNote event={event} />
        </div>
      </div>

      <div className="mt-12 mx-auto grid w-full max-w-[84rem] grid-cols-1 lg:grid-cols-[minmax(0,56rem)_22.5rem] lg:justify-center lg:gap-x-10 xl:grid-cols-[minmax(0,56rem)_24rem] xl:gap-x-12 gap-y-10">
        <section aria-labelledby="about-heading">
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

        {/* Thin rules between the side sections; on phones the first one also separates them from About. */}
        <aside className="divide-y divide-border border-t border-border lg:border-t-0 [&>*]:py-6 lg:[&>*:first-child]:pt-0">
          <section aria-labelledby="organizer-heading">
            <h2 id="organizer-heading" className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Organizer
            </h2>
            <p className="mt-2 text-base font-medium text-foreground">
              {event.organizer_name ?? (event.origin === "community" ? "ผู้จัดงาน" : NOT_SPECIFIED)}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
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
              {isHttpUrl(event.website_url) ? (
                <Button asChild size="sm" variant="ghost" className="rounded-full">
                  <a href={event.website_url} target="_blank" rel="noopener noreferrer nofollow">
                    <Globe className="mr-1.5 h-4 w-4" aria-hidden /> Website
                  </a>
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
