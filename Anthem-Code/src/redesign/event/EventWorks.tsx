import { useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { useEventProjects } from "@/hooks/useExhibitionEvents";
import { proxiedImageUrl } from "@/lib/imageProxy";

type Card = { id: string; title: string; cover_url: string | null };

function Row({ id, title, works, all }: { id: string; title: string; works: Card[]; all: string[] }) {
  const location = useLocation();
  // Opens the work over this page, like the other lists (Work overlay walks through `scList`).
  const linkState = useMemo(() => ({ backgroundLocation: location, scList: all }), [location, all]);
  return (
    <section className="ev-works" aria-labelledby={id}>
      <h2 id={id} lang="en">
        {title}
      </h2>
      <div className="ev-works-grid">
        {works.map((w) => (
          <Link key={w.id} to={`/showcase/${w.id}`} state={linkState} className="ev-work">
            <span className="ev-work-img">{w.cover_url ? <img src={proxiedImageUrl(w.cover_url, 480)} alt="" loading="lazy" decoding="async" /> : null}</span>
            <span className="ev-work-t">{w.title}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

/**
 * Under the event (old page): works the organiser attached to it. "Works Like This" became
 * "Event Like This" (owner 2026-11-28) — see EventLikeThis.
 */
export default function EventWorks({ projectIds }: { projectIds: string[] | null | undefined }) {
  const ownQ = useEventProjects(projectIds?.length ? projectIds : undefined).data;
  const own = useMemo(() => ownQ ?? [], [ownQ]);
  const ownIds = useMemo(() => own.map((w) => w.id), [own]);
  if (!own.length) return null;
  return <Row id="ev-wk-own" title="Works by the Organizer" works={own} all={ownIds} />;
}
