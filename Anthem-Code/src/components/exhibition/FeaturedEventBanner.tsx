import { Link } from "react-router-dom";
import { MapPin, Route } from "lucide-react";
import { EventActions } from "@/components/exhibition/EventActions";
import { useEventStats, useMyEventInterests } from "@/hooks/useExhibitionEvents";
import { useEventVenues, useFeaturedEvent } from "@/hooks/useEventVenues";
import { formatEventDates } from "@/lib/exhibitionEvents";
import { featuredCountdown, featuredCountdownParts, venueCounts } from "@/lib/eventVenues";
import { useLang, useT } from "@/lib/i18n";
import { EXHIBITION_SHARED } from "@/lib/i18n/exhibition/shared";
import { cn } from "@/lib/utils";

const pill =
  "inline-flex min-h-9 items-center gap-1.5 rounded-full border border-foreground/25 px-4 text-sm font-medium text-foreground transition-colors hover:border-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground";

/** The team-pinned event at the top of /exhibition: key visual, countdown, venues, สนใจ, route. */
export function FeaturedEventBanner({ className }: { className?: string }) {
  const t = useT(EXHIBITION_SHARED);
  const lang = useLang();
  const { data: event } = useFeaturedEvent();
  const { data: venues = [] } = useEventVenues(event?.id);
  const ids = event ? [event.id] : [];
  const { data: stats } = useEventStats(ids);
  const { data: mine } = useMyEventInterests(ids);
  if (!event) return null;

  const countdown = featuredCountdown(event.starts_on, event.ends_on, undefined, lang);
  // Round badge: the day count ("เหลือ 116 วัน" / "เริ่มใน 3 วัน").
  const days = featuredCountdownParts(event.starts_on, event.ends_on);
  // The badge carries the number, so the line beside "Featured Event" just says it's on.
  const status = days ? (days.kind === "left" ? t("cdOnNow") : null) : countdown;
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

      <div className={cn("relative flex flex-col justify-center gap-3 p-5 sm:p-7", days && "sm:pr-32")}>
        {days ? (
          <div
            className="absolute right-4 top-4 flex h-[4.5rem] w-[4.5rem] rotate-[8deg] flex-col items-center justify-center rounded-full bg-brand text-white shadow-lg shadow-brand/25 ring-4 ring-brand/20 sm:right-6 sm:top-6 sm:h-24 sm:w-24"
            aria-hidden
          >
            <span className="text-[10px] font-medium leading-none sm:text-xs">{days.kind === "left" ? t("badgeLeft") : t("badgeStartsIn")}</span>
            <span className="font-display text-2xl font-semibold leading-none tabular-nums sm:text-3xl">{days.n}</span>
            <span className="text-[10px] font-medium leading-none sm:text-xs">{days.n === 1 ? t("badgeDay") : t("badgeDays")}</span>
          </div>
        ) : null}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full bg-brand px-2.5 py-1 font-semibold text-neutral-950">Featured Event</span>
          {status ? <span className="font-medium text-muted-foreground">{status}</span> : null}
        </div>
        <h2 id="featured-event-title" className="font-display text-3xl font-semibold leading-[1.1] tracking-tight text-foreground sm:text-4xl max-sm:text-2xl max-sm:pr-20">
          <Link to={to} className="hover:underline hover:decoration-foreground/30 hover:underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground">
            {event.title}
          </Link>
        </h2>
        {event.starts_on ? <p className="text-sm text-muted-foreground">{formatEventDates(event.starts_on, event.ends_on, lang)}</p> : null}

        <div className="mt-1 flex flex-wrap items-center gap-2">
          {main > 0 ? (
            <Link to={`${to}#venues`} className={pill}>
              <MapPin className="h-4 w-4" aria-hidden /> {main === 1 ? t("venueCountOne") : t("venueCount", { n: main })}
            </Link>
          ) : null}
          <EventActions event={event} stats={stats?.[event.id]} interested={mine?.has(event.id)} labeled />
          {main > 0 ? (
            <Link to={`${to}#venue-map`} className={cn(pill, "border-transparent px-2 text-muted-foreground hover:text-foreground")}>
              <Route className="h-4 w-4" aria-hidden /> <span className="max-sm:sr-only">{t("viewRoute")}</span>
            </Link>
          ) : null}
        </div>
      </div>
    </article>
  );
}
