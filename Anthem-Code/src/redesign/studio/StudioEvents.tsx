import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { proxiedImageUrl } from "@/lib/imageProxy";
import type { StudioEvent } from "@/server/queries/studio";

type St = "live" | "review" | "draft" | "fix" | "rejected" | "ended";
const ST: Record<St, readonly [string, string]> = {
  live: ["Live", "#2F6B3A"],
  review: ["In review", "#B07A12"],
  draft: ["Draft", "#8A8A87"],
  // Not in the mock (question for Beam): the team sent it back / turned it down.
  fix: ["Needs edit", "#B8321F"],
  rejected: ["Rejected", "#A3A3A0"],
  ended: ["Ended", "#A3A3A0"],
};
type Filter = "all" | "live" | "review" | "draft";
const FILTERS: ReadonlyArray<readonly [Filter, string]> = [
  ["all", "All"],
  ["live", "Live"],
  ["review", "In review"],
  ["draft", "Draft"],
];
const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
const KIND: Record<string, string> = { open_call: "OPEN CALL", exhibition: "EXHIBITION", workshop: "WORKSHOP", talk_forum: "TALK", art_fair: "ART FAIR", meetup: "MEETUP" };

const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

function stateOf(e: StudioEvent, today: string): St {
  if (e.status === "pending") return "review";
  if (e.status === "needs_revision") return "fix";
  if (e.status === "rejected") return "rejected";
  if (e.status !== "published") return "draft";
  const end = e.ends_on ?? e.starts_on ?? "";
  return end && end < today ? "ended" : "live";
}

/** EventPost (step 11) on the old editor URL. */
const editHref = (id: string) => `/dashboard/exhibition/${id}/edit`;

/** My Studio → Event: the events I posted, by status (mock MyStudio "Event"). */
export default function StudioEvents({ events }: { events: StudioEvent[] }) {
  const [filter, setFilter] = useState<Filter>("all");
  const today = todayIso();
  const rows = useMemo(
    () =>
      events
        .map((e) => ({ e, st: stateOf(e, today) }))
        .filter(({ st }) => filter === "all" || st === filter || (filter === "draft" && st === "fix")),
    [events, filter, today],
  );
  return (
    <>
      <div className="ms-bar">
        {FILTERS.map(([k, label]) => (
          <button key={k} type="button" className={filter === k ? "ms-pill ms-pill-on" : "ms-pill"} aria-pressed={filter === k} onClick={() => setFilter(k)}>
            {label}
          </button>
        ))}
      </div>
      <div>
        {rows.map(({ e, st }) => {
          // Open calls show the closing day; the rest their first day (mock date block).
          const day = (e.category === "open_call" ? e.ends_on ?? e.starts_on : e.starts_on ?? e.ends_on) ?? "";
          const [, m, d] = day.split("-");
          const ended = st === "ended";
          const cover = e.cover_url ? proxiedImageUrl(e.cover_url, 240) : "";
          return (
            <Link key={e.id} to={ended ? `/exhibition/${e.id}` : editHref(e.id)} className="ms-evr" aria-label={`${ended ? "ดูหน้าอีเว้นท์" : "แก้ไข"} ${e.title}`}>
              <span className="ms-evd">
                <span>{d ?? "—"}</span>
                <span>{m ? MONTHS[Number(m) - 1] : ""}</span>
              </span>
              {cover ? <img src={cover} alt="" className="ms-evimg" /> : <span aria-hidden="true" className="ms-evimg" />}
              <span className="ms-evtx">
                <span className={e.category === "open_call" ? "ms-evk ms-evk-oc" : "ms-evk"}>{KIND[e.category] ?? e.category.toUpperCase()}</span>
                <span className="ms-evt">{e.title}</span>
                <span className="ms-evp">
                  <svg aria-hidden="true" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#8A8A87" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11z" />
                    <circle cx="12" cy="10" r="2.3" />
                  </svg>
                  {e.location_name || e.area || "—"}
                </span>
              </span>
              <span className="ms-evs" style={{ color: ST[st][1] }}>
                {ST[st][0]}
              </span>
              {ended ? (
                <span aria-hidden="true" className="ms-evgo">
                  ↗
                </span>
              ) : (
                <span className="ms-cc" aria-hidden="true" title="แก้ไข">
                  <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 20h4L19 9l-4-4L4 16z" />
                    <path d="M13.5 6.5l4 4" />
                  </svg>
                </span>
              )}
            </Link>
          );
        })}
        {rows.length ? null : <p className="ms-dash">—</p>}
      </div>
    </>
  );
}
