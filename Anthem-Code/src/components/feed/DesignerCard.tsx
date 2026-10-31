import { useState } from "react";
import { useNavigate } from "react-router-dom";
import ConnectMessageDialog from "@/components/chat/ConnectMessageDialog";
import { useAuth } from "@/hooks/useAuth";
import { navigateToAuth } from "@/lib/authRedirect";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, ChevronLeft, ChevronRight, MapPin, MessageCircle, Undo2 } from "lucide-react";
import FollowButton from "@/components/FollowButton";
import UserAvatar from "@/components/UserAvatar";
import VerifiedBadge from "@/components/profile/VerifiedBadge";
import type { DesignerCardData } from "@/hooks/useDesigners";
import { useFollowState, useFollowsYou } from "@/hooks/useFollow";
import type { FollowedByPerson } from "@/hooks/useFollowedBy";
import { BRAND_NAME } from "@/lib/brandConfig";
import { highlight } from "@/lib/highlight";
import { naturalFeedCoverUrl, thumbFeedCoverUrl } from "@/lib/feedProjectCover";
import { cn } from "@/lib/utils";
import { formatDesignerPresence } from "@/lib/format";
import {
  imageCrossfadeVariants,
  imageRevealTransition,
  slideStepTransition,
  slideStepVariants,
  smoothEase,
} from "@/lib/motion";
import { displayProfileAddress } from "@/lib/profileAddress";
import { isCommerceEnabled } from "@/lib/aplus1Launch";

interface Props {
  data: DesignerCardData;
  search?: string;
  /** People you follow who also follow this designer ("ติดตามโดย …"). */
  followedBy?: FollowedByPerson[];
  /** Works posted since you last looked (Portfolio → Designers). */
  newWorkCount?: number;
}

const PREVIEW = 3;
/** Cards carry the latest 6 works, so "new" counts stop there. */
const PREVIEW_MAX = 6;

const arrowButtonClass =
  "absolute top-1/2 z-20 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-background/95 text-foreground shadow-sm ring-1 ring-border/70 hover:bg-background";

const DesignerCard = ({ data, search = "", followedBy = [], newWorkCount = 0 }: Props) => {
  const navigate = useNavigate();
  const { profile, projects } = data;
  const profileUserId =
    (profile as { user_id?: string; id?: string }).user_id ?? profile.id;
  const featured = projects[0];
  const reducedMotion = useReducedMotion();
  const { user } = useAuth();
  const [flipped, setFlipped] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [slideDir, setSlideDir] = useState(1);
  const canFlip = projects.length > PREVIEW;
  const safeIndex = Math.min(index, Math.max(0, projects.length - 1));
  const active = projects[safeIndex] ?? featured;
  const { followers } = useFollowState(profileUserId);
  const followsYou = useFollowsYou(profileUserId);

  const likeCount = data.likeCount ?? projects.reduce((sum, p) => sum + (p.likes ?? 0), 0);

  const openGallery = () => {
    setSlideDir(1);
    setIndex(Math.min(PREVIEW, Math.max(0, projects.length - 1)));
    setFlipped(true);
  };

  const showPrevWork = () => {
    if (safeIndex <= 0) {
      setFlipped(false);
      return;
    }
    setSlideDir(-1);
    setIndex(safeIndex - 1);
  };

  const showNextWork = () => {
    if (safeIndex >= projects.length - 1) return;
    setSlideDir(1);
    setIndex(safeIndex + 1);
  };

  const name = profile.display_name || profile.username || "ฟรีแลนซ์";
  const role = (profile.role || "Designer").trim();
  const presence = formatDesignerPresence(
    (profile as { last_active_at?: string | null }).last_active_at,
  );
  const place = displayProfileAddress(
    (profile as { profile_address?: unknown }).profile_address,
    (profile as { location?: string | null }).location,
    "short",
  );
  const workCount = data.projectCount || projects.length;
  // Packages / Objects counts return with the commerce phase.
  const packageCount = isCommerceEnabled() ? (data.packageCount ?? 0) : 0;
  const objectCount = isCommerceEnabled() ? (data.objectCount ?? 0) : 0;
  // Fewer than 3 works: the ones there are share the row instead of leaving grey placeholder boxes.
  const previewProjects = projects.slice(0, PREVIEW);
  const previewFill = previewProjects.length < PREVIEW;

  const goto = (id: string) => navigate(`/project/${id}`);
  const profilePath = `/u/${profileUserId}`;
  const gotoProfile = (tab?: "works" | "services" | "objects") => {
    const qs = new URLSearchParams();
    if (search) qs.set("q", search);
    if (tab === "services") qs.set("tab", "services");
    else if (tab === "objects") qs.set("tab", "objects");
    else if (tab === "works") qs.set("tab", "works");
    const suffix = qs.toString();
    navigate(suffix ? `${profilePath}?${suffix}` : profilePath);
  };

  const flipTransition = reducedMotion
    ? { duration: 0 }
    : { duration: 0.42, ease: smoothEase };

  const coverOf = (proj: (typeof projects)[number] | undefined, wide = false) => {
    if (!proj) return "";
    const src = proj.cover_url || proj.gallery_urls?.[0] || "";
    return wide ? naturalFeedCoverUrl(src) : thumbFeedCoverUrl(src);
  };

  return (
    <div className="h-full min-w-0 [perspective:1200px]">
      <motion.div
        className="relative h-full"
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={flipTransition}
        style={{ transformStyle: "preserve-3d" }}
      >
    <article
      inert={flipped ? "" : undefined}
      className="relative h-full overflow-hidden rounded-[6px] glass-panel p-4 flex flex-col gap-3.5 min-w-0 !shadow-none [backface-visibility:hidden]"
    >
      <div className="flex items-start gap-3">
        <div className="shrink-0">
          <UserAvatar
            src={profile.avatar_url}
            name={name}
            username={profile.username}
            className="h-[5.5rem] w-[5.5rem] rounded-[6px]"
            fallbackClassName="text-lg rounded-[6px]"
          />
        </div>

        <div className="flex-1 min-w-0 flex flex-col items-end gap-1.5 pt-0.5">
          <FollowButton
            freelancerId={profileUserId}
            size="sm"
            showFollowerCount={false}
            showFollowingLabel
            announceName={name}
            className="h-9 min-w-[6.25rem] justify-center px-4 text-xs"
          />
          {newWorkCount > 0 ? (
            <p className="inline-flex items-center gap-1.5 rounded-full bg-primary px-2.5 py-0.5 text-[11px] font-medium text-primary-foreground">
              ผลงานใหม่ {newWorkCount >= PREVIEW_MAX ? `${PREVIEW_MAX}+` : newWorkCount.toLocaleString("th-TH")}
            </p>
          ) : null}
          {presence ? (
            <p
              className={cn(
                "inline-flex max-w-full items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em]",
                presence.live ? "text-foreground/80" : "text-muted-foreground",
              )}
              aria-label={presence.live ? "ออนไลน์อยู่ตอนนี้" : presence.label}
            >
              {/* Only someone online right now glows; "active 6 days ago" is a quiet grey dot. */}
              <span
                className={cn(
                  "h-2 w-2 rounded-full shrink-0",
                  presence.live
                    ? "bg-emerald-500 shadow-[0_0_7px_2px_rgba(16,185,129,0.65)]"
                    : "bg-muted-foreground/40",
                )}
                aria-hidden
              />
              <span className="truncate">{presence.label}</span>
            </p>
          ) : null}
          {place ? (
            <p className="inline-flex items-center gap-1 max-w-full rounded-full bg-muted/80 px-2 py-0.5 text-[11px] text-foreground/80">
              <MapPin className="h-3 w-3 shrink-0" strokeWidth={2} aria-hidden />
              <span className="truncate">{place}</span>
            </p>
          ) : null}
        </div>
      </div>

      <div className="min-w-0">
        <h3 className="text-xl font-semibold tracking-tight leading-snug flex items-center gap-1.5 min-w-0">
          <button
            type="button"
            onClick={() => gotoProfile()}
            className="min-w-0 truncate text-left text-foreground hover:text-primary hover:underline underline-offset-4 decoration-primary/80 transition-colors"
          >
            {highlight(name, search)}
          </button>
          <VerifiedBadge verified={!!(profile as { is_verified?: boolean }).is_verified} />
          {followsYou ? (
            <span className="ml-0.5 shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium tracking-normal text-muted-foreground">
              ติดตามคุณ
            </span>
          ) : null}
        </h3>
        <p className="mt-0.5 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground truncate">
          {highlight(role, search)}
        </p>

        {/* Zero counts read as "nobody cares" — a newcomer gets a welcome line instead. */}
        <div className="mt-1.5 flex min-h-9 items-center justify-between gap-3">
        <p className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-foreground/80 tabular-nums">
          {followers > 0 ? (
            <span>
              {followers.toLocaleString("th-TH")} {followers === 1 ? "Follower" : "Followers"}
            </span>
          ) : null}
          {followers > 0 && likeCount > 0 ? <span aria-hidden>·</span> : null}
          {likeCount > 0 ? (
            <span>
              {likeCount.toLocaleString("th-TH")} {likeCount === 1 ? "Like" : "Likes"}
            </span>
          ) : null}
          {followers === 0 && likeCount === 0 ? (
            <span className="text-muted-foreground">New on {BRAND_NAME}</span>
          ) : null}
        </p>
          <button
            type="button"
            onClick={() => {
              if (!user) {
                navigateToAuth(navigate);
                return;
              }
              setChatOpen(true);
            }}
            className="inline-flex h-9 w-[6.25rem] shrink-0 items-center justify-center gap-1.5 rounded-full bg-gradient-brand px-3 text-xs font-medium text-white transition hover:opacity-90"
          >
            <MessageCircle className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">ทักแชท</span>
          </button>
        </div>
        {followedBy.length > 0 ? (
          <p
            className="mt-1.5 flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground"
            title={followedBy.map((p) => p.name).join(", ")}
          >
            <span className="flex shrink-0 -space-x-1.5" aria-hidden>
              {followedBy.slice(0, 3).map((p) => (
                <UserAvatar
                  key={p.id}
                  src={p.avatar}
                  name={p.name}
                  className="h-5 w-5 ring-2 ring-background"
                  fallbackClassName="text-[8px]"
                />
              ))}
            </span>
            <span className="min-w-0 truncate">
              ติดตามโดย <span className="text-foreground/80">{followedBy[0].name}</span>
              {followedBy.length > 1 ? ` และอีก ${followedBy.length - 1} คน` : ""}
            </span>
          </p>
        ) : null}
        <div className="mt-2 border-t border-border/60" />
        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          <button
            type="button"
            onClick={() => gotoProfile("works")}
            className="group inline-flex items-center gap-0.5 transition-colors hover:text-primary"
            aria-label="Open projects on profile"
          >
            {workCount.toLocaleString("th-TH")} {workCount === 1 ? "Project" : "Projects"}
            <ArrowRight
              className="h-3 w-3 transition-transform duration-200 group-hover:translate-x-1"
              strokeWidth={2.2}
              aria-hidden
            />
          </button>
          {packageCount > 0 ? (
            <>
              <span aria-hidden>·</span>
              <button
                type="button"
                onClick={() => gotoProfile("services")}
                className="group inline-flex items-center gap-0.5 transition-colors hover:text-primary"
                aria-label="Open packages on profile"
              >
                {packageCount.toLocaleString("th-TH")} {packageCount === 1 ? "Package" : "Packages"}
                <ArrowRight
                  className="h-3 w-3 transition-transform duration-200 group-hover:translate-x-1"
                  strokeWidth={2.2}
                  aria-hidden
                />
              </button>
            </>
          ) : null}
          {objectCount > 0 ? (
            <>
              <span aria-hidden>·</span>
              <button
                type="button"
                onClick={() => gotoProfile("objects")}
                className="group inline-flex items-center gap-0.5 transition-colors hover:text-primary"
                aria-label="Open objects on profile"
              >
                {objectCount.toLocaleString("th-TH")} {objectCount === 1 ? "Object" : "Objects"}
                <ArrowRight
                  className="h-3 w-3 transition-transform duration-200 group-hover:translate-x-1"
                  strokeWidth={2.2}
                  aria-hidden
                />
              </button>
            </>
          ) : null}
          {canFlip ? (
            <button
              type="button"
              aria-label={`ดูผลงานอื่นของ ${name}`}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                openGallery();
              }}
              className="group ml-auto inline-flex items-center gap-0.5 transition-colors hover:text-primary"
            >
              See more
              <ChevronRight
                className="h-3 w-3 transition-transform duration-200 group-hover:translate-x-1"
                strokeWidth={2.2}
                aria-hidden
              />
            </button>
          ) : null}
        </div>
      </div>

      {/* Works + actions sit at the bottom, so extra lines above never misalign cards in a row. */}
      <div className="mt-auto flex flex-col gap-3.5">
      {featured ? (
        <div className="relative">
          {previewFill ? (
            // Invisible 4:3 tile keeps the row as tall as three tiles, so cards in a grid row stay aligned.
            <div className="grid grid-cols-3 gap-2" aria-hidden>
              <div className="aspect-[4/3]" />
            </div>
          ) : null}
          <div
            className={cn(
              "grid gap-2",
              previewProjects.length === 1 ? "grid-cols-1" : previewProjects.length === 2 ? "grid-cols-2" : "grid-cols-3",
              previewFill && "absolute inset-0",
            )}
          >
            {previewProjects.map((proj) => {
              const src = coverOf(proj, previewFill);
              return (
                <button
                  key={proj.id}
                  type="button"
                  onClick={() => goto(proj.id)}
                  className={cn(
                    "group relative overflow-hidden rounded-[6px] bg-muted",
                    previewFill ? "h-full" : "aspect-[4/3]",
                  )}
                  aria-label={`ดูผลงาน: ${proj.title}`}
                  title={proj.title}
                >
                  {src ? (
                    <motion.img
                      src={src}
                      alt={proj.title}
                      width={360}
                      height={270}
                      loading="lazy"
                      decoding="async"
                      sizes={previewFill ? "(min-width: 1280px) 30vw, (min-width: 768px) 45vw, 100vw" : "120px"}
                      variants={imageCrossfadeVariants}
                      initial="initial"
                      animate="animate"
                      transition={imageRevealTransition}
                      className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      </div>
    </article>

      {chatOpen ? (
        <ConnectMessageDialog open={chatOpen} onOpenChange={setChatOpen} recipientId={profileUserId} recipientName={name} />
      ) : null}

        {active ? (
          <div
            inert={!flipped ? "" : undefined}
            className="absolute inset-0 overflow-hidden bg-muted [backface-visibility:hidden] [transform:rotateY(180deg)]"
          >
            <AnimatePresence mode="wait" custom={slideDir} initial={false}>
              <motion.button
                key={active.id}
                type="button"
                custom={slideDir}
                variants={reducedMotion ? undefined : slideStepVariants}
                initial={reducedMotion ? false : "enter"}
                animate={reducedMotion ? { opacity: 1, x: 0 } : "center"}
                exit={reducedMotion ? { opacity: 1, x: 0 } : "exit"}
                transition={reducedMotion ? { duration: 0 } : slideStepTransition}
                onClick={() => goto(active.id)}
                className="group absolute inset-0"
                aria-label={`ดูผลงาน: ${active.title}`}
                title={active.title}
              >
                {coverOf(active) ? (
                  <img
                    src={coverOf(active)}
                    alt={active.title}
                    width={640}
                    height={800}
                    loading="lazy"
                    decoding="async"
                    sizes="(min-width: 1280px) 30vw, (min-width: 768px) 45vw, 100vw"
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                ) : null}
              </motion.button>
            </AnimatePresence>
            <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-24 bg-gradient-to-b from-black/55 to-transparent" />
            <div className="absolute left-3 top-3 z-20 flex min-w-0 max-w-[70%] items-center gap-2">
              <UserAvatar
                src={profile.avatar_url}
                name={name}
                username={profile.username}
                className="h-10 w-10 rounded-[6px] ring-2 ring-white/80"
                fallbackClassName="text-xs rounded-[6px]"
              />
              <button
                type="button"
                onClick={() => gotoProfile()}
                className="min-w-0 truncate text-left text-sm font-semibold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.65)]"
              >
                {highlight(name, search)}
              </button>
              <VerifiedBadge verified={!!(profile as { is_verified?: boolean }).is_verified} />
            </div>
            <div className="absolute right-3 top-3 z-20 flex items-center gap-1">
              <FollowButton
                freelancerId={profileUserId}
                iconOnly
                tone="muted"
                announceName={name}
                className="bg-background/95 text-foreground"
              />
            </div>
            <button
              type="button"
              aria-label={safeIndex <= 0 ? "กลับไปการ์ดโปรไฟล์" : "ผลงานก่อนหน้า"}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                showPrevWork();
              }}
              className={`${arrowButtonClass} left-2`}
            >
              <ChevronLeft className="h-4 w-4" strokeWidth={2.2} />
            </button>
            <button
              type="button"
              aria-label="กลับไปการ์ดโปรไฟล์"
              title="กลับไปการ์ดโปรไฟล์"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setFlipped(false);
              }}
              className="absolute bottom-3 left-3 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-black/55 text-white shadow-sm backdrop-blur-sm transition-colors hover:bg-black/75"
            >
              <Undo2 className="h-4 w-4" strokeWidth={2.2} />
            </button>
            {safeIndex < projects.length - 1 ? (
              <button
                type="button"
                aria-label="ผลงานถัดไป"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  showNextWork();
                }}
                className={`${arrowButtonClass} right-2`}
              >
                <ChevronRight className="h-4 w-4" strokeWidth={2.2} />
              </button>
            ) : null}
          </div>
        ) : null}
      </motion.div>
    </div>
  );
};

export default DesignerCard;
