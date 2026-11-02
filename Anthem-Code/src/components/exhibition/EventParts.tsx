import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CalendarDays, ChevronLeft, ChevronRight, MapPin, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import {
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
      SameCor Pick
    </span>
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
export function EventGallery({
  images,
  title,
  className,
  aspect = "aspect-[16/10]",
}: {
  images: string[];
  title: string;
  className?: string;
  aspect?: string;
}) {
  const list = images.filter(Boolean);
  const [index, setIndex] = useState(0);
  if (!list.length) {
    return <div className={cn("rounded-lg bg-muted", aspect, className)} aria-hidden />;
  }
  const i = Math.min(index, list.length - 1);
  const go = (delta: number) => setIndex((i + delta + list.length) % list.length);

  return (
    <div className={cn("relative overflow-hidden rounded-lg bg-muted", aspect, className)}>
      <img
        src={list[i]}
        alt={list.length > 1 ? `${title} — รูปที่ ${i + 1} จาก ${list.length}` : title}
        className="absolute inset-0 h-full w-full object-cover"
        loading="lazy"
        decoding="async"
      />
      {list.length > 1 ? (
        <div className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-full bg-foreground/70 px-2 py-1 text-xs font-medium text-background">
          <span aria-live="polite">
            {i + 1} / {list.length}
          </span>
          <button
            type="button"
            onClick={() => go(-1)}
            className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-background/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-background"
            aria-label="รูปก่อนหน้า"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-background/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-background"
            aria-label="รูปถัดไป"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function eventImages(e: Pick<ExhibitionEvent, "cover_url" | "gallery_urls">): string[] {
  const all = [e.cover_url, ...e.gallery_urls].filter(Boolean) as string[];
  return [...new Set(all)];
}

/** Row on the public list: gallery left, details right. */
export function EventListCard({ event }: { event: ExhibitionEvent }) {
  const href = `/exhibition/${event.id}`;
  return (
    <article className="grid gap-4 border-b border-border py-6 last:border-0 md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] md:gap-8">
      <EventGallery images={eventImages(event)} title={event.title} />
      <div className="flex min-w-0 flex-col justify-center gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {event.is_pick ? <PickTag /> : null}
          <CategoryTag category={event.category} />
        </div>
        <h2 className="font-display text-2xl font-semibold leading-tight text-foreground">
          <Link to={href} className="hover:underline focus-visible:underline focus-visible:outline-none">
            {event.title}
          </Link>
        </h2>
        <EventMeta event={event} />
        <p className="line-clamp-2 text-sm text-foreground/80">{event.description}</p>
        <div>
          <Link
            to={href}
            className="inline-flex items-center gap-1.5 rounded-full border border-foreground/20 px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-foreground hover:bg-foreground hover:text-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground"
          >
            View Event <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </div>
    </article>
  );
}
