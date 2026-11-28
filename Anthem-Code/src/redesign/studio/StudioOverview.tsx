import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { proxiedImageUrl } from "@/lib/imageProxy";
import { getOpenCalls, getRecentFollowers, getStudioComments, type StudioProfile, type StudioWork } from "@/server/queries/studio";
import { useChatRooms } from "../chat/useChatStore";
import { useMyEvents } from "../profile/useMyProfile";
import { useGreet } from "../shell/panels";
import { count } from "../profile/tiles";
import { coverOf, editHref, ratioOf } from "./StudioWorks";
import { interestWords, rankOpenCalls } from "./forYou";
import { splitPeriods, useInsights } from "./StudioInsights";

export type StudioTab = "overview" | "profile" | "works" | "event" | "catalogs" | "documents" | "insights";

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
const DONE_KEY = "sc-studio-inbox-done";
const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const daysLeft = (from: string, to: string) => Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000);
const readDone = (): string[] => {
  try {
    const v = JSON.parse(localStorage.getItem(DONE_KEY) ?? "[]");
    return Array.isArray(v) ? v.filter((x) => typeof x === "string").slice(-200) : [];
  } catch {
    return [];
  }
};

type Props = {
  uid: string;
  profile: StudioProfile | null;
  works: StudioWork[];
  followers: number;
  goTab: (t: StudioTab) => void;
};

/** My Studio → Overview (mock): latest work, three numbers, Inbox, profile steps, open calls, people, upcoming. */
export default function StudioOverview({ uid, profile, works, followers, goTab }: Props) {
  const navigate = useNavigate();
  const today = todayIso();
  const published = works.filter((w) => w.status === "Published");
  const latest = published[0] ?? null;
  const week = splitPeriods(useInsights(uid, 7).data, 7);
  const views7 = week.cur.reduce((a, r) => a + r.views, 0);
  const insightsReady = week.cur.length > 0;

  // Inbox: newest comments from other people, then my drafts. "ตอบ" opens the work at its comments.
  const comments = useQuery({ queryKey: ["sc-studio-comments", uid], queryFn: () => getStudioComments(uid), staleTime: 60_000 });
  const [done, setDone] = useState<string[]>(readDone);
  const markDone = (id: string) => {
    const next = [...done, id];
    setDone(next);
    try {
      localStorage.setItem(DONE_KEY, JSON.stringify(next.slice(-200)));
    } catch {
      // the row comes back next visit if storage is blocked
    }
  };
  const inboxComments = (comments.data ?? []).filter((c) => !done.includes(c.id)).slice(0, 3);
  const drafts = works.filter((w) => w.status === "Draft").slice(0, 3);
  // Chats with something unread come first (mock: mintra.k "ตอบ"); requests stay under Chat → Requests.
  const { rooms } = useChatRooms(true);
  const inboxChats = rooms.filter((r) => r.unread > 0 && !r.request).slice(0, 3);
  const inboxN = inboxChats.length + inboxComments.length + drafts.length;

  // Profile steps (mock): picture · first work · bio · CATEGORY · a contact.
  const steps: ReadonlyArray<readonly [string, boolean, StudioTab]> = [
    ["รูปโปรไฟล์", !!profile?.avatar_url, "profile"],
    ["ผลงานแรก", published.length > 0, "works"],
    ["แนะนำตัว", !!profile?.bio?.trim(), "profile"],
    ["หมวดงาน", (profile?.sc_categories ?? []).length > 0, "profile"],
    ["ช่องทางติดต่อ", !!(profile?.instagram || profile?.contact_email || profile?.website), "profile"],
  ];
  const stepsDone = steps.filter((s) => s[1]).length;
  const nextStep = steps.findIndex((s) => !s[1]);

  // FOR YOU (owner 2026-11-28): open calls that fit the kind of work this person posts come first.
  const calls = useQuery({ queryKey: ["sc-open-calls", today], queryFn: () => getOpenCalls(today), staleTime: 5 * 60_000 });
  const interests = useMemo(() => interestWords(works, profile?.sc_categories), [works, profile?.sc_categories]);
  const openCalls = useMemo(() => rankOpenCalls(calls.data ?? [], interests).slice(0, 3), [calls.data, interests]);

  const people = useQuery({ queryKey: ["sc-studio-followers", uid], queryFn: () => getRecentFollowers(uid), staleTime: 60_000 });
  // Small chat window (ChatDock) on larger screens, the chat page on phones.
  const greeting = useGreet();

  // Upcoming: events I am interested in that have not ended, soonest first.
  const mine = useMyEvents(uid, true);
  const upcoming = useMemo(
    () =>
      mine.list
        .filter((e) => !e.hosted && (e.ends_on ?? e.starts_on ?? "") >= today)
        .sort((a, b) => (a.starts_on ?? "").localeCompare(b.starts_on ?? ""))
        .slice(0, 3),
    [mine.list, today],
  );

  return (
    <>
      <div className="ms-ov">
        {latest ? (
          <Link to={`/showcase/${latest.id}`} className="pf-tile ms-tile ms-latest" style={{ aspectRatio: "4 / 5" }} aria-label={`เปิด ${latest.title ?? ""}`}>
            {coverOf(latest) ? (
              <img className="pf-art" src={proxiedImageUrl(coverOf(latest), 828)} alt="" style={ratioOf(latest) ? undefined : { objectFit: "contain" }} />
            ) : null}
            <span className="pf-art pf-shade" aria-hidden="true" />
            <span className="ms-stc ms-stc-latest">LATEST</span>
            <span className="pf-tt">
              <b>{latest.title?.trim() || "Untitled"}</b>
              <span className="ms-eye">
                <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2.5 12s3.5-6.5 9.5-6.5S21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
                  <circle cx="12" cy="12" r="2.5" />
                </svg>
                {count(latest.views ?? 0)}
              </span>
            </span>
          </Link>
        ) : (
          <Link to="/portfolio/new" className="ms-addt ms-latest">
            <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#282929" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            <span>ลงงาน</span>
          </Link>
        )}
        <div className="ms-ov-r">
          <div className="ms-nums">
            <div className="ms-num">
              <b>{insightsReady ? count(views7) : "—"}</b>
              <span>Views · 7D</span>
            </div>
            <div className="ms-num">
              <b>{count(published.length)}</b>
              <span>Works</span>
            </div>
            <div className="ms-num">
              <b>{count(followers)}</b>
              <span>Followers</span>
            </div>
          </div>
          <div className="ms-col">
            <h3 className="ms-h3">
              Inbox <span className="ms-mute">{inboxN}</span>
            </h3>
            {inboxChats.map((r) => (
              <div key={r.id} className="ms-evr ms-inbox">
                {r.other.avatar ? <img src={r.other.avatar} alt="" className="ms-av44" /> : <span aria-hidden="true" className="ms-av44" />}
                <span className="ms-inbox-tx">
                  <span className="ms-inbox-t">{r.other.name}</span>
                  <span className="ms-inbox-s">{/^(ส่งรูป|แชร์ผลงาน|รูปหมดอายุ|ไฟล์แนบ)/.test(r.last) ? r.last : `“${r.last}”`}</span>
                </span>
                <button type="button" className="ms-hb2 ms-hb2-s" onClick={(e) => greeting.greet({ roomId: r.id }, e.currentTarget)}>
                  ตอบ
                </button>
              </div>
            ))}
            {inboxComments.map((c) => (
              <div key={c.id} className="ms-evr ms-inbox">
                {c.who?.avatar_url ? <img src={proxiedImageUrl(c.who.avatar_url, 96)} alt="" className="ms-av44" /> : <span aria-hidden="true" className="ms-av44" />}
                <span className="ms-inbox-tx">
                  <span className="ms-inbox-t">
                    {c.who?.username || c.who?.display_name || "—"} · {c.work_title || "Untitled"}
                  </span>
                  <span className="ms-inbox-s">“{c.content}”</span>
                </span>
                <button
                  type="button"
                  className="ms-hb2 ms-hb2-s"
                  onClick={() => {
                    markDone(c.id);
                    navigate(`/showcase/${c.project_id}#cm-h`);
                  }}
                >
                  ตอบ
                </button>
              </div>
            ))}
            {drafts.map((w) => (
              <div key={w.id} className="ms-evr ms-inbox">
                {coverOf(w) ? <img src={proxiedImageUrl(coverOf(w), 96)} alt="" className="ms-av44 ms-av44-sq" /> : <span aria-hidden="true" className="ms-av44 ms-av44-sq" />}
                <span className="ms-inbox-tx">
                  <span className="ms-inbox-t">{w.title?.trim() || "Untitled"}</span>
                  <span className="ms-inbox-s">Draft</span>
                </span>
                <Link to={editHref(w.id)} className="ms-hb2 ms-hb2-s">
                  ทำต่อ
                </Link>
              </div>
            ))}
            {inboxN ? null : <p className="ms-dash">—</p>}
          </div>
          {stepsDone < steps.length ? (
            <div className="ms-col ms-steps-w">
              <h3 className="ms-h3">
                Profile <span className="ms-mute">{stepsDone}/5</span>
              </h3>
              <ol aria-label="ขั้นตอนทำโปรไฟล์" className="ms-steps">
                {steps.map(([label, ok, tab], i) => {
                  const isNext = i === nextStep;
                  return (
                    <li key={label}>
                      <button type="button" className={ok ? "ms-stb ms-stb-done" : isNext ? "ms-stb ms-stb-next" : "ms-stb"} aria-pressed={ok} aria-label={`Step ${i + 1} ${label}${ok ? " เสร็จแล้ว" : isNext ? " ทำต่อไป" : ""}`} onClick={() => goTab(tab)}>
                        <span aria-hidden="true" className="ms-sbar" />
                        <span className="ms-slb">
                          {ok ? (
                            <svg aria-hidden="true" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M5 12.5l4.5 4.5L19 7.5" />
                            </svg>
                          ) : (
                            <span aria-hidden="true">{i + 1}</span>
                          )}
                          <span>{label}</span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ol>
            </div>
          ) : null}
        </div>
      </div>
      <div className="ms-ov3">
        <div>
          <h3 className="ms-h3 ms-h3-row">
            Open calls <span className="ms-foryou">FOR YOU</span>
          </h3>
          {openCalls.map((e) => {
            const left = daysLeft(today, e.ends_on ?? today);
            return (
              <Link key={e.id} to={`/exhibition/${e.id}`} className="ms-evr ms-row14">
                {e.cover_url ? <img src={proxiedImageUrl(e.cover_url, 160)} alt="" className="ms-th64" /> : <span aria-hidden="true" className="ms-th64" />}
                <span className="ms-inbox-tx">
                  <span className="ms-oc-t">{e.title}</span>
                  <span className={left <= 7 ? "ms-oc-s ms-red" : "ms-oc-s"}>{left > 0 ? `ปิดใน ${left} วัน` : "ปิดวันนี้"}</span>
                </span>
              </Link>
            );
          })}
          {openCalls.length ? null : <p className="ms-dash">—</p>}
        </div>
        <div>
          <h3 className="ms-h3">People</h3>
          {(people.data ?? []).map((p) => (
            <div key={p.user_id} className="ms-evr ms-row12">
              {p.avatar_url ? <img src={proxiedImageUrl(p.avatar_url, 80)} alt="" className="ms-av40" /> : <span aria-hidden="true" className="ms-av40" />}
              <span className="ms-inbox-tx">
                <span className="ms-oc-t">{p.username || p.display_name || "—"}</span>
                <span className="ms-oc-s">ติดตามคุณ</span>
              </span>
              <button type="button" className="ms-hb2 ms-hb2-xs" onClick={(e) => greeting.greet({ otherId: p.user_id }, e.currentTarget)}>
                ทักทาย
              </button>
            </div>
          ))}
          {(people.data ?? []).length ? null : <p className="ms-dash">—</p>}
        </div>
        <div>
          <h3 className="ms-h3">Upcoming</h3>
          {upcoming.map((e) => {
            const day = e.starts_on ?? e.ends_on ?? "";
            const [, m, d] = day.split("-");
            return (
              <Link key={e.id} to={`/exhibition/${e.id}`} className="ms-evr ms-row14">
                <span className="ms-upd">
                  <span>{d ? Number(d) : "—"}</span>
                  <span>{m ? MONTHS[Number(m) - 1] : ""}</span>
                </span>
                <span className="ms-inbox-tx">
                  <span className="ms-oc-t">{e.title}</span>
                  <span className="ms-oc-s">{e.location_name || ""}</span>
                </span>
              </Link>
            );
          })}
          {upcoming.length ? null : <p className="ms-dash">—</p>}
        </div>
      </div>
      {greeting.error ? (
        <div role="status" className="cd-say">
          {greeting.error}
        </div>
      ) : null}
    </>
  );
}
