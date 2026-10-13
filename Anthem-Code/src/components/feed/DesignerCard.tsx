import BriefcaseIcon from "../icons/BriefcaseIcon";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, ChevronLeft, ChevronRight, Handshake, MapPin } from "lucide-react";
import { PlusOneControl } from "@/components/brand/PlusOneControl";
import UserAvatar from "@/components/UserAvatar";
import VerifiedBadge from "@/components/profile/VerifiedBadge";
import type { DesignerCardData } from "@/hooks/useDesigners";
import FollowButton from "@/components/FollowButton";
import { useFollowState } from "@/hooks/useFollow";
import { useAuth } from "@/hooks/useAuth";
import { useSavedDesignerIds, useToggleSavedDesigner } from "@/hooks/useSavedDesigners";
import { BRAND_NAME } from "@/lib/brandConfig";
import { highlight } from "@/lib/highlight";
import { naturalFeedCoverUrl, thumbFeedCoverUrl } from "@/lib/feedProjectCover";
import { requireAuth } from "@/lib/requireAuth";
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

interface Props {
  data: DesignerCardData;
  onHire: (recipientId: string, recipientName: string) => void;
  onCollab: (recipientId: string, recipientName: string) => void;
  search?: string;
}

const PREVIEW = 3;

const arrowButtonClass =
  "absolute top-1/2 z-20 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-background/95 text-foreground shadow-sm ring-1 ring-border/70 hover:bg-background";

const DesignerCard = ({ data, onHire, onCollab, search = "" }: Props) => {
  const navigate = useNavigate();
  const { profile, projects } = data;
  const profileUserId =
    (profile as { user_id?: string; id?: string }).user_id ?? profile.id;
  const featured = projects[0];
  const reducedMotion = useReducedMotion();
  const [flipped, setFlipped] = useState(false);
  const [index, setIndex] = useState(0);
  const [slideDir, setSlideDir] = useState(1);
  const canFlip = projects.length > PREVIEW;
  const safeIndex = Math.min(index, Math.max(0, projects.length - 1));
  const active = projects[safeIndex] ?? featured;
  const { user } = useAuth();
  const { followers } = useFollowState(profileUserId);
  const { data: savedIds } = useSavedDesignerIds();
  const toggleSave = useToggleSavedDesigner();
  const isSelf = user?.id === profileUserId;
  const isSaved = !!savedIds?.has(profileUserId);

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
  const packageCount = data.packageCount ?? 0;
  const objectCount = data.objectCount ?? 0;
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

  const onToggleSave = () =>
    requireAuth(user, () =>
      toggleSave.mutate({ designerId: profileUserId, saved: isSaved, name }),
    );

  /** Heart = keep this designer in Portfolio → Designers (not a like on one of their works). */
  const saveHeart = (className: string) =>
    isSelf ? null : (
      <motion.div whileTap={{ scale: 0.92 }}>
        <PlusOneControl
          active={isSaved}
          showCount={false}
          disabled={toggleSave.isPending}
          ariaLabel={isSaved ? `เอา ${name} ออกจากดีไซเนอร์ที่บันทึก` : `บันทึก ${name} ไว้ใน Portfolio`}
          title={isSaved ? "บันทึกไว้แล้ว — กดอีกครั้งเพื่อเอาออก" : "บันทึกดีไซเนอร์ไว้ดูทีหลัง"}
          onClick={onToggleSave}
          className={className}
        />
      </motion.div>
    );

  return (
    <div className="min-w-0 [perspective:1200px]">
      <motion.div
        className="relative"
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={flipTransition}
        style={{ transformStyle: "preserve-3d" }}
      >
    <article
      inert={flipped ? "" : undefined}
      className="relative overflow-hidden rounded-none glass-panel p-4 flex flex-col gap-3.5 min-w-0 !shadow-none [backface-visibility:hidden]"
    >
      <div className="flex items-start gap-3">
        <div className="shrink-0">
          <UserAvatar
            src={profile.avatar_url}
            name={name}
            username={profile.username}
            className="h-[5.5rem] w-[5.5rem] rounded-none"
            fallbackClassName="text-lg rounded-none"
          />
        </div>

        <div className="flex-1 min-w-0 flex flex-col items-end gap-1.5 pt-0.5">
          <div className="flex items-center gap-1">
            <FollowButton freelancerId={profileUserId} iconOnly tone="muted" />
            {saveHeart("w-9 h-9 justify-center rounded-full glass-panel hover:bg-accent/40 transition")}
          </div>
          {presence ? (
            <p
              className="inline-flex max-w-full items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-foreground/70"
              aria-label={presence.live ? "ออนไลน์อยู่ตอนนี้" : presence.label}
            >
              <span
                className={`h-2 w-2 rounded-full shrink-0 ${
                  presence.live
                    ? "bg-emerald-500 shadow-[0_0_7px_2px_rgba(16,185,129,0.65)]"
                    : "bg-sky-500 shadow-[0_0_7px_2px_rgba(14,165,233,0.55)]"
                }`}
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
        </h3>
        <p className="mt-0.5 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground truncate">
          {highlight(role, search)}
        </p>

        {/* Zero counts read as "nobody cares" — a newcomer gets a welcome line instead. */}
        <p className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-foreground/80 tabular-nums">
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
        </div>
      </div>

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
                    "group relative overflow-hidden rounded-none bg-muted",
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
          {canFlip ? (
            <button
              type="button"
              aria-label={`ดูผลงานอื่นของ ${name}`}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                openGallery();
              }}
              className={`${arrowButtonClass} right-0.5`}
            >
              <ChevronRight className="h-4 w-4" strokeWidth={2.2} />
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-2 mt-auto">
        <button
          type="button"
          onClick={() => onHire(profileUserId, name)}
          className="flex items-center justify-center gap-1.5 rounded-full bg-gradient-brand text-white text-xs font-medium min-h-11 px-3 hover:opacity-90 transition min-w-0"
        >
          <BriefcaseIcon className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">สนใจจ้างงาน</span>
        </button>
        <button
          type="button"
          onClick={() => onCollab(profileUserId, name)}
          className="flex items-center justify-center gap-1.5 rounded-full border border-foreground/15 bg-background text-foreground text-xs font-medium min-h-11 px-3 hover:bg-accent/40 transition min-w-0"
        >
          <Handshake className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">สนใจคอลแลป</span>
        </button>
      </div>
    </article>

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
                className="h-10 w-10 rounded-none ring-2 ring-white/80"
                fallbackClassName="text-xs rounded-none"
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
                className="bg-background/95 text-foreground"
              />
              {saveHeart("h-9 w-9 justify-center rounded-full bg-background/95 text-foreground shadow-sm hover:bg-background")}
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
