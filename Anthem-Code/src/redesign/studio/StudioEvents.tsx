import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { proxiedImageUrl } from "@/lib/imageProxy";
import { deleteEvent } from "@/server/mutations/eventPost";
import type { StudioEvent } from "@/server/queries/studio";
import { SC_LINKS } from "../routes";
import "../styles/studio-events.css";

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

const Pencil = () => (
  <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 20h4L19 9l-4-4L4 16z" />
    <path d="M13.5 6.5l4 4" />
  </svg>
);
const Bin = () => (
  <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13M10 11v5.5M14 11v5.5" />
  </svg>
);

/**
 * My Studio → Event: the events I posted, by status (mock MyStudio "Event"). A Live or Ended event opens its page,
 * the rest open the editor; every row also has Edit and Delete (old My Exhibition page, asks first).
 */
export default function StudioEvents({ events }: { events: StudioEvent[] }) {
  const [filter, setFilter] = useState<Filter>("all");
  const today = todayIso();
  const qc = useQueryClient();
  const [confirm, setConfirm] = useState<StudioEvent | null>(null);
  const [gone, setGone] = useState<ReadonlySet<string>>(() => new Set());
  const [toast, setToast] = useState("");
  const toastTimer = useRef<number | undefined>(undefined);
  const say = (t: string) => {
    window.clearTimeout(toastTimer.current);
    setToast(t);
    toastTimer.current = window.setTimeout(() => setToast(""), 2200);
  };
  useEffect(() => () => window.clearTimeout(toastTimer.current), []);
  useEffect(() => {
    if (!confirm) return;
    const k = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") setConfirm(null);
    };
    document.addEventListener("keydown", k);
    return () => document.removeEventListener("keydown", k);
  }, [confirm]);
  const del = useMutation({
    mutationFn: deleteEvent,
    onSuccess: (_d, id) => {
      setGone((s) => new Set(s).add(id));
      say("ลบแล้ว");
      for (const key of [["sc-studio-events"], ["sc-home-events"], ["sc-event"], ["events"]]) void qc.invalidateQueries({ queryKey: key });
    },
    onError: () => say("ลบไม่สำเร็จ ลองใหม่อีกทีนะ"),
  });
  const rows = useMemo(
    () =>
      events
        .filter((e) => !gone.has(e.id))
        .map((e) => ({ e, st: stateOf(e, today) }))
        .filter(({ st }) => filter === "all" || st === filter || (filter === "draft" && st === "fix")),
    [events, filter, today, gone],
  );
  const none = events.every((e) => gone.has(e.id));
  const toastEl = toast ? (
    <div role="status" className="ms-toast">
      {toast}
    </div>
  ) : null;
  if (none) {
    return (
      <div className="ms-ev-empty">
        <p>ยังไม่มีอีเว้นท์เลย ลงงานแรกได้เลยนะ</p>
        <Link to={SC_LINKS.eventNew} className="ms-ev-new">
          ลงอีเว้นท์
        </Link>
        {toastEl}
      </div>
    );
  }
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
          const onSite = st === "live" || st === "ended";
          const cover = e.cover_url ? proxiedImageUrl(e.cover_url, 240) : "";
          const name = e.title?.trim() || "Untitled";
          return (
            <div key={e.id} className="ms-evr ms-evr-w">
              <Link to={onSite ? `/exhibition/${e.id}` : editHref(e.id)} className="ms-evr-a" aria-label={`${onSite ? "ดูหน้าอีเว้นท์" : "แก้ไข"} ${name}`}>
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
              </Link>
              <span className="ms-ev-btns">
                <Link to={editHref(e.id)} className="ms-cc" aria-label={`แก้ไข ${name}`} title="แก้ไข">
                  <Pencil />
                </Link>
                <button type="button" className="ms-cc ms-ev-del" aria-label={`ลบ ${name}`} title="ลบ" disabled={del.isPending} onClick={() => setConfirm(e)}>
                  <Bin />
                </button>
              </span>
            </div>
          );
        })}
        {rows.length ? null : <p className="ms-dash">ไม่มีอีเว้นท์ในหมวดนี้</p>}
      </div>

      {confirm ? (
        <div className="ms-veil">
          <div aria-hidden="true" className="ms-veil-hit" onClick={() => setConfirm(null)} />
          <div className="ms-box" role="dialog" aria-modal="true" aria-labelledby="ms-evdel-h">
            <h2 id="ms-evdel-h">ลบ {confirm.title?.trim() || "Untitled"}?</h2>
            <p>{confirm.status === "published" ? "จะหายจากหน้า Event ด้วย ลบแล้วกู้คืนไม่ได้นะ" : "ลบแล้วกู้คืนไม่ได้นะ"}</p>
            <div className="ms-box-row">
              <button type="button" className="ms-btn-line" autoFocus onClick={() => setConfirm(null)}>
                ยกเลิก
              </button>
              <button
                type="button"
                className="ms-btn-ink ms-btn-del"
                onClick={() => {
                  const id = confirm.id;
                  setConfirm(null);
                  del.mutate(id);
                }}
              >
                ลบ
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {toastEl}
    </>
  );
}
