import { useState, type MouseEvent } from "react";
import { Link } from "react-router-dom";
import { eventPath } from "@/lib/exhibitionEvents";
import { proxiedImageUrl } from "@/lib/imageProxy";
import ScLoader from "../main/ScLoader";
import { dayOf, EVENT_KIND, isoDay, monthCaps } from "../main/useHomeEvents";
import { useInterestedSwitch, useMyEvents, type MyEvent } from "./useMyProfile";

type Filter = "all" | "host" | "int";

const Globe = () => (
  <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="8.5" /><path d="M3.5 12h17M12 3.5c2.5 2.6 2.5 14.4 0 17M12 3.5c-2.5 2.6-2.5 14.4 0 17" /></svg>
);
const Lock = () => (
  <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="11" width="14" height="9.5" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>
);

const daysBetween = (from: string, to: string) => Math.round((dayOf(to).getTime() - dayOf(from).getTime()) / 86_400_000);

/** The day a row shows and its state: open calls by their closing day, the rest by their first day. */
function rowState(e: MyEvent, today: string) {
  if (e.category === "open_call") {
    const close = e.ends_on ?? e.starts_on ?? "";
    const left = close ? daysBetween(today, close) : 0;
    return {
      day: close,
      past: !!close && left < 0,
      text: !close ? "" : left > 0 ? `ปิดรับใน ${left} วัน` : left === 0 ? "ปิดรับวันนี้" : "ปิดรับแล้ว",
      red: !!close && left >= 0,
    };
  }
  const start = e.starts_on ?? e.ends_on ?? "";
  const end = e.ends_on ?? e.starts_on ?? "";
  const past = !!end && end < today;
  return { day: start, past, text: !start || past ? "" : start > today ? "กำลังจะมา" : "กำลังจัด", red: false };
}

/** Events: what I host (everyone sees) and what I marked "สนใจ" (one switch decides who sees those). */
export default function MyEvents({ uid, say }: { uid: string; say: (t: string) => void }) {
  const { list, pending, toggle } = useMyEvents(uid, true);
  const shown = useInterestedSwitch(uid);
  const [filter, setFilter] = useState<Filter>("all");
  const [past, setPast] = useState(false);
  // Un-marked here: the row stays (outline) until the next visit, so a mistake can be undone (mock).
  const [off, setOff] = useState<ReadonlySet<string>>(new Set());
  const today = isoDay(new Date());

  const rows = list
    .filter((e) => filter === "all" || (filter === "host" ? e.hosted : !e.hosted))
    .map((e) => ({ e, st: rowState(e, today) }))
    .filter(({ st }) => st.past === past);

  const flipInterest = (ev: MouseEvent, e: MyEvent) => {
    ev.preventDefault();
    ev.stopPropagation();
    const was = off.has(e.id);
    setOff((old) => {
      const next = new Set(old);
      if (was) next.delete(e.id);
      else next.add(e.id);
      return next;
    });
    toggle.mutate(e.id);
    say(was ? "บันทึกว่าสนใจแล้ว" : "เอาออกจากที่สนใจแล้ว");
  };

  const flipShown = () => {
    shown.set(!shown.on);
    say(shown.on ? "Interested · เห็นแค่คุณ" : "Interested · ทุกคนเห็น");
  };

  return (
    <>
      <div className="pf-chips mp-ev-chips">
        {(
          [
            ["all", "All"],
            ["host", "Hosted"],
            ["int", "Interested"],
          ] as const
        ).map(([k, label]) => (
          <button key={k} type="button" aria-pressed={filter === k} onClick={() => setFilter(k)}>
            {label}
          </button>
        ))}
        {/* Owner decision 2026-11-28: one switch per person; its place is not in the mock yet (Beam Q44). */}
        <button
          type="button"
          className="mp-pill mp-int-switch"
          aria-pressed={shown.on}
          disabled={!shown.ready}
          title="Hosted ทุกคนเห็นเสมอ · Interested เลือกได้ว่าให้คนอื่นเห็นไหม"
          onClick={flipShown}
        >
          {shown.on ? <Globe /> : <Lock />}
          {shown.on ? "Interested · ทุกคนเห็น" : "Interested · เห็นแค่คุณ"}
        </button>
      </div>
      <div role="group" aria-label="ช่วงเวลา" className="mp-seg">
        <button type="button" aria-pressed={!past} onClick={() => setPast(false)}>
          กำลังจะมา
        </button>
        <button type="button" aria-pressed={past} onClick={() => setPast(true)}>
          ที่ผ่านมา
        </button>
      </div>
      {rows.length ? (
        <div>
          {rows.map(({ e, st }) => {
            const isOff = off.has(e.id);
            return (
              // A row is a block with one covering link, so the buttons in it are not inside a link.
              <div key={e.id} className="pf-evr mp-evr">
                <Link to={eventPath(e)} className="mp-evr-open" aria-label={e.title} />
                <span className="mp-ev-date">
                  <span>{st.day ? dayOf(st.day).getDate().toString().padStart(2, "0") : ""}</span>
                  <span>{st.day ? monthCaps(st.day) : ""}</span>
                </span>
                {e.cover_url ? <img alt="" src={proxiedImageUrl(e.cover_url, 320)} loading="lazy" decoding="async" className="pf-ev-img" /> : <span aria-hidden="true" className="pf-ev-img" />}
                <span className="pf-ev-body">
                  <span className="pf-ev-kind">
                    <span data-red={e.category === "open_call" ? "" : undefined}>{EVENT_KIND[e.category] ?? EVENT_KIND.other}</span>
                    {e.hosted ? <span className="pf-ev-host">Hosted</span> : null}
                  </span>
                  <span className="pf-ev-title">{e.title}</span>
                  {e.location_name ? (
                    <span className="pf-ev-place">
                      <svg aria-hidden="true" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#8A8A87" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11z" /><circle cx="12" cy="10" r="2.3" /></svg>
                      {e.location_name}
                    </span>
                  ) : null}
                </span>
                {st.text ? (
                  <span className="mp-ev-st" data-red={st.red ? "" : undefined}>
                    {st.text}
                  </span>
                ) : null}
                {e.hosted ? (
                  <>
                    <span className="mp-sv2 mp-sv2-dim" title="ทุกคนเห็น (อีเว้นท์ที่คุณจัด)">
                      <Globe />
                    </span>
                    <span className="mp-sv2" aria-hidden="true" />
                  </>
                ) : (
                  <>
                    <span className="mp-sv2" data-dim={shown.on ? undefined : ""} title={shown.on ? "โชว์ในโปรไฟล์" : "เห็นแค่คุณ"}>
                      {shown.on ? <Globe /> : <Lock />}
                    </span>
                    <button type="button" className="mp-sv2" aria-label={isOff ? "สนใจ" : "เลิกสนใจ"} aria-pressed={!isOff} onClick={(ev) => flipInterest(ev, e)}>
                      <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill={isOff ? "none" : "#282929"} stroke="#282929" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 3h12v18l-6-4.5L6 21z" /></svg>
                    </button>
                  </>
                )}
              </div>
            );
          })}
        </div>
      ) : past && !pending ? (
        <p className="mp-empty">อีเว้นท์ที่จบแล้วจะย้ายมาอยู่ตรงนี้</p>
      ) : null}
      {pending ? <ScLoader label="กำลังโหลดอีเว้นท์" /> : null}
    </>
  );
}
