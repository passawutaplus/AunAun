import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams, type Location } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useUserBlocks } from "@/hooks/useCommunityPostInteractions";
import { useFeedProjectSelect } from "@/hooks/useFeedProjectSelect";
import { mapWriteFlowError } from "@/lib/writeFlowErrors";
import { hasPendingProjectAssets, parseProjectAssets } from "@/lib/projectAssets";
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
import WorkBody, { bodyFromBlocks, bodyPictures, pictureOpenProps } from "../work/WorkBody";
import WorkAssets from "../work/WorkAssets";
import WorkLightbox from "../work/WorkLightbox";
import SharePanel from "../work/SharePanel";
import WorkComments from "../work/WorkComments";
import { ConfirmBox, MoreMenu, ReportBox, type MenuItem } from "../work/WorkMenu";
import { useBlockPerson, useHiddenWorks, useImageLikes, useOwnerWorks, useWork, useWorkCatalog, useWorkCredits } from "../work/useWork";
import { formatCount, licenceLine, neighbour, pickSimilar, workDateLine } from "../work/workContent";
import { useDeleteWork } from "../studio/useStudio";
import { loginHref } from "../lib/loginHref";
import LoadError from "../shell/LoadError";
import NotFound from "./NotFound";
import { bigChatOpen, useShellPanels } from "../shell/panels";
import { instagramUrl, websiteUrl } from "../lib/contactLinks";
import { indexableBySearch, useNoIndex } from "../lib/visibility";
import { usePageSeo, workSeo } from "../lib/usePageSeo";
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
  usePageSeo(workSeo(id, row, who));
  // The owner turned "ให้ค้นเจอจาก Google" off (Settings → Privacy): their works are not indexed either.
  useNoIndex(!!who && !indexableBySearch(who.public_visibility));
  const ownerId = row?.owner_id ?? null;
  const isOwn = !!user && !!ownerId && user.id === ownerId;

  const handle = who?.username || who?.display_name?.trim() || "";
  const artistName = who?.display_name?.trim() || who?.username || "";
  const title = row?.title?.trim() || "";
  const avatar = proxiedImageUrl(who?.avatar_url, 96);
  const profHref = isOwn ? SC_LINKS.myProfile : who ? profileHref(who) : SC_LINKS.home;
  // Signed out, an action that needs an account goes to Log In and back to this work.
  const toLogin = useCallback(() => navigate(loginHref()), [navigate]);

  const likes = useImageLikes(id, media.find((m) => m.kind === "image")?.url);
  const firstAlt = artistName ? `${title} โดย ${artistName}` : title;
  const body = useMemo(() => (row && isScContent(row.content_blocks) ? bodyFromBlocks(row.content_blocks, row.media_sizes) : null), [row]);
  useEffect(() => {
    if (body?.some((b) => b.kind === "text" || b.kind === "row")) ensureTextFonts();
  }, [body]);

  // Tap a picture: full screen (old ImageLightbox), going through every picture of the work in order.
  const pictures = useMemo(() => (body ? bodyPictures(body) : media.filter((m) => m.kind === "image").map((m) => m.url)), [body, media]);
  const [lightbox, setLightbox] = useState<number | null>(null);

  // Made with (old credits) and the attached files / links with their safety scan.
  const credits = useWorkCredits(row);
  const assets = useMemo(() => (row ? parseProjectAssets(row.project_assets, row.external_links) : []), [row]);
  // The owner sees a new file's scan finish: refresh every few seconds for up to two minutes (old page).
  const refetchWork = work.refetch;
  useEffect(() => {
    if (!isOwn || !hasPendingProjectAssets(assets)) return;
    const every = window.setInterval(() => void refetchWork(), 5000);
    const stop = window.setTimeout(() => window.clearInterval(every), 120_000);
    return () => {
      window.clearInterval(every);
      window.clearTimeout(stop);
    };
  }, [isOwn, assets, refetchWork]);
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
              if (!likes.toggle(url)) toLogin();
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
        <button type="button" className="wk-lk wk-lk-ic" aria-label="แชร์" title="แชร์" onClick={() => share(url)}>
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#282929" strokeWidth="1.33" strokeLinecap="round" strokeLinejoin="round">
            <path d="M13.5 5.5L20 12l-6.5 6.5" />
            <path d="M20 12h-8.5A6.5 6.5 0 0 0 5 18.5V20" />
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
  // fades, the buttons and the veil fade out, then the page underneath is back. Quick (~320 ms, owner:
  // "a little faster, no judder"): it moves from the first frame, and the tab bar comes back under the veil.
  const cardRef = useRef<HTMLElement>(null);
  const closing = useRef(false);
  const dismiss = useCallback(() => {
    const card = cardRef.current;
    const layer = card?.closest(".wk-layer");
    if (!overlay || calm() || !card || !layer || typeof card.animate !== "function") return close();
    if (closing.current) return;
    closing.current = true;
    document.documentElement.classList.add("sc-wk-closing");
    const runs = [
      card.animate([{ transform: "none" }, { transform: "translateY(96px)" }], { duration: 300, easing: "cubic-bezier(.4, 0, 1, 1)", fill: "forwards" }),
      card.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 260, delay: 40, easing: "cubic-bezier(.2, 0, .6, 1)", fill: "forwards" }),
      ...Array.from(layer.querySelectorAll<HTMLElement>(".wk-ui, .wk-rail")).map((el) => el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, easing: "ease-out", fill: "forwards" })),
      ...Array.from(layer.querySelectorAll<HTMLElement>(".wk-veil")).map((el) => el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 260, delay: 60, easing: "ease-out", fill: "forwards" })),
    ];
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      close();
    };
    void Promise.all(runs.map((a) => a.finished)).then(finish, finish);
    window.setTimeout(finish, 600);
  }, [overlay, close]);

  // Esc closes (the save popup handles its own Esc first; so does the big chat popup, which sits above the work).
  const toastOpen = saves.open;
  // The share panel (below) handles its own Esc; the work stays open behind it.
  const [shareFor, setShareFor] = useState<{ image: string; ratio: number | null } | null>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !toastOpen && !shareFor && !bigChatOpen()) dismiss();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [dismiss, toastOpen, shareFor]);

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

  // Share (owner 2026-11-28): signed out, the store apps open the phone's share sheet; otherwise the share panel
  // (preview, link + copy, places to send it) like the old site. A picture's button previews that picture.
  const shareUrl = `${typeof window === "undefined" ? "" : window.location.origin}/showcase/${id}`;
  const share = (picture?: string) => {
    // Signed in, the app shows the panel too: its "ส่งในแชท" row is not in the phone sheet.
    if (!user && shareFromApp({ title: title || "SAMECOR", url: shareUrl })) return;
    const cover = row?.cover_url || media.find((m) => m.kind === "image")?.url || "";
    const image = picture || cover;
    const ratio =
      media.find((m) => m.url === image)?.ratio ??
      (image === row?.cover_url && row?.cover_width && row?.cover_height ? row.cover_width / row.cover_height : null);
    setShareFor({ image, ratio });
  };

  // Small chat window (ChatDock) with this work's card on top; the chat page on phones (mock greet-signal + greet-work).
  const { openChat } = useShellPanels();
  const greet = (el: HTMLElement) => {
    if (!user) {
      toLogin();
      return;
    }
    if (!ownerId) return;
    const cover = row?.cover_url || media.find((m) => m.kind === "image")?.url || "";
    openChat({ otherId: ownerId, work: { id, title, cover: proxiedImageUrl(cover, 96) } }, el).catch((e: unknown) =>
      say(e instanceof Error && e.message ? e.message : "เปิดแชทไม่สำเร็จ"),
    );
  };

  const toggleFollow = () => {
    if (!ownerId) return;
    if (!follows.signedIn) toLogin();
    else follows.toggle(ownerId);
  };

  const toggleSave = (el: HTMLElement) => {
    if (!user) toLogin();
    else saves.toggle({ id, title }, el);
  };

  // ⋯ on the rail (old ProjectViewerMenu; App Store / Play rules for user content): the owner edits or deletes
  // the work; anyone else hides it on this device, blocks the owner or reports it.
  const hiddenWorks = useHiddenWorks();
  const { data: iBlocked } = useUserBlocks(user?.id);
  const block = useBlockPerson();
  const del = useDeleteWork(user?.id ?? "");
  const [modal, setModal] = useState<"delete" | "block" | "report" | null>(null);
  // After hiding or blocking, the toast shows a moment, then the work closes.
  const leaveTimer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(leaveTimer.current), []);
  const leaveSoon = () => {
    window.clearTimeout(leaveTimer.current);
    leaveTimer.current = window.setTimeout(dismiss, 900);
  };
  const ownerName = handle || "คนนี้";
  const ownerBlocked = !!ownerId && !!iBlocked?.has(ownerId);
  const menuItems: MenuItem[] = isOwn
    ? [
        { key: "edit", label: "แก้ไขผลงาน", onSelect: () => navigate(`/portfolio/${id}/edit`) },
        { key: "delete", label: "ลบผลงาน", danger: true, onSelect: () => setModal("delete") },
      ]
    : [
        {
          key: "hide",
          label: "ซ่อนผลงานนี้",
          hint: "จะไม่โชว์ในฟีดของคุณอีก",
          onSelect: () => {
            hiddenWorks.hide(id);
            say("ซ่อนแล้วนะ");
            leaveSoon();
          },
        },
        ...(ownerId
          ? [
              {
                key: "block",
                label: ownerBlocked ? `บล็อก ${ownerName} แล้ว` : `บล็อก ${ownerName}`,
                hint: "จะไม่เห็นกันและทักกันไม่ได้",
                disabled: ownerBlocked,
                onSelect: () => (user ? setModal("block") : toLogin()),
              },
            ]
          : []),
        { key: "report", label: "รายงานผลงาน", onSelect: () => (user ? setModal("report") : toLogin()) },
      ];

  const toComments = () => document.getElementById("cm-h")?.scrollIntoView({ behavior: calm() ? "auto" : "smooth", block: "start" });

  if (work.isPending) return <div className={overlay ? "wk-wait" : "wk-wait wk-wait-page"} aria-busy="true" />;
  if (!row) {
    // 404 only when the work is truly not there (or not visible to this person); a failed load can be retried.
    const box = work.isError ? (
      <>
        <button type="button" className="wk-ui wk-rb wk-x" aria-label="ปิดผลงาน" onClick={dismiss}>
          <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
        <LoadError onRetry={() => void work.refetch()} />
      </>
    ) : (
      <NotFound />
    );
    return overlay ? <div className="wk-missing">{box}</div> : box;
  }

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
            {body ? <WorkBody items={body} firstAlt={firstAlt} sizes="(max-width: 1000px) 100vw, 1000px" imageExtra={pictureTools} onOpen={setLightbox} /> : null}
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
                      {...pictureOpenProps(() => setLightbox(Math.max(0, pictures.indexOf(m.url))))}
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
                    <button type="button" className="wk-greet" onClick={(e) => greet(e.currentTarget)}>
                      ทักทาย
                    </button>
                  </>
                )}
              </div>

              {credits.people.length || credits.studio ? (
                <div className="wk-credits">
                  <span className="wk-lbl">Made with</span>
                  <div className="wk-cr-list">
                    {credits.studio ? (
                      <Link to={`/s/${credits.studio.slug}`} className="wk-cr">
                        {credits.studio.avatar_url ? <img alt="" src={proxiedImageUrl(credits.studio.avatar_url, 64)} className="wk-av" /> : <span aria-hidden="true" className="wk-av" />}
                        <span className="wk-cr-name">{credits.studio.name}</span>
                        <span className="wk-cr-tag">Studio</span>
                      </Link>
                    ) : null}
                    {credits.people.map((p) => (
                      <Link key={p.id} to={p.id === user?.id ? SC_LINKS.myProfile : profileHref({ user_id: p.id, username: p.username })} className="wk-cr">
                        {p.avatar_url ? <img alt="" src={proxiedImageUrl(p.avatar_url, 64)} className="wk-av" /> : <span aria-hidden="true" className="wk-av" />}
                        <span className="wk-cr-name">{p.display_name?.trim() || p.username || ""}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              ) : null}

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

              <WorkAssets projectId={id} assets={assets} isOwn={isOwn} say={say} />
            </div>

            <dl className="wk-dl">
              {row.sc_category ? (
                <div>
                  <dt>หมวด</dt>
                  {/* Opens the home Showcase on this CATEGORY (owner 2026-11-28). */}
                  <dd>
                    <Link to={`${SC_LINKS.home}?cat=${encodeURIComponent(row.sc_category)}`} className="wk-tool">
                      {row.sc_category}
                    </Link>
                  </dd>
                </div>
              ) : null}
              {row.made_year ? (
                <div>
                  <dt>ปี</dt>
                  <dd>{row.made_year}</dd>
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

          <WorkComments projectId={id} ownerId={ownerId} ownerHandle={handle} ask={row.ask_viewers} onToast={say} />

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
            onClick={(e) => toggleSave(e.currentTarget)}
          >
            <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill={saved ? "#282929" : "none"} stroke="#282929" strokeWidth="1.33" strokeLinejoin="round">
              <path d="M6 3h12v18l-6-4.5L6 21z" />
            </svg>
          </button>
          <button type="button" className="wk-rb" aria-label="แชร์" title="แชร์" onClick={() => share()}>
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
          <MoreMenu items={menuItems} label={isOwn ? "จัดการผลงาน" : "ตัวเลือกเพิ่มเติม"} place="rail" buttonClass="wk-rb" />
        </nav>
      </div>

      {toast ? (
        <div role="status" className="wk-toast">
          {toast}
        </div>
      ) : null}
      {saves.element}
      {modal === "delete" ? (
        <ConfirmBox
          title={`ลบ ${title || "Untitled"}?`}
          body="ลบแล้วกู้คืนไม่ได้นะ"
          yes="ลบ"
          danger
          onClose={() => setModal(null)}
          onYes={async () => {
            try {
              await del.mutateAsync(id);
            } catch (e) {
              say(mapWriteFlowError(e, "ลบไม่สำเร็จ ลองใหม่อีกทีนะ"));
              return;
            }
            setModal(null);
            if (overlay) close();
            else navigate(SC_LINKS.myStudio, { replace: true });
          }}
        />
      ) : null}
      {modal === "block" && ownerId ? (
        <ConfirmBox
          title={`บล็อก ${ownerName}?`}
          body="จะไม่เห็นงานกับคอมเมนต์ของกันและกัน และทักกันไม่ได้ เลิกบล็อกได้ที่ Settings นะ"
          yes="บล็อก"
          danger
          onClose={() => setModal(null)}
          onYes={async () => {
            try {
              await block.mutateAsync(ownerId);
            } catch (e) {
              say(mapWriteFlowError(e, "บล็อกไม่สำเร็จ ลองใหม่อีกทีนะ"));
              return;
            }
            setModal(null);
            say(`บล็อก ${ownerName} แล้ว`);
            leaveSoon();
          }}
        />
      ) : null}
      {modal === "report" ? (
        <ReportBox
          target={{ type: "project", id }}
          ownerId={ownerId}
          ownerName={ownerName}
          canBlock={!!ownerId && !ownerBlocked}
          onClose={() => setModal(null)}
          onDone={(note, blocked) => {
            setModal(null);
            say(note);
            if (blocked) leaveSoon();
          }}
        />
      ) : null}
      {lightbox !== null && pictures.length ? <WorkLightbox pictures={pictures} start={lightbox} title={title} onClose={() => setLightbox(null)} /> : null}
      {shareFor ? <SharePanel url={shareUrl} title={title} image={shareFor.image} imageRatio={shareFor.ratio} onClose={() => setShareFor(null)} say={say} chat={user && id ? { userId: user.id, work: { id, title } } : null} /> : null}
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
    return () => root.classList.remove("sc-wk-open", "sc-wk-closing");
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
