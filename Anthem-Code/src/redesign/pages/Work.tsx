import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams, type Location } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useFeedProjectSelect } from "@/hooks/useFeedProjectSelect";
import { openConnectChat } from "@/lib/chat/openConnectChat";
import { shareFromApp } from "@/lib/nativeShell";
import { getBackgroundLocation } from "@/lib/projectOverlay";
import { proxiedImageSrcSet, proxiedImageUrl } from "@/lib/imageProxy";
import type { ShowcaseRow } from "@/server/queries/showcase";
import { SC_LINKS } from "../routes";
import { homeWorksQuery, profileHref } from "../main/useCreators";
import { useFollows } from "../main/useFollows";
import { useSaveFlow } from "../main/useSaveFlow";
import { exploreHref, similarHref } from "../explore/explore";
import { ensureTextFonts } from "../lib/textFonts";
import { isScContent } from "../work/workContent";
import WorkBody, { bodyFromBlocks } from "../work/WorkBody";
import WorkComments from "../work/WorkComments";
import { useImageLikes, useOwnerWorks, useWork, useWorkCatalog } from "../work/useWork";
import { formatCount, licenceLine, neighbour, pickSimilar, workDateLine } from "../work/workContent";
import NotFound from "./NotFound";
import { instagramUrl, websiteUrl } from "../lib/contactLinks";
import { indexableBySearch, useNoIndex } from "../lib/visibility";
import "../styles/fonts.css";
import "../styles/tokens.css";
import "../styles/reset.css";
import "../styles/work.css";
import "../styles/work-body.css";

/** Router state of a work opened over another page (home grid): the page underneath and the ‹ › list. */
export type WorkOverlayState = { backgroundLocation: Location; scList?: string[] };

const calm = () => !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

type ViewProps = {
  id: string;
  overlay: boolean;
  /** Works that ‹ › go through, in order. */
  list: readonly string[];
  /** Router state and history mode for links to other works (the overlay stays open and swaps the work). */
  linkState?: unknown;
  close: () => void;
};

/**
 * Work page (mock: pages/Work.dc.html). Two modes: over the home page (`overlay`, a floating card on a
 * blurred veil) and on its own (`/showcase/:id` opened directly). Pictures are never cropped.
 */
function WorkView({ id, overlay, list, linkState, close }: ViewProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { work, owner, media, text } = useWork(id);
  const row = work.data;
  const who = owner.data;
  // The owner turned "ให้ค้นเจอจาก Google" off (Settings → Privacy): their works are not indexed either.
  useNoIndex(!!who && !indexableBySearch(who.public_visibility));
  const ownerId = row?.owner_id ?? null;
  const isOwn = !!user && !!ownerId && user.id === ownerId;

  const handle = who?.username || who?.display_name?.trim() || "";
  const artistName = who?.display_name?.trim() || who?.username || "";
  const title = row?.title?.trim() || "";
  const avatar = proxiedImageUrl(who?.avatar_url, 96);
  const profHref = isOwn ? SC_LINKS.myProfile : who ? profileHref(who) : SC_LINKS.home;

  const likes = useImageLikes(id, media.find((m) => m.kind === "image")?.url);
  const firstAlt = artistName ? `${title} โดย ${artistName}` : title;
  const body = useMemo(() => (row && isScContent(row.content_blocks) ? bodyFromBlocks(row.content_blocks, row.media_sizes) : null), [row]);
  useEffect(() => {
    if (body?.some((b) => b.kind === "text" || b.kind === "row")) ensureTextFonts();
  }, [body]);
  /**
   * Buttons on each picture (owner 2026-11-28, from the old site): ♡ like (per picture), "ภาพคล้าย"
   * (pictures like this one), share. Same white pills as the mock's like button, bottom left.
   */
  const pictureTools = (url: string, i: number) => {
    const like = likes.likeFor(url, i);
    return (
      <div className="wk-ptools">
        {like ? (
          <button
            type="button"
            className="wk-lk"
            aria-label={`ถูกใจ ${formatCount(like.likes)}`}
            aria-pressed={like.liked}
            data-on={like.liked ? "" : undefined}
            onClick={() => {
              if (!likes.toggle(url)) navigate(SC_LINKS.login);
            }}
          >
            <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill={like.liked ? "#282929" : "none"} stroke="#282929" strokeWidth="1.33" strokeLinejoin="round">
              <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />
            </svg>
            {formatCount(like.likes)}
          </button>
        ) : null}
        <Link to={similarHref(id, url)} className="wk-lk wk-sim" title="ดูภาพคล้าย" aria-label="ภาพคล้าย">
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#282929" strokeWidth="1.33" strokeLinejoin="round">
            <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
            <circle cx="9" cy="9.5" r="1.6" />
            <path d="M4 17l5-4.5 4 3.5 3-2.5 4 3.5" />
          </svg>
          <span>ภาพคล้าย</span>
        </Link>
        <button type="button" className="wk-lk wk-lk-ic" aria-label="แชร์" title="แชร์" onClick={() => void share()}>
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#282929" strokeWidth="1.33" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 15V3.5M7.5 8L12 3.5 16.5 8M5 12.5V19a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 19 19v-6.5" />
          </svg>
        </button>
      </div>
    );
  };
  const follows = useFollows();
  const followed = !!ownerId && follows.ids.has(ownerId);
  const saves = useSaveFlow();
  const saved = saves.ids.has(id);
  const { catalog, items: catalogItems } = useWorkCatalog(id);
  const { data: moreRows = [] } = useOwnerWorks(ownerId, id);
  const visible = useFeedProjectSelect();
  const { data: home } = useQuery(homeWorksQuery);
  const similar = useMemo(
    () => (row ? pickSimilar(visible(home?.works ?? []), { id, owner_id: row.owner_id, sc_category: row.sc_category }) : []),
    [row, home, visible, id],
  );
  const nameOfOwner = useMemo(() => new Map((home?.profiles ?? []).map((p) => [p.user_id, p.display_name?.trim() || p.username || ""])), [home]);

  const [toast, setToast] = useState("");
  const toastTimer = useRef<number | undefined>(undefined);
  const say = useCallback((t: string) => {
    window.clearTimeout(toastTimer.current);
    setToast(t);
    toastTimer.current = window.setTimeout(() => setToast(""), 1800);
  }, []);
  useEffect(() => () => window.clearTimeout(toastTimer.current), []);

  // ‹ › and the works further down swap the work in place; the overlay stays open.
  const go = useCallback(
    (to: string | null) => {
      if (to && to !== id) navigate(`/showcase/${to}`, { replace: true, state: linkState });
    },
    [navigate, id, linkState],
  );
  const prevId = neighbour(list, id, -1);
  const nextId = neighbour(list, id, 1);

  // Over the home page, closing plays the opening backwards (owner 2026-11-28): the card sinks and
  // fades, the buttons and the veil fade out, then the page underneath is back.
  const cardRef = useRef<HTMLElement>(null);
  const closing = useRef(false);
  const dismiss = useCallback(() => {
    const card = cardRef.current;
    const layer = card?.closest(".wk-layer");
    if (!overlay || calm() || !card || !layer || typeof card.animate !== "function") return close();
    if (closing.current) return;
    closing.current = true;
    const out = "cubic-bezier(.55, 0, .78, 0)";
    const runs = [
      card.animate([{ opacity: 1, transform: "none" }, { opacity: 0, transform: "translateY(120px)" }], { duration: 520, easing: out, fill: "forwards" }),
      ...Array.from(layer.querySelectorAll<HTMLElement>(".wk-ui, .wk-rail")).map((el) => el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 240, easing: "ease", fill: "forwards" })),
      ...Array.from(layer.querySelectorAll<HTMLElement>(".wk-veil")).map((el) => el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 380, delay: 200, easing: "ease", fill: "forwards" })),
    ];
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      close();
    };
    void Promise.all(runs.map((a) => a.finished)).then(finish, finish);
    window.setTimeout(finish, 900);
  }, [overlay, close]);

  // Esc closes (the save popup handles its own Esc first).
  const toastOpen = saves.open;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !toastOpen) dismiss();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [dismiss, toastOpen]);

  useEffect(() => {
    if (!title) return;
    const before = document.title;
    document.title = artistName ? `${title} — ${artistName} | samecor.` : `${title} | samecor.`;
    return () => {
      document.title = before;
    };
  }, [title, artistName]);

  // Another work in the same window: back to the top, the card fades in again (mock C7).
  const firstId = useRef(id);
  useLayoutEffect(() => {
    if (firstId.current === id) return;
    const layer = cardRef.current?.closest(".wk-layer");
    if (layer) layer.scrollTop = 0;
    else window.scrollTo(0, 0);
    if (!calm()) {
      cardRef.current?.animate?.(
        [{ opacity: 0, transform: "translateY(24px)" }, { opacity: 1, transform: "none" }],
        { duration: 600, easing: "cubic-bezier(.22,1,.36,1)" },
      );
    }
  }, [id]);

  const share = async () => {
    const url = `${window.location.origin}/showcase/${id}`;
    // In the store apps the phone's share sheet opens (as the old site); on the web the link is copied (mock).
    if (shareFromApp({ title: title || "SAMECOR", url })) return;
    try {
      await navigator.clipboard?.writeText(url);
    } catch {
      // clipboard blocked: the toast still confirms the action like the mock
    }
    say("คัดลอกลิงก์แล้ว");
  };

  const greet = async () => {
    if (!user) {
      navigate(SC_LINKS.login);
      return;
    }
    if (!ownerId) return;
    // The floating chat (ChatDock) comes with the Chat step; until then the old chat room opens.
    try {
      const room = await openConnectChat(user.id, ownerId, "");
      navigate(`/chat/${room}`);
    } catch (e) {
      say(e instanceof Error && e.message ? e.message : "เปิดแชทไม่สำเร็จ");
    }
  };

  const toggleFollow = () => {
    if (!ownerId) return;
    if (!follows.signedIn) navigate(SC_LINKS.login);
    else follows.toggle(ownerId);
  };

  const toComments = () => document.getElementById("cm-h")?.scrollIntoView({ behavior: calm() ? "auto" : "smooth", block: "start" });

  if (work.isPending) return <div className={overlay ? "wk-wait" : "wk-wait wk-wait-page"} aria-busy="true" />;
  if (!row) return overlay ? <div className="wk-missing"><NotFound /></div> : <NotFound />;

  const igUrl = instagramUrl(who?.instagram);
  const mailUrl = who?.contact_email?.trim() ? `mailto:${who.contact_email.trim()}` : "";
  const webUrl = websiteUrl(who?.website);
  const toolList = (row.tools ?? []).filter(Boolean);
  const tools = toolList.join(", ");
  const tags = (row.tags ?? []).filter((t) => t && !t.includes(":"));
  const licence = licenceLine(row.license_type, handle);

  const tile = (w: ShowcaseRow, withArtist: boolean) => {
    const cover = w.cover_url || w.gallery_urls?.[0] || "";
    const ratio = w.cover_width && w.cover_height ? w.cover_width / w.cover_height : null;
    return (
      <Link key={w.id} to={`/showcase/${w.id}`} state={linkState} replace={overlay} className="wk-mt">
        <img
          data-sc-work=""
          className="wk-art"
          src={proxiedImageUrl(cover, 640)}
          srcSet={proxiedImageSrcSet(cover, [384, 640, 828]) || undefined}
          sizes="(max-width: 1000px) 50vw, 25vw"
          alt=""
          loading="lazy"
          decoding="async"
          style={ratio ? { aspectRatio: String(ratio) } : { aspectRatio: "1", objectFit: "contain" }}
        />
        {withArtist ? (
          <span className="wk-mt-tx">
            <span className="wk-mt-t">{w.title?.trim()}</span>
            <span className="wk-mt-s">{(w.owner_id && nameOfOwner.get(w.owner_id)) || ""}</span>
          </span>
        ) : (
          <span className="wk-mt-t">{w.title?.trim()}</span>
        )}
      </Link>
    );
  };

  const sideBtn = (dir: "prev" | "next") => {
    const to = dir === "prev" ? prevId : nextId;
    if (!to) return null;
    return (
      <button
        type="button"
        className={`wk-ui wk-rb wk-side wk-${dir}`}
        aria-label={dir === "prev" ? "ผลงานก่อนหน้า" : "ผลงานถัดไป"}
        onClick={() => go(to)}
      >
        <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d={dir === "prev" ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"} />
        </svg>
      </button>
    );
  };

  return (
    <>
      {overlay ? <div className="wk-veil" aria-hidden="true" onClick={dismiss} /> : null}

      <button type="button" className="wk-ui wk-rb wk-x" aria-label="ปิดผลงาน" onClick={dismiss}>
        <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
      {sideBtn("prev")}
      {sideBtn("next")}

      {/* Over the home page, a click anywhere outside the card and its buttons closes it like × (owner 2026-11-28). */}
      <div
        className="wk-wrap"
        role={overlay ? "dialog" : undefined}
        aria-modal={overlay ? true : undefined}
        aria-label={`ผลงาน ${title}`}
        onClick={overlay ? (e) => e.target === e.currentTarget && dismiss() : undefined}
      >
        <article ref={cardRef} className="wk-card">
          <section aria-label="ตัวงาน" className="wk-body">
            {/* Made in the new editor: the body exactly as Upload's Preview showed it (owner 2026-11-28). */}
            {body ? <WorkBody items={body} firstAlt={firstAlt} sizes="(max-width: 1000px) 100vw, 1000px" imageExtra={pictureTools} /> : null}
            {body ? null : media.map((m, i) => {
              return (
                <div key={m.url} className="wk-pic">
                  {m.kind === "video" ? (
                    <video
                      className="wk-img"
                      src={m.url}
                      poster={m.poster ? proxiedImageUrl(m.poster, 1600) : undefined}
                      controls
                      playsInline
                      preload="metadata"
                      style={m.ratio ? { aspectRatio: String(m.ratio) } : undefined}
                    />
                  ) : (
                    <img
                      data-sc-work=""
                      className="wk-img"
                      src={proxiedImageUrl(m.url, 1600)}
                      srcSet={proxiedImageSrcSet(m.url, [640, 1080, 1920]) || undefined}
                      sizes="(max-width: 1000px) 100vw, 1000px"
                      alt={i === 0 ? firstAlt : ""}
                      loading={i < 2 ? "eager" : "lazy"}
                      decoding="async"
                      style={m.ratio ? { aspectRatio: String(m.ratio), minHeight: 0 } : undefined}
                    />
                  )}
                  {m.kind === "image" ? pictureTools(m.url, i) : null}
                </div>
              );
            })}
          </section>

          <section aria-label="ข้อมูลผลงาน" className="wk-info">
            <div className="wk-main">
              <div className="wk-head">
                <h1>{title}</h1>
                <p className="wk-date">{workDateLine(row.created_at, row.views)}</p>
              </div>

              <div className="wk-who">
                <Link to={profHref} className="wk-artist">
                  {avatar ? <img alt="" src={avatar} className="wk-av" style={{ width: 44, height: 44 }} /> : <span aria-hidden="true" className="wk-av" style={{ width: 44, height: 44 }} />}
                  <span className="wk-handle">{handle}</span>
                </Link>
                {isOwn || !ownerId ? null : (
                  <>
                    <button type="button" className="wk-follow" aria-pressed={followed} data-on={followed ? "" : undefined} onClick={toggleFollow}>
                      {followed ? "ติดตามแล้ว" : "ติดตาม"}
                    </button>
                    <button type="button" className="wk-greet" onClick={() => void greet()}>
                      ทักทาย
                    </button>
                  </>
                )}
              </div>

              {text ? <p className="wk-desc">{text}</p> : null}

              {igUrl || mailUrl || webUrl ? (
                <div className="wk-contact">
                  <span className="wk-lbl">ติดต่อศิลปิน</span>
                  <div className="wk-links">
                    {igUrl ? (
                      <a className="wk-clink" href={igUrl} target="_blank" rel="noopener noreferrer">
                        <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.33">
                          <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
                          <circle cx="12" cy="12" r="4" />
                          <circle cx="17.2" cy="6.8" r=".6" fill="currentColor" />
                        </svg>
                        Instagram
                      </a>
                    ) : null}
                    {mailUrl ? (
                      <a className="wk-clink" href={mailUrl}>
                        <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.33" strokeLinejoin="round">
                          <rect x="3" y="5.5" width="18" height="13" rx="2" />
                          <path d="M3.5 6.5l8.5 6.5 8.5-6.5" />
                        </svg>
                        อีเมล
                      </a>
                    ) : null}
                    {webUrl ? (
                      <a className="wk-clink" href={webUrl} target="_blank" rel="noopener noreferrer">
                        <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.33">
                          <circle cx="12" cy="12" r="8.5" />
                          <path d="M3.5 12h17M12 3.5c2.5 2.6 2.5 14.4 0 17M12 3.5c-2.5 2.6-2.5 14.4 0 17" />
                        </svg>
                        เว็บไซต์
                      </a>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>

            <dl className="wk-dl">
              {row.sc_category ? (
                <div>
                  <dt>หมวด</dt>
                  <dd>{row.sc_category}</dd>
                </div>
              ) : null}
              {tools ? (
                <div>
                  <dt>เครื่องมือ</dt>
                  {/* Each tool opens the works made with it (owner 2026-11-28; the mock shows plain text). */}
                  <dd className="wk-tools">
                    {toolList.map((t, i) => (
                      <span key={t}>
                        <Link to={exploreHref("tool", t)} className="wk-tool">
                          {t}
                        </Link>
                        {i < toolList.length - 1 ? ", " : null}
                      </span>
                    ))}
                  </dd>
                </div>
              ) : null}
              {tags.length ? (
                <div>
                  <dt>แท็ก</dt>
                  <dd className="wk-tags">
                    {tags.map((t) => (
                      <Link key={t} to={exploreHref("tag", t)} className="wk-tag">
                        {t}
                      </Link>
                    ))}
                  </dd>
                </div>
              ) : null}
              {licence ? (
                <div>
                  <dt>สิทธิ์การใช้งาน</dt>
                  <dd>{licence}</dd>
                </div>
              ) : null}
              {catalog ? (
                <div className="wk-cat">
                  <div className="wk-cat-hd">
                    <dt>อยู่ใน Catalog</dt>
                    <Link to={profHref} className="wk-cat-all">ดูทั้งหมด</Link>
                  </div>
                  <dd>
                    <span className="wk-cat-name">{catalog.title}</span>
                    {catalogItems.length ? (
                      <span className="wk-cat-grid">
                        {catalogItems.map((w) => {
                          const cover = w.cover_url || w.gallery_urls?.[0] || "";
                          const ratio = w.cover_width && w.cover_height ? w.cover_width / w.cover_height : null;
                          return (
                            <Link key={w.id} to={`/showcase/${w.id}`} state={linkState} replace={overlay} className="wk-cat-it">
                              <img
                                data-sc-work=""
                                src={proxiedImageUrl(cover, 384)}
                                alt=""
                                loading="lazy"
                                style={ratio ? { aspectRatio: String(ratio) } : { aspectRatio: "1", objectFit: "contain" }}
                              />
                              {w.title?.trim()}
                            </Link>
                          );
                        })}
                      </span>
                    ) : null}
                  </dd>
                </div>
              ) : null}
            </dl>
          </section>

          <WorkComments projectId={id} ownerId={ownerId} ownerHandle={handle} onToast={say} />

          {moreRows.length ? (
            <section aria-labelledby="mf-h" className="wk-more">
              <div className="wk-more-hd">
                <h2 id="mf-h" className="wk-h2">More from {handle}</h2>
                <Link to={profHref} className="wk-more-all">ดูโปรไฟล์</Link>
              </div>
              <div className="wk-g4">{moreRows.map((w) => tile(w, false))}</div>
            </section>
          ) : null}

          {similar.length ? (
            <section aria-labelledby="sm-h" className="wk-similar">
              <h2 id="sm-h" className="wk-h2">Similar work</h2>
              <div className="wk-g4">{similar.map((w) => tile(w, true))}</div>
            </section>
          ) : null}
        </article>

        <nav className="wk-rail" aria-label="การกระทำกับผลงาน">
          <button
            type="button"
            className="wk-rb"
            aria-label="เก็บเข้าคอลเลคชั่น"
            aria-pressed={saved}
            onClick={(e) => saves.toggle({ id, title }, e.currentTarget)}
          >
            <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill={saved ? "#282929" : "none"} stroke="#282929" strokeWidth="1.33" strokeLinejoin="round">
              <path d="M6 3h12v18l-6-4.5L6 21z" />
            </svg>
          </button>
          <button type="button" className="wk-rb" aria-label="แชร์" title="คัดลอกลิงก์" onClick={() => void share()}>
            <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#282929" strokeWidth="1.33" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 15V3.5M7.5 8L12 3.5 16.5 8M5 12.5V19a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 19 19v-6.5" />
            </svg>
          </button>
          <button type="button" className="wk-rb" aria-label="ไปที่คอมเมนต์" onClick={toComments}>
            <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#282929" strokeWidth="1.33" strokeLinejoin="round">
              <path d="M4 5.5h16v11H9l-5 4z" />
            </svg>
          </button>
          <Link to={profHref} className="wk-rb" aria-label={`โปรไฟล์ ${handle}`}>
            {avatar ? <img alt="" src={avatar} className="wk-av" style={{ width: 36, height: 36 }} /> : <span aria-hidden="true" className="wk-av" style={{ width: 36, height: 36 }} />}
          </Link>
        </nav>
      </div>

      {toast ? (
        <div role="status" className="wk-toast">
          {toast}
        </div>
      ) : null}
      {saves.element}
    </>
  );
}

/** `/showcase/:id` opened directly (link, refresh): the page on its own, inside the new frame. */
export default function WorkPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const visible = useFeedProjectSelect();
  const { data: home } = useQuery(homeWorksQuery);
  // Mock: on its own page ‹ › go round all public works (newest first).
  const list = useMemo(() => visible(home?.works ?? []).map((w) => w.id), [home, visible]);

  // × goes back when the visit started on this site; otherwise to the home page.
  const close = useCallback(() => {
    if (location.key !== "default" && window.history.length > 1) navigate(-1);
    else navigate(SC_LINKS.home);
  }, [location.key, navigate]);

  return (
    <main className="sc-main wk-page">
      <WorkView id={id} overlay={false} list={list} close={close} />
    </main>
  );
}

/** A work opened from the home grid: floats over the page, which stays where it was underneath. */
export function WorkOverlay() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const background = getBackgroundLocation(location.state);
  const scList = (location.state as Partial<WorkOverlayState> | null)?.scList;
  const list = useMemo(() => (Array.isArray(scList) ? scList : []), [scList]);
  const linkState = useMemo<WorkOverlayState | undefined>(
    () => (background ? { backgroundLocation: background, scList: list } : undefined),
    [background, list],
  );

  // The page underneath does not scroll and the floating tab bar hides while the work is open (mock).
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("sc-wk-open");
    return () => root.classList.remove("sc-wk-open");
  }, []);

  const close = useCallback(() => {
    if (location.key !== "default") navigate(-1);
    else if (background) navigate(background, { replace: true });
    else navigate(SC_LINKS.home, { replace: true });
  }, [location.key, background, navigate]);

  return (
    <div className="sc-app wk-layer" data-page="work">
      <WorkView id={id} overlay list={list} linkState={linkState} close={close} />
    </div>
  );
}
