import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ArrowUpRight, CalendarDays, ChevronLeft, ChevronRight, ImageOff, MapPin, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDate, useLang, useT } from "@/lib/i18n";
import { DETAIL } from "@/lib/i18n/exhibition/detail";
import { EventActions } from "@/components/exhibition/EventActions";
import type { EventStats } from "@/hooks/useExhibitionEvents";
import {
  EVENT_ORIGIN_LABEL,
  EVENT_STATUS_LABEL,
  categoryLabel,
  eventDisplayStatus,
  formatEventDates,
  type ExhibitionEvent,
} from "@/lib/exhibitionEvents";

export function EventStatusBadge({ event, className }: { event: Pick<ExhibitionEvent, "status" | "ends_on">; className?: string }) {
  const s = EVENT_STATUS_LABEL[eventDisplayStatus(event)];
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium text-foreground", className)}>
      <span className={cn("h-2 w-2 rounded-full", s.dot)} aria-hidden />
      {s.label}
      <span className="text-muted-foreground">· {s.th}</span>
    </span>
  );
}

export function CategoryTag({ category, className }: { category: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border border-border bg-background px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wide text-foreground",
        className,
      )}
    >
      {categoryLabel(category)}
    </span>
  );
}

export function PickTag({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        // Near-black on brand red keeps ~5:1 contrast in both themes (white on red is only ~3.9:1).
        "inline-flex items-center gap-1 rounded-full bg-brand px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-950",
        className,
      )}
    >
      <Star className="h-3 w-3 fill-current" aria-hidden />
      SAMECOR Pick
    </span>
  );
}

export function OriginTag({ origin, className }: { origin: ExhibitionEvent["origin"]; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium",
        origin === "community" ? "bg-muted text-muted-foreground" : "border border-border text-muted-foreground",
        className,
      )}
    >
      {EVENT_ORIGIN_LABEL[origin]}
    </span>
  );
}

/** "Event information sourced from X · Last checked … · View original" — shown on every event with a source. */
export function EventSourceNote({
  event,
  className,
}: {
  event: Pick<ExhibitionEvent, "source_name" | "source_url" | "source_checked_at">;
  className?: string;
}) {
  const t = useT(DETAIL);
  const lang = useLang();
  let host: string;
  try {
    const u = new URL(event.source_url ?? "");
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    host = u.hostname;
  } catch {
    return null;
  }
  const checked = event.source_checked_at
    ? formatDate(new Date(event.source_checked_at), { day: "numeric", month: lang === "zh" ? "long" : "short", year: "numeric" }, lang)
    : null;
  return (
    <p className={cn("text-xs leading-relaxed text-muted-foreground", className)}>
      {t("sourcedFrom")} <span className="font-medium text-foreground">{event.source_name || host}</span>
      {checked ? <> · {t("lastChecked", { date: checked })}</> : null} ·{" "}
      <a
        href={event.source_url ?? undefined}
        target="_blank"
        rel="noopener noreferrer nofollow"
        className="inline-flex items-center gap-0.5 font-medium text-foreground underline-offset-2 hover:underline"
      >
        {t("viewOriginal")} <ArrowUpRight className="h-3 w-3" aria-hidden />
      </a>
    </p>
  );
}

export function EventMeta({ event, className }: { event: ExhibitionEvent; className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground", className)}>
      {event.starts_on ? (
        <span className="inline-flex items-center gap-1.5">
          <CalendarDays className="h-4 w-4 shrink-0" aria-hidden />
          {formatEventDates(event.starts_on, event.ends_on)}
        </span>
      ) : null}
      {event.location_name ? (
        <span className="inline-flex items-center gap-1.5">
          <MapPin className="h-4 w-4 shrink-0" aria-hidden />
          {event.location_name}
        </span>
      ) : null}
    </div>
  );
}

/** Horizontal image slider: one frame, counter, previous/next. Artwork is never cropped away entirely. */
const GALLERY_BTN =
  "flex h-9 w-9 items-center justify-center rounded-full border border-white/45 bg-black/10 text-white backdrop-blur-sm transition-colors hover:border-white/80 hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white";

export function EventGallery({
  images,
  title,
  className,
  aspect = "aspect-[16/10]",
  emptyTitleClassName,
}: {
  images: string[];
  title: string;
  className?: string;
  aspect?: string;
  /** Extra classes for the title shown when there is no image (e.g. hide it where the title sits right below). */
  emptyTitleClassName?: string;
}) {
  const t = useT(DETAIL);
  const list = images.filter(Boolean);
  const [index, setIndex] = useState(0);
  if (!list.length) {
    // Curated events carry no copied images until the organiser allows one; show the title instead.
    return (
      <div
        className={cn(
          "flex flex-col justify-end gap-1 rounded-lg border border-border bg-muted p-5 text-foreground",
          aspect,
          className,
        )}
        aria-hidden
      >
        <ImageOff className="mb-auto h-5 w-5 text-muted-foreground" />
        <span className={cn("line-clamp-3 font-display text-xl font-semibold leading-tight", emptyTitleClassName)}>{title}</span>
        <span className="text-xs text-muted-foreground">{t("noImageYet")}</span>
      </div>
    );
  }
  const i = Math.min(index, list.length - 1);
  const go = (delta: number) => setIndex((i + delta + list.length) % list.length);

  return (
    <div className={cn("relative overflow-hidden rounded-lg bg-muted", aspect, className)}>
      <img
        src={list[i]}
        alt={list.length > 1 ? t("imageOf", { title, i: i + 1, n: list.length }) : title}
        className="absolute inset-0 h-full w-full object-cover"
        loading="lazy"
        decoding="async"
      />
      {list.length > 1 ? (
        <>
          {/* Over the photo, so fixed white (not theme colours) with a soft shade underneath. */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/45 to-transparent" aria-hidden />
          <div className="absolute bottom-3 left-4 flex items-center gap-2.5 text-white">
            <span aria-live="polite" className="mr-1 text-sm font-medium tabular-nums [text-shadow:0_1px_2px_rgb(0_0_0/0.4)]">
              {i + 1} / {list.length}
            </span>
            <button type="button" onClick={() => go(-1)} className={GALLERY_BTN} aria-label={t("prevImage")}>
              <ChevronLeft className="h-4 w-4" strokeWidth={1.75} />
            </button>
            <button type="button" onClick={() => go(1)} className={GALLERY_BTN} aria-label={t("nextImage")}>
              <ChevronRight className="h-4 w-4" strokeWidth={1.75} />
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}

export function eventImages(e: Pick<ExhibitionEvent, "cover_url" | "gallery_urls">): string[] {
  const all = [e.cover_url, ...e.gallery_urls].filter(Boolean) as string[];
  return [...new Set(all)];
}

/** Row on the public list: gallery left, details right. */
export function EventListCard({
  event,
  stats,
  interested,
}: {
  event: ExhibitionEvent;
  stats?: EventStats;
  interested?: boolean;
}) {
  const t = useT(DETAIL);
  const href = `/exhibition/${event.id}`;
  return (
    <article className="grid gap-4 border-b border-border py-6 last:border-0 md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] md:gap-8">
      {/* Phone: shorter frame, and no repeated title when there is no image (it sits right below). */}
      <EventGallery
        images={eventImages(event)}
        title={event.title}
        aspect="aspect-[16/9] md:aspect-[16/10]"
        emptyTitleClassName="hidden md:block"
      />
      <div className="flex min-w-0 flex-col justify-center gap-2.5 md:gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {event.is_pick ? <PickTag /> : null}
          <CategoryTag category={event.category} />
          {event.origin !== "community" ? <OriginTag origin={event.origin} /> : null}
          <EventActions event={event} stats={stats} interested={interested} className="ml-auto hidden md:flex" />
        </div>
        <h2 className="font-display text-xl font-semibold leading-snug text-foreground md:text-2xl md:leading-tight">
          <Link to={href} className="hover:underline focus-visible:underline focus-visible:outline-none">
            {event.title}
          </Link>
        </h2>
        <EventMeta event={event} />
        <p className="line-clamp-2 text-sm text-muted-foreground max-md:hidden">{event.description}</p>
        <div className="mt-1 flex items-center justify-between gap-3">
          <Link
            to={href}
            className="inline-flex items-center gap-1.5 rounded-full border border-foreground/20 px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-foreground hover:bg-foreground hover:text-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground"
          >
            {t("viewEvent")} <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
          <EventActions event={event} stats={stats} interested={interested} className="md:hidden" />
        </div>
      </div>
    </article>
  );
}
