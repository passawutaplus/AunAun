import { useCallback, useEffect, useRef, useState } from "react";
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useFollowState } from "@/hooks/useFollow";
import { getStudioEvents, type StudioWork } from "@/server/queries/studio";
import ScLoader from "../main/ScLoader";
import { useMyCatalogs } from "../profile/useMyProfile";
import { SC_LINKS } from "../routes";
import StudioCatalogs from "../studio/StudioCatalogs";
import StudioEvents from "../studio/StudioEvents";
import StudioInsights from "../studio/StudioInsights";
import StudioOverview, { type StudioTab } from "../studio/StudioOverview";
import StudioProfile from "../studio/StudioProfile";
import StudioWorks from "../studio/StudioWorks";
import { useDeleteWork, useStudioProfile, useStudioWorks } from "../studio/useStudio";
import "../styles/fonts.css";
import "../styles/tokens.css";
import "../styles/reset.css";
import "../styles/profile.css";
import "../styles/my-studio.css";

const TABS: ReadonlyArray<readonly [StudioTab, string]> = [
  ["overview", "Overview"],
  ["profile", "Profile"],
  ["works", "Works"],
  ["event", "Event"],
  ["catalogs", "Catalogs"],
  ["insights", "Insights"],
];
const isTab = (v: string | null): v is StudioTab => !!v && TABS.some(([k]) => k === v);

/** Old URLs of the old studio land on the matching tab. */
const PATH_TAB: Record<string, StudioTab> = {
  "/dashboard/projects": "works",
  "/portfolio/manage": "works",
  "/dashboard/catalogs": "catalogs",
  "/dashboard/insights": "insights",
  "/dashboard/exhibition": "event",
};

export const studioHref = (tab: StudioTab) => (tab === "overview" ? SC_LINKS.myStudio : `${SC_LINKS.myStudio}?tab=${tab}`);

/** `/dashboard` — My Studio, the back office: profile, works, events, catalogs, numbers (mock MyStudio.dc.html). */
export default function MyStudioPage() {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div className="ms-wait" aria-busy="true" />;
  if (!user) return <Navigate to={`${SC_LINKS.login}?redirect=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  return <MyStudioView uid={user.id} />;
}

function MyStudioView({ uid }: { uid: string }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const param = params.get("tab");
  const tab: StudioTab = isTab(param) ? param : PATH_TAB[location.pathname.replace(/\/+$/, "")] ?? "overview";
  const goTab = useCallback((t: StudioTab) => navigate(studioHref(t), { replace: true, preventScrollReset: true }), [navigate]);

  const profileQ = useStudioProfile(uid);
  const profile = profileQ.data ?? null;
  const worksQ = useStudioWorks(uid);
  const works = worksQ.data ?? [];
  const counts = useFollowState(uid);
  const catalogs = useMyCatalogs(uid).q.data ?? [];
  const events = useQuery({ queryKey: ["sc-studio-events", uid], queryFn: () => getStudioEvents(uid), enabled: tab === "event", staleTime: 30_000 });
  const del = useDeleteWork(uid);
  const [confirm, setConfirm] = useState<StudioWork | null>(null);

  const [toast, setToast] = useState("");
  const toastTimer = useRef<number | undefined>(undefined);
  const say = useCallback((t: string) => {
    window.clearTimeout(toastTimer.current);
    setToast(t);
    toastTimer.current = window.setTimeout(() => setToast(""), 2200);
  }, []);
  useEffect(() => () => window.clearTimeout(toastTimer.current), []);

  const handle = profile?.username ?? "";

  return (
    <main className="sc-main pf-m ms-m">
      <div className="pf-grid">
        <aside aria-label="My Studio" className="ms-aside">
          <h1>My Studio</h1>
          {handle ? <p>@{handle}</p> : null}
          <div className="ms-aside-btns">
            <Link to={SC_LINKS.upload} className="ms-hb2 ms-hb2-ink ms-new-work">
              <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
              ลงงานใหม่
            </Link>
            <Link to={SC_LINKS.eventNew} className="ms-hb2 ms-hb2-soft">
              <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
                <path d="M3.5 10h17M8 3v4M16 3v4" />
              </svg>
              ลงอีเว้นท์
            </Link>
          </div>
        </aside>

        <section aria-label="My Studio" className="ms-card">
          <nav aria-label="ส่วนของ Studio" className="ms-tabs">
            {TABS.map(([k, label]) => (
              <button key={k} type="button" aria-pressed={tab === k} onClick={() => goTab(k)}>
                {label}
              </button>
            ))}
          </nav>

          {profileQ.isPending || worksQ.isPending ? (
            <ScLoader label="กำลังโหลด" />
          ) : tab === "overview" ? (
            <StudioOverview uid={uid} profile={profile} works={works} followers={counts.followers} goTab={goTab} />
          ) : tab === "profile" ? (
            <StudioProfile key={profile?.user_id ?? "none"} uid={uid} profile={profile} say={say} />
          ) : tab === "works" ? (
            <StudioWorks works={works} onDelete={setConfirm} />
          ) : tab === "event" ? (
            events.isPending ? <ScLoader label="กำลังโหลด" /> : <StudioEvents events={events.data ?? []} />
          ) : tab === "catalogs" ? (
            <StudioCatalogs uid={uid} catalogs={catalogs} works={works} say={say} />
          ) : (
            <StudioInsights uid={uid} works={works} />
          )}
        </section>
      </div>

      {confirm ? (
        <div className="ms-veil">
          <div aria-hidden="true" className="ms-veil-hit" onClick={() => setConfirm(null)} />
          {/* The mock deletes at once; a work and its pictures cannot come back, so it asks first (question for the owner/Beam). */}
          <div className="ms-box" role="dialog" aria-modal="true" aria-labelledby="ms-del-h">
            <h2 id="ms-del-h">ลบ {confirm.title?.trim() || "Untitled"}?</h2>
            <p>ลบแล้วกู้คืนไม่ได้</p>
            <div className="ms-box-row">
              <button type="button" className="ms-btn-line" autoFocus onClick={() => setConfirm(null)}>
                ยกเลิก
              </button>
              <button
                type="button"
                className="ms-btn-ink ms-btn-del"
                onClick={() => {
                  const w = confirm;
                  setConfirm(null);
                  del.mutate(w.id, { onSuccess: () => say("ลบแล้ว"), onError: () => say("ลบไม่สำเร็จ") });
                }}
              >
                ลบ
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {toast ? (
        <div role="status" className="ms-toast">
          {toast}
        </div>
      ) : null}
    </main>
  );
}
