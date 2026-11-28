import { useEffect, useRef, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { eventPath, isEventUuid } from "@/lib/exhibitionEvents";
import { SC_LINKS } from "../routes";
import Locations from "../event/Locations";
import { useEventPage, useEventVenues } from "../event/useEventPage";
import NotFound from "./NotFound";
import "../styles/fonts.css";
import "../styles/tokens.css";
import "../styles/reset.css";
import "../styles/locations.css";

const Crumb = () => (
  <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#A3A3A0" strokeWidth="1.33" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9.5 6l6 6-6 6" />
  </svg>
);

/** `/exhibition/:id/locations` — the Locations box on its own page ("ดูเส้นทาง" on the home highlight). */
export default function LocationsPage() {
  const { id = "" } = useParams();
  const q = useEventPage(id);
  const e = q.data ?? null;
  const venuesQ = useEventVenues(e && !e.parent_id ? e.id : undefined);

  const [toast, setToast] = useState("");
  const timer = useRef<number | undefined>(undefined);
  const say = (t: string) => {
    window.clearTimeout(timer.current);
    setToast(t);
    timer.current = window.setTimeout(() => setToast(""), 2200);
  };
  useEffect(() => () => window.clearTimeout(timer.current), []);

  useEffect(() => {
    if (!e) return;
    const before = document.title;
    document.title = `Locations · ${e.title} | samecor.`;
    return () => {
      document.title = before;
    };
  }, [e]);

  if (q.isPending || (e && !e.parent_id && venuesQ.isPending)) return <main className="sc-main lc-pg" aria-busy="true" style={{ minHeight: "70vh" }} />;
  if (!e) return q.isError ? <main className="sc-main lc-pg" /> : <NotFound />;
  if (isEventUuid(id) && e.slug) return <Navigate to={`${eventPath(e)}/locations`} replace />;
  // A single-place event (or a venue) has no Locations: its own page says where it is.
  if (e.parent_id || !venuesQ.data?.length) return <Navigate to={eventPath(e)} replace />;

  return (
    <main className="sc-main lc-pg">
      <nav aria-label="เส้นทาง" className="lc-nav">
        <Link to={eventPath(e)} aria-label="ย้อนกลับ" className="lc-nav-back">
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.33" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M11 6l-6 6 6 6" />
          </svg>
        </Link>
        <Link to={SC_LINKS.home}>Home</Link>
        <Crumb />
        <Link to={SC_LINKS.events}>Event</Link>
        <Crumb />
        <Link to={eventPath(e)} className="lc-nav-ev">
          {e.title}
        </Link>
        <Crumb />
        <span aria-current="page">Locations</span>
      </nav>
      <Locations event={e} venues={venuesQ.data} onToast={say} />
      {toast ? (
        <div role="status" className="lc-toast">
          {toast}
        </div>
      ) : null}
    </main>
  );
}
