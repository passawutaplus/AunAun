import { cardImageSrc } from "@/lib/mediaThumb";
import { Link } from "react-router-dom";
import { CalendarDays, Handshake } from "lucide-react";
import { useEvent } from "@/hooks/useExhibitionEvents";
import { formatEventDates } from "@/lib/exhibitionEvents";
import { cn } from "@/lib/utils";

/** Event preview under a chat message that links to /exhibition/<id>. */
export function ChatEventCard({ eventId, mine, sponsor }: { eventId: string; mine: boolean; sponsor?: boolean }) {
  const { data: event } = useEvent(eventId);
  if (!event) return null;
  return (
    <Link
      to={`/exhibition/${event.id}`}
      className={cn(
        "mt-1 flex w-72 max-w-full items-center gap-3 rounded-2xl border border-border bg-card p-2 text-foreground shadow-sm transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground",
        mine ? "ml-auto" : "mr-auto",
      )}
    >
      {event.cover_url ? (
        <img decoding="async" src={cardImageSrc(event.cover_url)} alt="" className="h-14 w-14 shrink-0 rounded-xl object-cover" loading="lazy" />
      ) : (
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-muted" aria-hidden>
          <CalendarDays className="h-5 w-5 text-muted-foreground" />
        </span>
      )}
      <span className="min-w-0">
        <span className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
          {sponsor ? <Handshake className="h-3 w-3" aria-hidden /> : <CalendarDays className="h-3 w-3" aria-hidden />}
          {sponsor ? "ข้อเสนอสปอนเซอร์" : "Exhibition"}
        </span>
        <span className="block truncate text-sm font-semibold">{event.title}</span>
        {event.starts_on ? (
          <span className="block truncate text-xs text-muted-foreground">
            {formatEventDates(event.starts_on, event.ends_on)}
            {event.location_name ? ` · ${event.location_name}` : ""}
          </span>
        ) : null}
      </span>
    </Link>
  );
}
