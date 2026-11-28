import { useMemo } from "react";
import { Link } from "react-router-dom";
import { eventPath } from "@/lib/exhibitionEvents";
import { proxiedImageUrl } from "@/lib/imageProxy";
import { EVENT_KIND, isoDay, lastDay, shortDate, useHomeEvents } from "../main/useHomeEvents";

const LIMIT = 6;

/** Place words of an event, for "same area" (Thai has no spaces, so whole names and latin words both count). */
const placeWords = (e: { location_name?: string | null; area?: string | null }) =>
  `${e.location_name ?? ""} ${e.area ?? ""}`
    .toLowerCase()
    .split(/[\s,·()/|–-]+/)
    .filter((w) => w.length >= 3);

type Props = { event: { id: string; parent_id?: string | null; category: string; location_name?: string | null; area?: string | null } };

/**
 * "Event Like This" under an event (owner 2026-11-28, was "Works Like This"): other events that are not over,
 * same type first, then the same place; soonest first. Uses the Event tab's cached list (no extra query).
 */
export default function EventLikeThis({ event }: Props) {
  const { data } = useHomeEvents();
  const today = isoDay(new Date());
  const like = useMemo(() => {
    const self = event.parent_id ?? event.id;
    const here = new Set(placeWords(event));
    return (data?.events ?? [])
      .filter((e) => e.id !== self && e.id !== event.id && e.starts_on && (lastDay(e) ?? today) >= today)
      .map((e) => ({
        e,
        score: (e.category === event.category ? 3 : 0) + (placeWords(e).some((w) => here.has(w)) ? 2 : 0),
      }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score || (a.e.starts_on ?? "").localeCompare(b.e.starts_on ?? ""))
      .slice(0, LIMIT)
      .map((x) => x.e);
  }, [data, event, today]);

  if (!like.length) return null;
  return (
    <section className="ev-works" aria-labelledby="ev-like">
      <h2 id="ev-like" lang="en">
        Event Like This
      </h2>
      <div className="ev-works-grid">
        {like.map((e) => {
          const end = lastDay(e);
          return (
            <Link key={e.id} to={eventPath(e)} className="ev-work">
              <span className="ev-work-img">
                {e.cover_url ? <img src={proxiedImageUrl(e.cover_url, 480)} alt="" loading="lazy" decoding="async" /> : null}
              </span>
              <span className="ev-work-k" lang="en">
                {EVENT_KIND[e.category] ?? EVENT_KIND.other}
              </span>
              <span className="ev-work-t">{e.title}</span>
              <span className="ev-work-d">{end && end !== e.starts_on ? `${shortDate(e.starts_on!)} – ${shortDate(end)}` : shortDate(e.starts_on!)}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
