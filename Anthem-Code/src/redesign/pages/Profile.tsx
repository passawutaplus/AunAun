import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Link, Navigate, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useProfilesByIds } from "@/core/profiles/useProfilesByIds";
import { useAuth } from "@/hooks/useAuth";
import { useBlockedUserIds } from "@/hooks/useBlockedUserIds";
import { useFollowState } from "@/hooks/useFollow";
import { eventPath } from "@/lib/exhibitionEvents";
import { proxiedImageSrcSet, proxiedImageUrl } from "@/lib/imageProxy";
import { displayProfileAddress } from "@/lib/profileAddress";
import { parseProfileVisibility } from "@/lib/profileVisibility";
import { SC_LINKS } from "../routes";
import { instagramHandle, instagramUrl, mailUrl, websiteLabel, websiteUrl } from "../lib/contactLinks";
import AboutPanel from "../profile/AboutPanel";
import { count, toTile, toolsOf, type Tile } from "../profile/tiles";
import ScLoader from "../main/ScLoader";
import { profileHref } from "../main/useCreators";
import { useFollows } from "../main/useFollows";
import { EVENT_KIND } from "../main/useHomeEvents";
import { useSaveFlow } from "../main/useSaveFlow";
import { useGreet } from "../shell/panels";
import {
  useProfileCatalogs,
  useProfileCollections,
  useProfileEvents,
  useProfileFollowers,
  useProfilePage,
  useProfileWorks,
  type ProfileEvent,
} from "../profile/useProfilePage";
import NotFound from "./NotFound";
import { indexableBySearch, useNoIndex } from "../lib/visibility";
import "../styles/fonts.css";
import "../styles/tokens.css";
import "../styles/reset.css";
import "../styles/profile.css";

type Tab = "works" | "collections" | "events" | "about";
const TAB_LABEL: Record<Tab, string> = { works: "Works", collections: "Collections", events: "Events", about: "About" };
type EventFilter = "all" | "host" | "int";

/** `/@handle` (through `/:vanityHandle`) and `/u/:userId`. */
export default function ProfilePage() {
  const { userId, vanityHandle } = useParams();
  // Single-segment URLs that are not a handle: the 404 of the new design on the same URL (step 14).
  if (!userId && !vanityHandle?.startsWith("@")) return <NotFound />;
  return <ProfileView key={userId ?? vanityHandle} slug={userId ?? vanityHandle!.slice(1)} byId={!!userId} />;
}

function ProfileView({ slug, byId }: { slug: string; byId: boolean }) {
  const profile = useProfilePage(slug);
  const p = profile.data ?? null;
  const uid = p?.user_id;
  // Settings → Privacy "ให้ค้นเจอจาก Google" off.
  useNoIndex(!!p && !indexableBySearch(p.public_visibility));
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const blocked = useBlockedUserIds();
  const follows = useFollows();
  const counts = useFollowState(uid);
  const saves = useSaveFlow();
  const greeting = useGreet();
  const worksQ = useProfileWorks(uid);
  const catalogsQ = useProfileCatalogs(uid);
  const catalogs = useMemo(() => catalogsQ.data ?? [], [catalogsQ.data]);
  const collections = useProfileCollections(uid);
  const events = useProfileEvents(uid);
  const followerIds = useProfileFollowers(uid, follows.ids);
  const faces = useProfilesByIds(followerIds.slice(0, 20));

  const [cat, setCat] = useState("all");
  const [openColl, setOpenColl] = useState<string | null>(null);
  const [evFilter, setEvFilter] = useState<EventFilter>("all");
  const [fOpen, setFOpen] = useState(false);

  const works = useMemo(() => worksQ.data ?? [], [worksQ.data]);
  const isSelf = !!user?.id && user.id === uid;
  const name = p?.display_name?.trim() || p?.username || "";
  const handle = p?.username ?? "";

  const tabs = useMemo<Tab[]>(
    () => ["works", ...(collections.list.length ? (["collections"] as const) : []), ...(events.list.length ? (["events"] as const) : []), "about"],
    [collections.list.length, events.list.length],
  );
  const asked = params.get("tab") as Tab | null;
  const tab: Tab = asked && tabs.includes(asked) ? asked : "works";
  const pickTab = (t: Tab) => {
    setOpenColl(null);
    const next = new URLSearchParams(params);
    if (t === "works") next.delete("tab");
    else next.set("tab", t);
    setParams(next, { replace: true });
  };

  useEffect(() => {
    if (!name) return;
    const before = document.title;
    document.title = handle ? `${name} (@${handle}) | samecor.` : `${name} | samecor.`;
    return () => {
      document.title = before;
    };
  }, [name, handle]);

  const tiles = useMemo(() => {
    const all = works.map(toTile).filter((t): t is Tile => !!t);
    const c = catalogs.find((k) => k.id === cat);
    if (!c) return all;
    const byId = new Map(all.map((t) => [t.id, t]));
    return c.projectIds.map((id) => byId.get(id)).filter((t): t is Tile => !!t);
  }, [works, catalogs, cat]);
  const shownCatalogs = useMemo(() => catalogs.filter((c) => c.title && c.projectIds.length), [catalogs]);

  const coll = openColl ? collections.list.find((c) => c.id === openColl) ?? null : null;
  const collTiles = useMemo(() => (coll ? coll.works.map(toTile).filter((t): t is Tile => !!t) : []), [coll]);

  const hostedN = events.list.filter((e) => e.hosted).length;
  const shownEvents = events.list.filter((e) => evFilter === "all" || (evFilter === "host" ? e.hosted : !e.hosted));

  if (profile.isPending) return <div className="pf-wait" aria-busy="true" />;
  if (!p || (!isSelf && blocked.has(p.user_id))) return <NotFound />;
  // The old site sends /u/<id> to /@handle when the person has one.
  if (byId && handle) return <Navigate to={`/@${handle}${location.search}`} replace />;

  const vis = parseProfileVisibility(p.public_visibility);
  const city = vis.location ? displayProfileAddress(p.profile_address, p.location, "short") : "";
  const cats = p.sc_categories ?? [];
  const meta = [cats.join(" · "), city].filter(Boolean).join(" · ");
  const ig = vis.socials ? instagramUrl(p.instagram) : "";
  const web = vis.socials ? websiteUrl(p.website) : "";
  const mail = mailUrl(p.contact_email);
  const following = follows.ids.has(p.user_id);
  const avatar = proxiedImageUrl(p.avatar_url, 256);

  const toggleFollow = () => {
    if (!follows.signedIn) navigate(SC_LINKS.login);
    else follows.toggle(p.user_id);
  };

  // Small chat window (ChatDock) on larger screens, the chat page on phones; a failure shows for a moment.
  const greet = (el: HTMLElement) => {
    if (!user) {
      navigate(SC_LINKS.login);
      return;
    }
    greeting.greet({ otherId: p.user_id }, el);
  };

  const faceMap = faces.data?.map ?? {};
  const firstFollower = followerIds[0] ? faceMap[followerIds[0]] : undefined;
  const followerLine = firstFollower?.username
    ? followerIds.length > 1
      ? `${firstFollower.username} และอีก ${count(followerIds.length - 1)} คนติดตามอยู่`
      : `${firstFollower.username} ติดตามอยู่`
    : "";
  const followerList = followerIds.slice(0, 20).map((id) => faceMap[id]).filter((f): f is NonNullable<typeof f> => !!f);

  const contactIcons = ig || mail || web;

  return (
    <main className="sc-main pf-m">
      <div className="pf-grid">
        <aside aria-label="ข้อมูลศิลปิน" className="pf-aside">
          {avatar ? <img alt="" src={avatar} className="pf-av" /> : <span aria-hidden="true" className="pf-av" />}
          <h1 className="pf-name">{name}</h1>
          {handle ? <span className="pf-handle">@{handle}</span> : null}
          {meta ? <p className="pf-meta">{meta}</p> : null}
          <div className="pf-stats">
            <button type="button" onClick={() => pickTab("works")}>
              <b>{count(works.length)}</b>ผลงาน
            </button>
            <button type="button" aria-expanded={fOpen} onClick={() => setFOpen((o) => !o)}>
              <b>{count(counts.followers)}</b>ผู้ติดตาม
            </button>
            <div>
              <b>{count(counts.following)}</b>กำลังติดตาม
            </div>
          </div>
          {isSelf ? null : (
            <div className="pf-acts">
              <button type="button" aria-pressed={following} className="pf-follow" onClick={toggleFollow}>
                {following ? "✓ ติดตามแล้ว" : "ติดตาม"}
              </button>
              <button type="button" className="pf-greet" onClick={(e) => greet(e.currentTarget)}>
                <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.33" strokeLinejoin="round">
                  <path d="M12 3.5a8.5 8.5 0 0 1 0 17c-1.5 0-2.9-.4-4.1-1L3.5 20.5l1.1-4.2A8.5 8.5 0 0 1 12 3.5z" />
                </svg>
                ทักทาย
              </button>
            </div>
          )}
          {contactIcons ? (
            <div className="pf-cc-row">
              {ig ? (
                <a href={ig} target="_blank" rel="noopener noreferrer" className="pf-cc" aria-label={`Instagram @${instagramHandle(p.instagram)}`} title={`Instagram @${instagramHandle(p.instagram)}`}>
                  <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.33" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="4" width="16" height="16" rx="4.5" /><circle cx="12" cy="12" r="3.6" /><path d="M16.8 7.2h.01" strokeWidth="2" /></svg>
                </a>
              ) : null}
              {mail ? (
                <a href={mail} className="pf-cc" aria-label="อีเมล" title="อีเมล">
                  <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.33" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5.5" width="18" height="13" rx="2" /><path d="M3.5 6.5l8.5 6.5 8.5-6.5" /></svg>
                </a>
              ) : null}
              {web ? (
                <a href={web} target="_blank" rel="noopener noreferrer" className="pf-cc" aria-label={websiteLabel(p.website)} title={websiteLabel(p.website)}>
                  <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.33" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="8.5" /><path d="M3.5 12h17M12 3.5c2.5 2.6 2.5 14.4 0 17M12 3.5c-2.5 2.6-2.5 14.4 0 17" /></svg>
                </a>
              ) : null}
            </div>
          ) : null}
          {followerLine ? (
            <button type="button" aria-expanded={fOpen} className="pf-fol-btn" onClick={() => setFOpen((o) => !o)}>
              <span className="pf-faces">
                {followerList.slice(0, 4).map((f) => (
                  <span key={f.id} aria-hidden="true" style={f.avatar_url ? { backgroundImage: `url(${JSON.stringify(proxiedImageUrl(f.avatar_url, 64))})` } : undefined} />
                ))}
              </span>
              {followerLine}
            </button>
          ) : null}
          {fOpen && followerList.length ? (
            <ul aria-label="เพื่อนที่ติดตาม" className="pf-fol-list">
              {followerList.map((f) => (
                <li key={f.id}>
                  <Link to={profileHref({ user_id: f.id, username: f.username })}>
                    <span aria-hidden="true" style={f.avatar_url ? { backgroundImage: `url(${JSON.stringify(proxiedImageUrl(f.avatar_url, 64))})` } : undefined} />
                    {f.username || f.display_name}
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </aside>

        <section aria-label="ผลงาน" className="pf-card">
          <nav aria-label="ส่วนของโปรไฟล์" className="pf-tabs">
            {tabs.map((t) => (
              <button key={t} type="button" aria-pressed={tab === t} onClick={() => pickTab(t)}>
                {TAB_LABEL[t]}
              </button>
            ))}
          </nav>

          {tab === "works" ? (
            <>
              {shownCatalogs.length ? (
                <div className="pf-chips">
                  {[{ id: "all", title: "All" }, ...shownCatalogs].map((k) => (
                    <button key={k.id} type="button" aria-pressed={cat === k.id} onClick={() => setCat(k.id)}>
                      {k.title}
                    </button>
                  ))}
                </div>
              ) : null}
              <Pin tiles={tiles} saved={saves.ids} onSave={saves.toggle} />
              {worksQ.isPending ? <ScLoader label="กำลังโหลดผลงาน" /> : null}
            </>
          ) : null}

          {tab === "collections" ? (
            coll ? (
              <>
                <div className="pf-coll-hd">
                  <button type="button" onClick={() => setOpenColl(null)} aria-label="กลับไปที่ Collections" className="pf-cc">
                    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#282929" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 5l-7 7 7 7" /></svg>
                  </button>
                  <span className="pf-coll-name">{coll.name}</span>
                  <span className="pf-coll-n">{count(coll.works.length)} งาน</span>
                </div>
                <Pin tiles={collTiles} saved={saves.ids} onSave={saves.toggle} />
              </>
            ) : (
              <div className="pf-colls">
                {collections.list.map((c) => {
                  const covers = c.works.slice(0, 3).map((w) => toTile(w)?.cover ?? "");
                  return (
                    <button key={c.id} type="button" className="pf-coll" onClick={() => setOpenColl(c.id)}>
                      <span className="pf-mosaic">
                        {[0, 1, 2].map((i) => (covers[i] ? <img key={i} src={proxiedImageUrl(covers[i], 640)} alt="" loading="lazy" decoding="async" /> : <span key={i} />))}
                      </span>
                      <span className="pf-coll-name">{c.name}</span>
                      <span className="pf-coll-n">{count(c.works.length)} งาน</span>
                    </button>
                  );
                })}
              </div>
            )
          ) : null}

          {tab === "events" ? (
            <>
              {hostedN && hostedN < events.list.length ? (
                <div className="pf-chips">
                  {(
                    [
                      ["all", "All"],
                      ["host", "Hosted"],
                      ["int", "Interested"],
                    ] as const
                  ).map(([k, label]) => (
                    <button key={k} type="button" aria-pressed={evFilter === k} onClick={() => setEvFilter(k)}>
                      {label}
                    </button>
                  ))}
                </div>
              ) : null}
              <div>
                {shownEvents.map((e) => (
                  <EventRow key={e.id} e={e} />
                ))}
              </div>
            </>
          ) : null}

          {tab === "about" ? (
            <AboutPanel
              bio={vis.bio ? p.bio?.trim() ?? "" : ""}
              cats={cats}
              tools={p.skills?.length ? p.skills.join(", ") : toolsOf(works)}
              city={city}
              followers={counts.followers}
              ig={ig}
              web={web}
              mail={mail}
              instagram={p.instagram}
              website={p.website}
              email={p.contact_email}
              cvUserId={p.user_id}
            />
          ) : null}
        </section>
      </div>
      {saves.element}
      {greeting.error ? (
        <div role="status" className="cd-say">
          {greeting.error}
        </div>
      ) : null}
    </main>
  );
}

/** Works in columns, each frame at the picture's own ratio (never cropped). Opens over this page. */
function Pin({ tiles, saved, onSave }: { tiles: Tile[]; saved: ReadonlySet<string>; onSave: (w: { id: string; title: string }, el?: HTMLElement | null) => void }) {
  const location = useLocation();
  const linkState = useMemo(() => ({ backgroundLocation: location, scList: tiles.map((t) => t.id) }), [location, tiles]);
  return (
    <div className="pf-pin">
      {tiles.map((t, i) => {
        const style: CSSProperties = { aspectRatio: String(t.ratio ?? 1) };
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
            <Link to={`/showcase/${t.id}`} state={linkState} aria-label={`เปิดผลงาน ${t.title}`} className="pf-open" />
            <span className="pf-tt">
              <b>{t.title}</b>
              {t.cat ? <span>{t.cat}</span> : null}
            </span>
            <button type="button" className="pf-sv" aria-label={`เก็บ ${t.title}`} aria-pressed={saved.has(t.id)} onClick={(e) => onSave({ id: t.id, title: t.title }, e.currentTarget)}>
              <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" stroke="rgba(255,255,255,.85)" strokeWidth="1.5" strokeLinejoin="round">
                <path d="M6 3h12v18l-6-4.5L6 21z" />
              </svg>
            </button>
          </div>
        );
      })}
    </div>
  );
}

function EventRow({ e }: { e: ProfileEvent }) {
  const year = (e.starts_on ?? e.ends_on ?? "").slice(0, 4);
  return (
    <Link to={eventPath(e)} className="pf-evr">
      <span className="pf-ev-year">{year}</span>
      {e.cover_url ? <img alt="" src={proxiedImageUrl(e.cover_url, 320)} loading="lazy" decoding="async" className="pf-ev-img" /> : <span aria-hidden="true" className="pf-ev-img" />}
      <span className="pf-ev-body">
        <span className="pf-ev-kind">
          <span>{EVENT_KIND[e.category] ?? EVENT_KIND.other}</span>
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
    </Link>
  );
}
