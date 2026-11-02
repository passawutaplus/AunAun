import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CalendarDays,
  ExternalLink,
  Globe,
  Handshake,
  Link2,
  MapPin,
  Ticket,
} from "lucide-react";
import { toast } from "sonner";
import SeoHead from "@/components/SeoHead";
import ConnectMessageDialog from "@/components/chat/ConnectMessageDialog";
import {
  CategoryTag,
  EventGallery,
  EventStatusBadge,
  PickTag,
  eventImages,
} from "@/components/exhibition/EventParts";
import EmptyState from "@/components/ui/EmptyState";
import QueryStatusPanel from "@/components/ui/QueryStatusPanel";
import { Button } from "@/components/ui/button";
import { useEvent, useEventProjects } from "@/hooks/useExhibitionEvents";
import { useAuth } from "@/hooks/useAuth";
import { navigateToAuth } from "@/lib/authRedirect";
import {
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

function RegistrationCta({ event }: { event: ExhibitionEvent }) {
  const ended = isEventEnded(event);
  if (!ended && event.registration_open && isHttpUrl(event.registration_url)) {
    return (
      <Button asChild size="lg" className="w-full rounded-full bg-brand text-neutral-950 hover:bg-brand/90">
        <a href={event.registration_url} target="_blank" rel="noopener noreferrer nofollow">
          Go to Registration <ExternalLink className="ml-2 h-4 w-4" aria-hidden />
        </a>
      </Button>
    );
  }
  if (isHttpUrl(event.website_url)) {
    return (
      <Button asChild size="lg" variant="outline" className="w-full rounded-full">
        <a href={event.website_url} target="_blank" rel="noopener noreferrer nofollow">
          Visit Website <ExternalLink className="ml-2 h-4 w-4" aria-hidden />
        </a>
      </Button>
    );
  }
  return null;
}

export default function ExhibitionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: event, isLoading, isError, refetch } = useEvent(id);
  const { data: works = [] } = useEventProjects(event?.project_ids);
  const [contactOpen, setContactOpen] = useState(false);

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
  const canContact = event.open_for_sponsors && !isOwner && !isDemoEventId(event.id) && !isEventEnded(event);
  const path = `/exhibition/${event.id}`;
  const [lead, ...rest] = event.description.split(/\n\s*\n/);

  const contactOrganizer = () => {
    if (!user) {
      navigateToAuth(navigate);
      return;
    }
    setContactOpen(true);
  };

  const share = async () => {
    const url = window.location.origin + path;
    try {
      if (navigator.share) await navigator.share({ title: event.title, url });
      else {
        await navigator.clipboard.writeText(url);
        toast.success("คัดลอกลิงก์แล้ว");
      }
    } catch {
      /* share sheet closed */
    }
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
          </div>
          <h1 className="font-display text-4xl font-semibold leading-[1.05] tracking-tight text-foreground sm:text-5xl">
            {event.title}
          </h1>
          <p className="text-base text-foreground/80">{lead}</p>

          <div className="space-y-3 border-t border-border pt-5">
            {event.starts_on ? (
              <InfoRow icon={CalendarDays}>
                {formatEventDates(event.starts_on, event.ends_on)}
                {event.time_note ? <span className="block text-muted-foreground">{event.time_note}</span> : null}
              </InfoRow>
            ) : null}
            {event.location_name ? (
              <InfoRow icon={MapPin}>
                {event.location_name}
                {event.location_note ? <span className="block text-muted-foreground">{event.location_note}</span> : null}
              </InfoRow>
            ) : null}
            <InfoRow icon={Ticket}>
              {event.fee_type === "paid" ? `มีค่าเข้างาน${event.fee_note ? ` · ${event.fee_note}` : ""}` : "เข้าชมฟรี"}
            </InfoRow>
            {isEventEnded(event) ? (
              <p className="text-sm font-medium text-muted-foreground">งานนี้จบแล้ว</p>
            ) : event.registration_open ? (
              <p className="inline-flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-400">
                <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden /> Open for Registration
              </p>
            ) : null}
          </div>

          <RegistrationCta event={event} />

          {event.open_for_sponsors && !isEventEnded(event) ? (
            <div className="flex items-start gap-3 rounded-lg bg-muted/50 p-4">
              <Handshake className="mt-0.5 h-5 w-5 shrink-0 text-foreground" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground">Open for Sponsorship</p>
                <p className="text-xs text-muted-foreground">งานนี้กำลังหาผู้สนับสนุน — คุยกับผู้จัดได้โดยตรง</p>
                {canContact ? (
                  <button
                    type="button"
                    onClick={contactOrganizer}
                    className="mt-2 text-sm font-medium text-foreground underline underline-offset-4 hover:no-underline"
                  >
                    Contact Organizer
                  </button>
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
            <p className="mt-2 text-base font-medium text-foreground">{event.organizer_name ?? "ผู้จัดงาน"}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {!isDemoEventId(event.id) ? (
                <Button asChild size="sm" variant="outline" className="rounded-full">
                  <Link to={`/u/${event.owner_id}`}>View Profile</Link>
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
          ) : null}

          <section aria-labelledby="share-heading">
            <h2 id="share-heading" className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Share This Event
            </h2>
            <Button type="button" size="sm" variant="outline" className="mt-2 rounded-full" onClick={() => void share()}>
              <Link2 className="mr-1.5 h-4 w-4" aria-hidden /> แชร์ / คัดลอกลิงก์
            </Button>
          </section>
        </aside>
      </div>

      {works.length ? (
        <section className="mt-12" aria-labelledby="works-heading">
          <h2 id="works-heading" className="font-display text-2xl font-semibold text-foreground">
            Works by the Organizer
          </h2>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {works.map((w) => (
              <Link key={w.id} to={`/project/${w.id}`} className="group block focus-visible:outline-none">
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

      {canContact ? (
        // No `about`: that sends a work card linking to /project/<id>, which an event id would break.
        <ConnectMessageDialog
          open={contactOpen}
          onOpenChange={setContactOpen}
          recipientId={event.owner_id}
          recipientName={event.organizer_name ?? "ผู้จัดงาน"}
        />
      ) : null}
    </div>
  );
}
