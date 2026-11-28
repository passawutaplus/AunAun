import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Link, Navigate, useLocation, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useFollowState } from "@/hooks/useFollow";
import { proxiedImageSrcSet, proxiedImageUrl } from "@/lib/imageProxy";
import { displayProfileAddress } from "@/lib/profileAddress";
import { SC_LINKS } from "../routes";
import { instagramHandle, instagramUrl, mailUrl, websiteLabel, websiteUrl } from "../lib/contactLinks";
import ScLoader from "../main/ScLoader";
import { profileHref } from "../main/useCreators";
import AboutPanel from "../profile/AboutPanel";
import MyEvents from "../profile/MyEvents";
import MyFollowing from "../profile/MyFollowing";
import MySaved from "../profile/MySaved";
import { count, toTile, toolsOf, type Tile } from "../profile/tiles";
import { useMyCatalogs, useMyProfile, useMyWorks } from "../profile/useMyProfile";
import "../styles/fonts.css";
import "../styles/tokens.css";
import "../styles/reset.css";
import "../styles/profile.css";
import "../styles/my-profile.css";

type Tab = "works" | "saved" | "events" | "following" | "about";
const TABS: ReadonlyArray<[Tab, string]> = [
  ["works", "Works"],
  ["saved", "Saved"],
  ["events", "Events"],
  ["following", "Following"],
  ["about", "About"],
];

/** Old URLs that land on a tab: /portfolio/saved and /collections → Saved, /portfolio/followers → Following. */
const tabOfPath = (path: string): Tab => (/^\/(portfolio\/saved|collections)\/?$/.test(path) ? "saved" : /^\/portfolio\/followers\/?$/.test(path) ? "following" : "works");

/** `/portfolio` — my own profile (mock MyProfile.dc.html, which must match Profile). */
export default function MyProfilePage() {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div className="pf-wait" aria-busy="true" />;
  if (!user) return <Navigate to={`${SC_LINKS.login}?redirect=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  return <MyProfileView uid={user.id} />;
}

function MyProfileView({ uid }: { uid: string }) {
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const profile = useMyProfile(uid);
  const p = profile.data ?? null;
  const counts = useFollowState(uid);
  const { q: worksQ, lock } = useMyWorks(uid);
  const { q: catalogsQ, setPublic: setCatalogPublic } = useMyCatalogs(uid);
  const works = useMemo(() => worksQ.data ?? [], [worksQ.data]);
  const catalogs = useMemo(() => (catalogsQ.data ?? []).filter((c) => c.title), [catalogsQ.data]);
  const [cat, setCat] = useState("all");

  const [toast, setToast] = useState("");
  const toastTimer = useRef<number | undefined>(undefined);
  const say = useCallback((t: string) => {
    window.clearTimeout(toastTimer.current);
    setToast(t);
    toastTimer.current = window.setTimeout(() => setToast(""), 2200);
  }, []);
  useEffect(() => () => window.clearTimeout(toastTimer.current), []);

  const asked = params.get("tab") as Tab | null;
  const tab: Tab = asked && TABS.some(([t]) => t === asked) ? asked : tabOfPath(location.pathname);
  const pickTab = (t: Tab) => {
    const next = new URLSearchParams(params);
    if (t === tabOfPath(location.pathname)) next.delete("tab");
    else next.set("tab", t);
    setParams(next, { replace: true });
  };

  const name = p?.display_name?.trim() || p?.username || "";
  const handle = p?.username ?? "";
  useEffect(() => {
    const before = document.title;
    document.title = name ? `${name} | samecor.` : "My Profile | samecor.";
    return () => {
      document.title = before;
    };
  }, [name]);

  const current = catalogs.find((k) => k.id === cat) ?? null;
  const tiles = useMemo(() => {
    const all = works.map((w) => {
      const t = toTile(w);
      return t ? { ...t, locked: w.status === "Private" } : null;
    }).filter((t): t is Tile & { locked: boolean } => !!t);
    if (!current) return all;
    const byId = new Map(all.map((t) => [t.id, t]));
    return current.projectIds.map((id) => byId.get(id)).filter((t): t is Tile & { locked: boolean } => !!t);
  }, [works, current]);

  if (profile.isPending) return <div className="pf-wait" aria-busy="true" />;

  const cats = p?.sc_categories ?? [];
  const city = p ? displayProfileAddress(p.profile_address, p.location, "short") : "";
  const meta = [cats.join(" · "), city].filter(Boolean).join(" · ");
  const bio = p?.bio?.trim() ?? "";
  const ig = instagramUrl(p?.instagram);
  const web = websiteUrl(p?.website);
  const mail = mailUrl(p?.contact_email);
  const avatar = proxiedImageUrl(p?.avatar_url, 256);
  const publicHref = profileHref({ user_id: uid, username: handle || null });

  const share = async () => {
    try {
      await navigator.clipboard?.writeText(window.location.origin + publicHref);
    } catch {
      /* clipboard blocked: the toast still confirms like the mock */
    }
    say("คัดลอกลิงก์โปรไฟล์แล้ว");
  };

  const toggleLock = (t: Tile & { locked: boolean }) => {
    lock.mutate({ id: t.id, locked: !t.locked });
    say(t.locked ? "โชว์ในโปรไฟล์แล้ว" : "ล็อกไว้ เห็นแค่คุณ");
  };

  const toggleCatalog = () => {
    if (!current) return;
    setCatalogPublic.mutate({ id: current.id, isPublic: !current.isPublic });
    say(current.isPublic ? `ซ่อน ${current.title} จากโปรไฟล์แล้ว` : `โชว์ ${current.title} ในโปรไฟล์แล้ว`);
  };

  return (
    <main className="sc-main pf-m mp-m">
      <div className="pf-grid">
        <aside aria-label="โปรไฟล์ของฉัน" className="pf-aside">
          {avatar ? <img alt="" src={avatar} className="pf-av" /> : <span aria-hidden="true" className="pf-av" />}
          <h1 className="pf-name">{name}</h1>
          {handle ? <span className="pf-handle">@{handle}</span> : null}
          {meta ? <p className="pf-meta">{meta}</p> : null}
          <div className="pf-stats">
            <button type="button" onClick={() => pickTab("works")}>
              <b>{count(works.length)}</b>ผลงาน
            </button>
            <div>
              <b>{count(counts.followers)}</b>ผู้ติดตาม
            </div>
            <button type="button" onClick={() => pickTab("following")}>
              <b>{count(counts.following)}</b>กำลังติดตาม
            </button>
          </div>
          {bio ? <p className="mp-bio">{bio}</p> : null}
          <div className="pf-acts mp-acts">
            {/* The mock opens My Studio → Profile; that page comes in step 10. */}
            <Link to={`${SC_LINKS.myStudio}?tab=profile`} className="mp-edit">
              <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20h4L19 9l-4-4L4 16z" /><path d="M13.5 6.5l4 4" /></svg>
              แก้ไขโปรไฟล์
            </Link>
            <button type="button" className="mp-share" onClick={() => void share()} aria-label="แชร์โปรไฟล์">
              <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5.5" r="2.5" /><circle cx="6" cy="12" r="2.5" /><circle cx="18" cy="18.5" r="2.5" /><path d="M8.2 10.8l7.6-4.1M8.2 13.2l7.6 4.1" /></svg>
              <span>แชร์โปรไฟล์</span>
            </button>
          </div>
          {ig || mail || web ? (
            <div className="pf-cc-row">
              {ig ? (
                <a href={ig} target="_blank" rel="noopener noreferrer" className="pf-cc" aria-label={`Instagram @${instagramHandle(p?.instagram)}`} title={`Instagram @${instagramHandle(p?.instagram)}`}>
                  <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.33" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="4" width="16" height="16" rx="4.5" /><circle cx="12" cy="12" r="3.6" /><path d="M16.8 7.2h.01" strokeWidth="2" /></svg>
                </a>
              ) : null}
              {mail ? (
                <a href={mail} className="pf-cc" aria-label="อีเมล" title="อีเมล">
                  <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.33" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5.5" width="18" height="13" rx="2" /><path d="M3.5 6.5l8.5 6.5 8.5-6.5" /></svg>
                </a>
              ) : null}
              {web ? (
                <a href={web} target="_blank" rel="noopener noreferrer" className="pf-cc" aria-label={websiteLabel(p?.website)} title={websiteLabel(p?.website)}>
                  <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.33" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="8.5" /><path d="M3.5 12h17M12 3.5c2.5 2.6 2.5 14.4 0 17M12 3.5c-2.5 2.6-2.5 14.4 0 17" /></svg>
                </a>
              ) : null}
            </div>
          ) : null}
          <Link to={publicHref} className="mp-public">
            ดูหน้าโปรไฟล์แบบคนอื่นเห็น ↗
          </Link>
        </aside>

        <section aria-label="ของฉัน" className="pf-card">
          <nav aria-label="ส่วนของโปรไฟล์" className="pf-tabs mp-tabs">
            {TABS.map(([t, label]) => (
              <button key={t} type="button" aria-pressed={tab === t} onClick={() => pickTab(t)} data-tab={t}>
                {label}
              </button>
            ))}
          </nav>

          {tab === "works" ? (
            <>
              {catalogs.length ? (
                <div className="pf-chips">
                  {[{ id: "all", title: "All" }, ...catalogs].map((k) => (
                    <button key={k.id} type="button" aria-pressed={cat === k.id} onClick={() => setCat(k.id)}>
                      {k.title}
                    </button>
                  ))}
                </div>
              ) : null}
              {current ? (
                <div className="mp-catbar">
                  <span className="mp-catbar-name">{current.title}</span>
                  <span className="mp-n">{count(current.projectIds.length)} งาน</span>
                  <span className="mp-grow" />
                  <button
                    type="button"
                    className="mp-pill mp-pill-white"
                    aria-pressed={current.isPublic}
                    title={current.isPublic ? "คนอื่นเห็น · กดเพื่อซ่อน" : "เห็นแค่คุณ · กดเพื่อโชว์"}
                    onClick={toggleCatalog}
                  >
                    {current.isPublic ? "Public" : "Private"}
                  </button>
                </div>
              ) : null}
              <MyPin tiles={tiles} onLock={toggleLock} />
              {worksQ.isPending ? <ScLoader label="กำลังโหลดผลงาน" /> : null}
            </>
          ) : null}

          {tab === "saved" ? <MySaved uid={uid} say={say} /> : null}
          {tab === "events" ? <MyEvents uid={uid} say={say} /> : null}
          {tab === "following" ? <MyFollowing uid={uid} /> : null}

          {tab === "about" ? (
            <AboutPanel
              bio={bio}
              cats={cats}
              tools={toolsOf(works.filter((w) => w.status === "Published"))}
              city={city}
              followers={counts.followers}
              ig={ig}
              web={web}
              mail={mail}
              instagram={p?.instagram ?? null}
              website={p?.website ?? null}
              email={p?.contact_email ?? null}
            />
          ) : null}
        </section>
      </div>
      {toast ? (
        <div role="status" className="mp-toast">
          {toast}
        </div>
      ) : null}
    </main>
  );
}

/** My works: each opens over this page; the corner button is the globe (shown) / lock (only me). */
function MyPin({ tiles, onLock }: { tiles: Array<Tile & { locked: boolean }>; onLock: (t: Tile & { locked: boolean }) => void }) {
  const location = useLocation();
  const linkState = useMemo(() => ({ backgroundLocation: location, scList: tiles.map((t) => t.id) }), [location, tiles]);
  return (
    <div className="pf-pin">
      {tiles.map((t, i) => {
        const style: CSSProperties = { aspectRatio: String(t.ratio ?? 1) };
        const label = t.locked ? "เห็นแค่คุณ · กดเพื่อโชว์" : "คนอื่นเห็น · กดเพื่อล็อก";
        return (
          <div key={t.id} className="pf-tile" style={style}>
            <img
              data-sc-work=""
              className="pf-art"
              src={proxiedImageUrl(t.cover, 640)}
              srcSet={proxiedImageSrcSet(t.cover, [384, 640, 828, 1080]) || undefined}
              sizes="(max-width: 600px) 50vw, 30vw"
              alt=""
              loading={i < 6 ? "eager" : "lazy"}
              decoding="async"
              style={t.ratio ? undefined : { objectFit: "contain" }}
            />
            <span className="pf-art pf-shade" aria-hidden="true" />
            <Link to={`/showcase/${t.id}`} state={linkState} aria-label={`เปิด ${t.title}`} className="pf-open" />
            <span className="pf-tt">
              <b>{t.title}</b>
              {t.cat ? <span>{t.cat}</span> : null}
            </span>
            <button type="button" className="pf-sv mp-vis" aria-pressed={!t.locked} aria-label={label} title={label} data-locked={t.locked ? "" : undefined} onClick={() => onLock(t)}>
              {t.locked ? (
                <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="11" width="14" height="9.5" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>
              ) : (
                <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.9)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="8.5" /><path d="M3.5 12h17M12 3.5c2.5 2.6 2.5 14.4 0 17M12 3.5c-2.5 2.6-2.5 14.4 0 17" /></svg>
              )}
            </button>
          </div>
        );
      })}
    </div>
  );
}
