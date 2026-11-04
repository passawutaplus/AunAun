import { Link } from "react-router-dom";
import { MapPin, Route } from "lucide-react";
import { EventActions } from "@/components/exhibition/EventActions";
import { useEventStats, useMyEventInterests } from "@/hooks/useExhibitionEvents";
import { useEventVenues, useFeaturedEvent } from "@/hooks/useEventVenues";
import { formatEventDates } from "@/lib/exhibitionEvents";
import { featuredCountdown, venueCounts } from "@/lib/eventVenues";
import { cn } from "@/lib/utils";

const pill =
  "inline-flex min-h-9 items-center gap-1.5 rounded-full border border-foreground/25 px-4 text-sm font-medium text-foreground transition-colors hover:border-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground";

/** The team-pinned event at the top of /exhibition: key visual, countdown, venues, สนใจ, route. */
export function FeaturedEventBanner({ className }: { className?: string }) {
  const { data: event } = useFeaturedEvent();
  const { data: venues = [] } = useEventVenues(event?.id);
  const ids = event ? [event.id] : [];
  const { data: stats } = useEventStats(ids);
  const { data: mine } = useMyEventInterests(ids);
  if (!event) return null;

  const countdown = featuredCountdown(event.starts_on, event.ends_on);
  const { main } = venueCounts(venues);
  const to = `/exhibition/${event.id}`;

  return (
    <article
      aria-labelledby="featured-event-title"
      className={cn(
        "grid overflow-hidden rounded-xl border border-border bg-card md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]",
        className,
      )}
    >
      <Link to={to} className="group relative block aspect-[16/9] overflow-hidden bg-muted md:aspect-auto md:min-h-[18rem]" tabIndex={-1} aria-hidden>
        {event.cover_url ? (
          <img
            src={event.cover_url}
            alt=""
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
            fetchPriority="high"
          />
        ) : null}
      </Link>

      <div className="flex flex-col justify-center gap-3 p-5 sm:p-7">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full bg-brand px-2.5 py-1 font-semibold text-white">Featured Event</span>
          {countdown ? <span className="font-medium text-muted-foreground">{countdown}</span> : null}
        </div>
        <h2 id="featured-event-title" className="font-display text-3xl font-semibold leading-[1.1] tracking-tight text-foreground sm:text-4xl max-sm:text-2xl">
          <Link to={to} className="hover:underline hover:decoration-foreground/30 hover:underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground">
            {event.title}
          </Link>
        </h2>
        {event.starts_on ? <p className="text-sm text-muted-foreground">{formatEventDates(event.starts_on, event.ends_on)}</p> : null}

        <div className="mt-1 flex flex-wrap items-center gap-2">
          {main > 0 ? (
            <Link to={`${to}#venues`} className={pill}>
              <MapPin className="h-4 w-4" aria-hidden /> {main} สถานที่
            </Link>
          ) : null}
          <EventActions event={event} stats={stats?.[event.id]} interested={mine?.has(event.id)} labeled />
          {main > 0 ? (
            <Link to={`${to}#venue-map`} className={cn(pill, "border-transparent px-2 text-muted-foreground hover:text-foreground")}>
              <Route className="h-4 w-4" aria-hidden /> ดูเส้นทาง
            </Link>
          ) : null}
        </div>
      </div>
    </article>
  );
}
