import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
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
import { useEvent, useEventProjects, useEventStats, useMyEventLikes, useRecordEventView } from "@/hooks/useExhibitionEvents";
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

/** Main button sends people to register / buy / apply; the secondary one opens the source page to double-check. */
function RegistrationCta({ event }: { event: ExhibitionEvent }) {
  const ended = isEventEnded(event);
  const action = ended ? null : eventPrimaryAction(event);
  const sourcePage = [event.source_url, event.website_url].find(isHttpUrl) ?? null;
  return (
    <div className="space-y-2">
      {action && isHttpUrl(action.url) ? (
        <Button asChild size="lg" className="w-full rounded-full bg-brand text-neutral-950 hover:bg-brand/90">
          <a href={action.url} target="_blank" rel="noopener noreferrer nofollow">
            {action.label} <ExternalLink className="ml-2 h-4 w-4" aria-hidden />
          </a>
        </Button>
      ) : !ended && event.origin === "curated" ? (
        <p className="rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
          ลิงก์ลงทะเบียน: {NOT_SPECIFIED} — ดูรายละเอียดที่เว็บไซต์ต้นทาง
        </p>
      ) : null}
      {sourcePage ? (
        <Button asChild size="lg" variant="outline" className="w-full rounded-full">
          <a href={sourcePage} target="_blank" rel="noopener noreferrer nofollow">
            {event.source_url ? "ดูเว็บไซต์ต้นทาง" : "Visit Website"} <ExternalLink className="ml-2 h-4 w-4" aria-hidden />
          </a>
        </Button>
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
  const canSponsor = reachable && event.open_for_sponsors && !isEventEnded(event);
  const path = `/exhibition/${event.id}`;
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

  return (
    <div className="container mx-auto max-w-6xl px-4 pb-24 pt-6">
      <SeoHead
        title={event.title}
        description={lead.slice(0, 160)}
        path={path}
        image={event.cover_url ?? undefined}
        noindex={event.status !== "published"}
      />

      <Link
        to="/exhibition"
        className="mb-5 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden /> Back to Exhibition
      </Link>

      {event.status !== "published" ? (
        <div className="mb-5 flex flex-wrap items-center gap-3 rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm">
          <EventStatusBadge event={event} />
          <span className="text-muted-foreground">หน้านี้มีแค่คุณและทีมงานที่เห็นจนกว่าจะเผยแพร่</span>
        </div>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <EventGallery images={eventImages(event)} title={event.title} aspect="aspect-[4/3]" />

        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center gap-2">
            {event.is_pick ? <PickTag /> : null}
            <CategoryTag category={event.category} />
            <OriginTag origin={event.origin} />
            <EventActions event={event} stats={stats?.[event.id]} liked={myLikes?.has(event.id)} showViews className="ml-auto" />
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
              {event.location_name ?? NOT_SPECIFIED}
              {event.location_note ? <span className="block text-muted-foreground">{event.location_note}</span> : null}
            </InfoRow>
            <InfoRow icon={Ticket}>{feeLabel(event)}</InfoRow>
            {isEventEnded(event) ? (
              <p className="text-sm font-medium text-muted-foreground">งานนี้จบแล้ว</p>
            ) : event.registration_open && event.registration_url ? (
              <p className="inline-flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-400">
                <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden /> Open for Registration
              </p>
            ) : null}
          </div>

          <RegistrationCta event={event} />
          <EventSourceNote event={event} />

          {event.open_for_sponsors && !isEventEnded(event) ? (
            <div className="flex items-start gap-3 rounded-lg bg-muted/50 p-4">
              <Handshake className="mt-0.5 h-5 w-5 shrink-0 text-foreground" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground">Open for Sponsorship</p>
                <p className="text-xs text-muted-foreground">งานนี้กำลังหาผู้สนับสนุน — คุยกับผู้จัดได้โดยตรง</p>
                {canSponsor ? (
                  <Button type="button" size="sm" className="mt-3 rounded-full" onClick={offerSponsorship}>
                    <Handshake className="mr-1.5 h-4 w-4" aria-hidden /> เสนอเป็นผู้สนับสนุน
                  </Button>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-12 grid gap-10 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
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

        <aside className="space-y-8">
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
                  <MessageCircle className="mr-1.5 h-4 w-4" aria-hidden /> ทักแชทผู้จัด
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

          {event.sponsors.length ? (
            <section aria-labelledby="sponsors-heading">
              <h2 id="sponsors-heading" className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Sponsored by
              </h2>
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
            </section>
          ) : event.origin === "curated" ? (
            <section aria-labelledby="sponsors-heading">
              <h2 id="sponsors-heading" className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Sponsored by
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">{NOT_SPECIFIED}</p>
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
  );
}
