import BriefcaseIcon from "../icons/BriefcaseIcon";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, ChevronLeft, ChevronRight, Handshake, MapPin } from "lucide-react";
import { PlusOneControl } from "@/components/brand/PlusOneControl";
import UserAvatar from "@/components/UserAvatar";
import VerifiedBadge from "@/components/profile/VerifiedBadge";
import type { DesignerCardData } from "@/hooks/useDesigners";
import FollowButton from "@/components/FollowButton";
import { useFollowState } from "@/hooks/useFollow";
import { useProjectLike } from "@/hooks/useProjectInteractions";
import { highlight } from "@/lib/highlight";
import { thumbFeedCoverUrl } from "@/lib/feedProjectCover";
import { formatDesignerPresence } from "@/lib/format";
import {
  imageCrossfadeVariants,
  imageRevealTransition,
  slideStepTransition,
  slideStepVariants,
} from "@/lib/motion";
import { displayProfileAddress } from "@/lib/profileAddress";

interface Props {
  data: DesignerCardData;
  onHire: (recipientId: string, recipientName: string) => void;
  onCollab: (recipientId: string, recipientName: string) => void;
  search?: string;
}

const PREVIEW = 3;

const DesignerCard = ({ data, onHire, onCollab, search = "" }: Props) => {
  const navigate = useNavigate();
  const { profile, projects } = data;
  const profileUserId =
    (profile as { user_id?: string; id?: string }).user_id ?? profile.id;
  const featured = projects[0];
  const like = useProjectLike(featured?.id);
  const { followers } = useFollowState(profileUserId);

  const totalLikes = useMemo(
    () => projects.reduce((sum, p) => sum + (p.likes ?? 0), 0),
    [projects],
  );

  const maxStart = Math.max(0, projects.length - PREVIEW);
  const [start, setStart] = useState(0);
  const [slideDir, setSlideDir] = useState(1);
  const windowProjects = projects.slice(start, start + PREVIEW);
  const canSlide = projects.length > PREVIEW;
  const canPrev = canSlide && start > 0;
  const canNext = canSlide && start < maxStart;

  const slide = (delta: -1 | 1) => {
    setSlideDir(delta);
    setStart((s) => Math.min(maxStart, Math.max(0, s + delta * PREVIEW)));
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

  const goto = (id: string) => navigate(`/project/${id}`);
  const profilePath = `/u/${profileUserId}`;
  const gotoProfile = (tab?: "works" | "services") => {
    const qs = new URLSearchParams();
    if (search) qs.set("q", search);
    if (tab === "services") qs.set("tab", "services");
    else if (tab === "works") qs.set("tab", "works");
    const suffix = qs.toString();
    navigate(suffix ? `${profilePath}?${suffix}` : profilePath);
  };

  const previewSlots = Array.from({ length: PREVIEW }, (_, i) => windowProjects[i] ?? null);

  return (
    <article className="relative overflow-hidden rounded-3xl glass-panel p-4 flex flex-col gap-3.5 min-w-0">
      <div className="flex items-start gap-3">
        <div className="shrink-0">
          <UserAvatar
            src={profile.avatar_url}
            name={name}
            username={profile.username}
            className="h-[5.5rem] w-[5.5rem] rounded-2xl"
            fallbackClassName="text-lg rounded-2xl"
          />
        </div>

        <div className="flex-1 min-w-0 flex flex-col items-end gap-1.5 pt-0.5">
          <div className="flex items-center gap-1">
            <FollowButton freelancerId={profileUserId} iconOnly tone="muted" />
            <motion.div whileTap={{ scale: 0.92 }}>
              <PlusOneControl
                active={like.isLiked}
                showCount={false}
                ariaLabel={like.isLiked ? "เลิกถูกใจ" : "ถูกใจ"}
                onClick={() => featured && like.toggle()}
                className="w-9 h-9 justify-center rounded-full glass-panel hover:bg-accent/40 transition"
              />
            </motion.div>
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

        <p className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-foreground/80">
          <span>{followers.toLocaleString("th-TH")} Followers</span>
          <PlusOneControl
            active={false}
            count={totalLikes}
            showCount
            className="text-xs"
            ariaLabel="Likes"
          />
        </p>
        <div className="mt-2 border-t border-border/60" />
        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          <button
            type="button"
            onClick={() => gotoProfile("works")}
            className="group inline-flex items-center gap-0.5 transition-colors hover:text-primary"
            aria-label="Open projects on profile"
          >
            {workCount.toLocaleString("th-TH")} Projects
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
                {packageCount.toLocaleString("th-TH")} Packages
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

      <div className="relative">
        {canPrev ? (
          <button
            type="button"
            aria-label="ผลงานก่อนหน้า"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              slide(-1);
            }}
            className="absolute left-0.5 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-background/95 text-foreground shadow-sm ring-1 ring-border/70 hover:bg-background"
          >
            <ChevronLeft className="h-4 w-4" strokeWidth={2.2} />
          </button>
        ) : null}
        {canNext ? (
          <button
            type="button"
            aria-label="ผลงานถัดไป"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              slide(1);
            }}
            className="absolute right-0.5 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-background/95 text-foreground shadow-sm ring-1 ring-border/70 hover:bg-background"
          >
            <ChevronRight className="h-4 w-4" strokeWidth={2.2} />
          </button>
        ) : null}
        <div className="overflow-hidden">
          <AnimatePresence mode="wait" custom={slideDir}>
            <motion.div
              key={start}
              custom={slideDir}
              variants={slideStepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={slideStepTransition}
              className="grid grid-cols-3 gap-2"
            >
              {previewSlots.map((proj, i) => {
                if (!proj) {
                  return <div key={`empty-${i}`} className="aspect-[4/3] rounded-2xl bg-muted/70" />;
                }
                const raw = proj.cover_url || proj.gallery_urls?.[0] || "";
                const src = thumbFeedCoverUrl(raw);
                return (
                  <button
                    key={proj.id}
                    type="button"
                    onClick={() => goto(proj.id)}
                    className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-muted group"
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
                        sizes="120px"
                        variants={imageCrossfadeVariants}
                        initial="initial"
                        animate="animate"
                        transition={imageRevealTransition}
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : null}
                  </button>
                );
              })}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

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
  );
};

export default DesignerCard;
