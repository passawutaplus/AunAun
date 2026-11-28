import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useVenueRoute } from "@/hooks/useEventVenues";
import { useMyEventInterests } from "@/hooks/useExhibitionEvents";
import { groupVenuesByArea } from "@/lib/eventVenues";
import { setVenuesInterest } from "@/server/mutations/eventPage";
import { toggleEventInterest } from "@/server/mutations/eventInterest";
import type { EventPageVenue } from "@/server/queries/eventPage";
import { SC_LINKS } from "../routes";
import { locationsMapsUrl, routeNote } from "./locationsRoute";
import { thaiHours, venueStatus } from "./venueText";
import "../styles/locations.css";

const LocationsMap = lazy(() => import("./LocationsMap"));

type Props = {
  event: { id: string; title: string };
  venues: EventPageVenue[];
  onToast: (text: string) => void;
};

const Bookmark = ({ fill }: { fill: string }) => (
  <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill={fill} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 3h12v18l-6-4.5L6 21z" />
  </svg>
);

/**
 * Locations of a multi-venue event (mock: Locations.dc.html) — inside the Event page and on its own page.
 * Ticking two venues or more draws the walking route and turns the Google Maps button into directions.
 */
export default function Locations({ event, venues, onToast }: Props) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();
  const groups = useMemo(() => groupVenuesByArea(venues), [venues]);
  const all = useMemo(() => groups.flatMap((g) => g.venues), [groups]);
  const byId = useMemo(() => new Map(all.map((v) => [v.id, v])), [all]);

  const [sel, setSel] = useState<string[]>([]);
  const [start, setStart] = useState<string>("me");
  const [startOpen, setStartOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const startRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!startOpen) return;
    const off = (e: Event) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !startRef.current?.contains(e.target as Node)) setStartOpen(false);
    };
    document.addEventListener("pointerdown", off);
    document.addEventListener("keydown", off);
    return () => {
      document.removeEventListener("pointerdown", off);
      document.removeEventListener("keydown", off);
    };
  }, [startOpen]);

  const toggleSel = (id: string) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const startV = start === "me" ? null : byId.get(start) ?? null;
  const picked = sel.map((id) => byId.get(id)).filter((v): v is NonNullable<typeof v> => !!v);
  const path = [...(startV && !sel.includes(startV.id) ? [startV] : []), ...picked];
  const hasRoute = picked.length >= 2;
  const { data: plan } = useVenueRoute(hasRoute ? path : []);
  const route = hasRoute ? plan?.inner ?? null : null;
  const mapsHref = locationsMapsUrl(event.title, hasRoute ? path : [], !!startV);

  // ---------- สนใจ (each venue, or all of them) ----------
  const ids = useMemo(() => all.map((v) => v.id), [all]);
  const { data: mine } = useMyEventInterests(ids);
  const [over, setOver] = useState<Record<string, boolean>>({});
  const saved = (id: string) => over[id] ?? !!mine?.has(id);
  const allSaved = all.length > 0 && all.every((v) => saved(v.id));
  const settle = () => {
    void qc.invalidateQueries({ queryKey: ["events", "my-interests"] });
    void qc.invalidateQueries({ queryKey: ["events", "stats"] });
    void qc.invalidateQueries({ queryKey: ["events", "my-list"] });
  };
  const one = useMutation({
    mutationFn: toggleEventInterest,
    onError: (_e, id) => {
      setOver((o) => ({ ...o, [id]: !o[id] }));
      onToast("บันทึกไม่สำเร็จ");
    },
    onSettled: settle,
  });
  const every = useMutation({
    mutationFn: (on: boolean) => setVenuesInterest(event.id, on),
    onError: () => {
      setOver({});
      onToast("บันทึกไม่สำเร็จ");
    },
    onSettled: settle,
  });
  const saveOne = (id: string) => {
    if (!user) return navigate(SC_LINKS.login);
    const on = !saved(id);
    setOver((o) => ({ ...o, [id]: on }));
    onToast(on ? "เก็บไว้ใน Interested · เห็นแค่คุณ" : "เอาออกจาก Interested แล้ว");
    one.mutate(id);
  };
  const saveAll = () => {
    if (!user) return navigate(SC_LINKS.login);
    const on = !allSaved;
    setOver(Object.fromEntries(all.map((v) => [v.id, on])));
    onToast(on ? `เก็บ ${all.length} สถานที่ไว้ใน Interested` : "เอาออกจาก Interested แล้ว");
    every.mutate(on);
  };

  const pins = all.map((v) => ({ id: v.id, n: v.pin, title: v.title, lat: v.lat, lng: v.lng, on: sel.includes(v.id) || startV?.id === v.id }));
  const now = new Date();

  return (
    <section className="lc-m" aria-labelledby="lc-h">
      <div className="lc-top">
        <h2 id="lc-h">
          Locations <span>{all.length}</span>
        </h2>
        <div className="lc-top-acts">
          <button type="button" className="lc-pill" aria-pressed={allSaved} onClick={saveAll}>
            <Bookmark fill={allSaved ? "currentColor" : "none"} />
            สนใจทุกสถานที่
          </button>
          <a href={mapsHref} target="_blank" rel="noopener noreferrer" className="lc-pill" data-dark={hasRoute ? "" : undefined}>
            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
            </svg>
            {hasRoute ? "นำทางใน Google Maps" : "เปิดใน Google Maps"}
          </a>
        </div>
      </div>

      <div className="lc-body">
        <div className="lc-map">
          <Suspense fallback={null}>
            <LocationsMap pins={pins} route={route} onToggle={toggleSel} />
          </Suspense>
        </div>

        <div className="lc-side">
          <div className="lc-start">
            <div className="lc-start-row" ref={startRef}>
              เริ่มจาก
              <button type="button" className="lc-start-btn" aria-haspopup="listbox" aria-expanded={startOpen} onClick={() => setStartOpen((o) => !o)}>
                <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#EE3D29" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11z" />
                  <circle cx="12" cy="10" r="2.3" />
                </svg>
                <span>{startV ? startV.title : "ตำแหน่งปัจจุบัน"}</span>
                <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#666666" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 9.5l6 6 6-6" />
                </svg>
              </button>
              {hasRoute ? (
                <button type="button" className="lc-clear" onClick={() => setSel([])}>
                  ล้าง
                </button>
              ) : null}
              {startOpen ? (
                <div role="listbox" aria-label="จุดเริ่มต้น" className="lc-list">
                  {[{ id: "me", title: "ตำแหน่งปัจจุบัน", pin: 0 }, ...all].map((o) => (
                    <button
                      key={o.id}
                      type="button"
                      role="option"
                      className="lc-opt"
                      aria-selected={start === o.id}
                      onClick={() => {
                        setStart(o.id);
                        setStartOpen(false);
                      }}
                    >
                      <span aria-hidden="true" data-me={o.id === "me" ? "" : undefined}>
                        {o.id === "me" ? null : o.pin}
                      </span>
                      {o.title}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            <p role="status">{routeNote(picked.length, path.map((v) => v.pin))}</p>
          </div>

          <div>
            {groups.map((g, gi) => {
              const open = gi === 0 || moreOpen;
              return (
                <div key={g.area ?? `g${gi}`} className="lc-group">
                  <p className="lc-group-hd">
                    <span>{g.area ?? "อื่นๆ"}</span>
                    <span>{`${g.venues.length} สถานที่`}</span>
                  </p>
                  {open ? (
                    <ol>
                      {g.venues.map((v) => {
                        const on = sel.includes(v.id);
                        const sv = saved(v.id);
                        const st = venueStatus(v, now);
                        const hours = thaiHours(v.opening_hours) || v.hours_note?.trim() || "";
                        return (
                          <li key={v.id} className="lc-row">
                            <button type="button" role="checkbox" aria-checked={on} aria-label={`เลือก ${v.name_en || v.title} เข้าเส้นทาง`} className="lc-pick" onClick={() => toggleSel(v.id)}>
                              <span aria-hidden="true" className="lc-box">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M5 12.5l4.5 4.5L19 7.5" />
                                </svg>
                              </span>
                              <span className="lc-num">{v.pin}</span>
                              <span className="lc-txt">
                                <span className="lc-th">{v.title}</span>
                                {v.name_en ? <span className="lc-en">{v.name_en}</span> : null}
                                {st || hours ? (
                                  <span className="lc-meta">
                                    {st ? (
                                      <span className="lc-st" data-k={st.kind}>
                                        <i aria-hidden="true" />
                                        {st.label}
                                      </span>
                                    ) : null}
                                    {hours ? <span className="lc-hours">{hours}</span> : null}
                                  </span>
                                ) : null}
                              </span>
                            </button>
                            <button type="button" className="lc-save" aria-label={`${sv ? "เลิกสนใจ" : "สนใจ"} ${v.name_en || v.title}`} aria-pressed={sv} onClick={() => saveOne(v.id)}>
                              <Bookmark fill={sv ? "#282929" : "none"} />
                            </button>
                          </li>
                        );
                      })}
                    </ol>
                  ) : (
                    <button type="button" className="lc-pill lc-more" onClick={() => setMoreOpen(true)}>
                      {`ดูอีก ${g.venues.length} สถานที่`}
                      <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#282929" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M6 9.5l6 6 6-6" />
                      </svg>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
