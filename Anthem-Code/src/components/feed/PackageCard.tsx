import { useState, type MouseEvent } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight, Bookmark, Briefcase, ChevronLeft, ChevronRight, Star } from "lucide-react";
import UserAvatar from "@/components/UserAvatar";
import VerifiedBadge from "@/components/profile/VerifiedBadge";
import PackagesIcon from "@/components/icons/PackagesIcon";
import type { PackageFeedCard } from "@/hooks/usePackageFeed";
import { formatServicePrice } from "@/hooks/useCreatorServices";
import {
  useSavedCreatorServiceIds,
  useToggleCreatorServiceBookmark,
} from "@/hooks/useCreatorServiceBookmarks";
import {
  EMPTY_PACKAGE_FEED_STATS,
  type PackageFeedListingStats,
} from "@/hooks/usePackageFeedStats";
import { useAuth } from "@/hooks/useAuth";
import { requireAuth } from "@/lib/requireAuth";
import { highlight } from "@/lib/highlight";
import { formatCompact } from "@/lib/format";
import { thumbFeedCoverUrl } from "@/lib/feedProjectCover";
import { profilePublicPath } from "@/lib/profileRoutes";
import { slideStepTransition, slideStepVariants } from "@/lib/motion";
import { cn } from "@/lib/utils";

interface Props {
  data: PackageFeedCard;
  search?: string;
  stats?: PackageFeedListingStats;
}

const PackageCard = ({ data, search = "", stats = EMPTY_PACKAGE_FEED_STATS }: Props) => {
  const navigate = useNavigate();
  const reduced = useReducedMotion();
  const { user } = useAuth();
  const { data: savedIds } = useSavedCreatorServiceIds();
  const toggleSave = useToggleCreatorServiceBookmark();
  const { profile, service, images } = data;
  const profileUserId =
    (profile as { user_id?: string; id?: string }).user_id ?? profile.id;
  const [photo, setPhoto] = useState(0);
  const [slideDir, setSlideDir] = useState(1);
  const safeIndex = images.length ? Math.min(photo, images.length - 1) : 0;
  const current = images[safeIndex] ?? "";
  const canSlide = images.length > 1;
  const isSaved = savedIds?.has(service.id) ?? false;

  const name = profile.display_name || profile.username || "ฟรีแลนซ์";
  const price = listingStartPrice(service.price_min_thb, service.price_thb);
  const src = current ? thumbFeedCoverUrl(current) : "";

  const goPackage = () => navigate(`/service/${service.id}`);
  const goProfile = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const qs = new URLSearchParams();
    qs.set("tab", "services");
    if (search) qs.set("q", search);
    const base = profilePublicPath({
      user_id: profileUserId,
      username: profile.username,
    });
    navigate(`${base}?${qs.toString()}`);
  };

  const savePackage = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    requireAuth(user, () => toggleSave.mutate({ serviceId: service.id, saved: isSaved }));
  };

  const slide = (delta: -1 | 1, e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!canSlide) return;
    setSlideDir(delta);
    setPhoto((i) => {
      const next = i + delta;
      if (next < 0) return images.length - 1;
      if (next >= images.length) return 0;
      return next;
    });
  };

  return (
    <motion.article
      initial="rest"
      whileHover={reduced ? undefined : "hover"}
      className="group flex h-full min-w-0 w-full flex-col overflow-hidden rounded-none border border-border/70 bg-card"
    >
      <div className="relative aspect-[4/3] shrink-0 bg-card">
        <button
          type="button"
          onClick={goPackage}
          className="absolute inset-0 overflow-hidden"
          aria-label={`ดูแพ็กเกจ: ${service.title}`}
        >
          <AnimatePresence mode="wait" custom={slideDir}>
            {src ? (
              <motion.img
                key={src}
                src={src}
                alt=""
                custom={slideDir}
                variants={slideStepVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={slideStepTransition}
                loading="lazy"
                decoding="async"
                className="absolute inset-0 w-full h-full object-cover"
              />
            ) : (
              <motion.div
                key="empty"
                className="absolute inset-0 flex items-center justify-center bg-muted text-muted-foreground"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <PackagesIcon className="h-8 w-8 opacity-40" />
              </motion.div>
            )}
          </AnimatePresence>
        </button>

        <button
          type="button"
          onClick={savePackage}
          disabled={toggleSave.isPending}
          aria-label={isSaved ? "เอาออกจากที่บันทึก" : "บันทึกแพ็กเกจไว้ดูทีหลัง"}
          title={isSaved ? "เอาออกจากที่บันทึก" : "บันทึกไว้ดูทีหลัง"}
          aria-pressed={isSaved}
          className="absolute top-3 right-3 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-border/70 bg-background/90 text-foreground shadow-sm backdrop-blur-sm hover:bg-background"
        >
          <Bookmark className={cn("h-4 w-4", isSaved && "fill-current text-foreground")} strokeWidth={1.8} />
        </button>

        {canSlide ? (
          <>
            <button
              type="button"
              aria-label="รูปก่อนหน้า"
              onClick={(e) => slide(-1, e)}
              className="absolute left-2 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-background/90 text-foreground shadow-sm ring-1 ring-border/60 hover:bg-background md:opacity-0 md:group-hover:opacity-100 transition-opacity"
            >
              <ChevronLeft className="h-4 w-4" strokeWidth={2.2} />
            </button>
            <button
              type="button"
              aria-label="รูปถัดไป"
              onClick={(e) => slide(1, e)}
              className="absolute right-2 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-background/90 text-foreground shadow-sm ring-1 ring-border/60 hover:bg-background md:opacity-0 md:group-hover:opacity-100 transition-opacity"
            >
              <ChevronRight className="h-4 w-4" strokeWidth={2.2} />
            </button>
            <div className="pointer-events-none absolute bottom-3 inset-x-0 z-10 flex justify-center gap-1">
              {images.map((url, i) => (
                <span
                  key={`${url}-${i}`}
                  className={`h-1.5 rounded-full shadow-sm ${
                    i === safeIndex ? "w-4 bg-white" : "w-1.5 bg-white/60"
                  }`}
                />
              ))}
            </div>
          </>
        ) : null}
      </div>

      <div className="relative z-[6] px-4 pb-4 pt-3 flex flex-col gap-1.5 flex-1 min-h-0">
        <div className="flex min-w-0 items-start justify-between gap-2">
          <button type="button" onClick={goPackage} className="min-w-0 flex-1 text-left">
            <h3 className="text-[15px] font-semibold text-foreground leading-snug line-clamp-2">
              {highlight(service.title, search)}
            </h3>
          </button>
          {stats.ratingAvg != null || stats.hireCount > 0 ? (
            <div
              className="shrink-0 space-y-0.5 pt-0.5 text-right text-[11px] leading-tight text-muted-foreground"
              aria-label={`จ้าง ${stats.hireCount} ครั้ง · รีวิว ${stats.reviewCount} รายการ`}
            >
              {stats.ratingAvg != null ? (
                <p className="inline-flex items-center justify-end gap-0.5 tabular-nums text-foreground">
                  <Star className="h-3 w-3 fill-primary text-primary" aria-hidden />
                  <span className="font-semibold">{stats.ratingAvg.toFixed(1)}</span>
                  {stats.reviewCount > 0 ? (
                    <span className="text-muted-foreground">({formatCompact(stats.reviewCount)})</span>
                  ) : null}
                </p>
              ) : null}
              {stats.hireCount > 0 ? (
                <p className="flex items-center justify-end gap-0.5 tabular-nums">
                  <Briefcase className="h-3 w-3" aria-hidden />
                  <span>จ้าง {formatCompact(stats.hireCount)}</span>
                </p>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="mt-auto flex min-w-0 flex-wrap items-end justify-between gap-x-2 gap-y-2 pt-3.5">
          <div className="flex min-w-0 flex-col items-start gap-1">
            <button
              type="button"
              onClick={goProfile}
              className="shrink-0"
              aria-label={name}
            >
              <UserAvatar
                src={profile.avatar_url}
                name={name}
                username={profile.username}
                className="w-7 h-7"
                fallbackClassName="text-[10px]"
              />
            </button>
            <button
              type="button"
              onClick={goProfile}
              className="inline-flex min-w-0 max-w-full items-center gap-1 text-left text-xs text-foreground hover:underline"
            >
              <span className="truncate">{highlight(name, search)}</span>
              <VerifiedBadge verified={!!(profile as { is_verified?: boolean }).is_verified} size="sm" />
            </button>
          </div>

          <div className="flex shrink-0 items-end gap-2">
            <div className="min-w-0 text-right">
              {price ? (
                <>
                  <p className="text-[11px] text-muted-foreground">เริ่มต้น</p>
                  <p className="text-base font-semibold text-foreground tabular-nums leading-tight">{price}</p>
                </>
              ) : (
                <p className="text-xs font-medium text-foreground">คุยรายละเอียดราคา</p>
              )}
            </div>
            <button
              type="button"
              onClick={goPackage}
              aria-label={`ดูแพ็กเกจ: ${service.title}`}
              title="ดูแพ็กเกจ"
              className="shrink-0 inline-flex h-9 w-9 items-center justify-center rounded-full bg-foreground text-background transition-colors duration-100 ease-out hover:bg-primary hover:text-primary-foreground group-hover:bg-primary group-hover:text-primary-foreground"
            >
              <motion.span
                className="inline-flex"
                variants={{
                  rest: { x: 0, y: 0 },
                  hover: { x: 3, y: -3 },
                }}
                transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
              >
                <ArrowUpRight className="h-4 w-4" strokeWidth={2.4} />
              </motion.span>
            </button>
          </div>
        </div>
      </div>
    </motion.article>
  );
};

export default PackageCard;

function listingStartPrice(minRaw: number, maxRaw: number): string {
  const min = Number(minRaw) || 0;
  const max = Number(maxRaw) || 0;
  const start = min > 0 ? min : max;
  if (start <= 0) return "";
  return formatServicePrice(start);
}
