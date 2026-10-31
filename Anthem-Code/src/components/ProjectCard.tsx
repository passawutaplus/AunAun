import { useEffect, useRef, useState } from "react";
import { hapticPress } from "@/lib/haptics";
import { AnimatePresence, motion } from "framer-motion";
import { Bookmark, Eye, Heart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { Project } from "@/data/projectTypes";
import { useProjectLike } from "@/hooks/useProjectInteractions";
import { useAuth } from "@/hooks/useAuth";
import { useSavedProjectIds } from "@/hooks/useCollections";
import SaveToCollectionPopover from "@/components/collections/SaveToCollectionPopover";
import { cn } from "@/lib/utils";
import SafeDemoImage from "@/components/SafeDemoImage";
import { naturalFeedCoverUrl, optimizedFeedImageUrl } from "@/lib/feedProjectCover";
import { smoothEase } from "@/lib/motion";
import BoostBadge from "@/components/boost/BoostBadge";
import { DrillProjectBadge } from "@/components/drill/DrillProjectBadge";
import AiDisclosureBadge from "@/components/license/AiDisclosureBadge";
import { projectHasDrillTag } from "@/lib/drillProject";
import { logBoostEvent } from "@/hooks/useBoost";
import { PlusOneControl } from "@/components/brand/PlusOneControl";
import UserAvatar from "@/components/UserAvatar";
import VerifiedBadge from "@/components/profile/VerifiedBadge";
import { extractSearchSnippet, highlight } from "@/lib/highlight";
import { useQuickView } from "@/stores/quickViewStore";
import { profilePublicPath } from "@/lib/profileRoutes";

interface ProjectCardProps {
  project: Project;
  boosted?: boolean;
  boostId?: string;
  /** Feed masonry — preserve original cover aspect (no CDN crop). */
  naturalCover?: boolean;
  /** Homepage gallery — image only, original proportions, no name or counts. */
  gallery?: boolean;
  /** Optional search query for title highlight. */
  searchQuery?: string;
}

const formatCompact = (n: number) => {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1).replace(/\.0$/, "") + "m";
  if (n >= 1_000) return (n / 1_000).toFixed(n % 1_000 === 0 ? 0 : 1).replace(/\.0$/, "") + "k";
  return String(n);
};

const ProjectCard = ({
  project,
  boosted,
  boostId,
  naturalCover = false,
  gallery = false,
  searchQuery = "",
}: ProjectCardProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: savedProjectIds = [] } = useSavedProjectIds(user?.id);
  const isDbProject = /^[0-9a-f]{8}-/.test(project.id);
  const savedInCollection = isDbProject && savedProjectIds.includes(project.id);
  const { likes, isLiked, toggle: toggleLike } = useProjectLike(isDbProject ? project.id : undefined);

  const [menuOpen, setMenuOpen] = useState(false);
  const [collectionOpen, setCollectionOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  // Phone gallery: long-press (touch only) opens Quick View instead of loading the full page.
  const pressTimer = useRef<number | null>(null);
  const pressStart = useRef<{ x: number; y: number } | null>(null);
  const suppressClick = useRef(false);
  // Phone gallery: double-tap likes (Instagram-style heart); a single tap waits a beat, then opens.
  const lastPointer = useRef<string>("mouse");
  const tapTimer = useRef<number | null>(null);
  const [heartBurst, setHeartBurst] = useState(0);
  useEffect(() => () => {
    if (tapTimer.current) window.clearTimeout(tapTimer.current);
  }, []);
  const cancelPress = () => {
    if (pressTimer.current) window.clearTimeout(pressTimer.current);
    pressTimer.current = null;
    pressStart.current = null;
  };
  const longPressHandlers = gallery
    ? {
        onPointerDown: (e: React.PointerEvent) => {
          lastPointer.current = e.pointerType;
          if (e.pointerType !== "touch") return;
          pressStart.current = { x: e.clientX, y: e.clientY };
          pressTimer.current = window.setTimeout(() => {
            pressTimer.current = null;
            suppressClick.current = true;
            hapticPress();
            useQuickView.getState().openFor(project.id);
          }, 450);
        },
        onPointerMove: (e: React.PointerEvent) => {
          const s0 = pressStart.current;
          if (s0 && Math.hypot(e.clientX - s0.x, e.clientY - s0.y) > 10) cancelPress();
        },
        onPointerUp: cancelPress,
        onPointerCancel: cancelPress,
        onContextMenu: (e: React.MouseEvent) => {
          // Keep the OS image menu from popping up over the preview.
          if (suppressClick.current || pressTimer.current) e.preventDefault();
        },
      }
    : {};
  const boostImpLogged = useRef(false);

  useEffect(() => {
    if (!boostId || !wrapRef.current || boostImpLogged.current) return;
    const el = wrapRef.current;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting && !boostImpLogged.current) {
            boostImpLogged.current = true;
            void logBoostEvent(boostId, "impression");
            obs.disconnect();
            break;
          }
        }
      },
      { threshold: 0.5 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [boostId]);



  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
    };
  }, [menuOpen]);

  const stop = (fn: () => void) => (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    fn();
  };

  const imageIndex = project.id.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const showNatural = naturalCover || gallery;
  const coverSrc = showNatural
    ? naturalFeedCoverUrl(project.image)
    : optimizedFeedImageUrl(project.image, { width: 480, quality: 70, natural: false });

  const goToProfile = (creator?: { id?: string; username?: string }) => {
    if (!creator?.id) return;
    navigate(profilePublicPath({ user_id: creator.id, username: creator.username }));
  };
  const creators = [
    {
      id: project.ownerId,
      name: project.owner,
      avatar: project.ownerAvatar,
      username: project.ownerUsername,
      verified: project.ownerVerified,
    },
    ...(project.collaborators ?? []),
  ];
  const showCornerBadges = projectHasDrillTag(project.tags) || project.aiAssisted;

  return (
    <motion.div
      className={cn("group cursor-pointer", gallery && "select-none [-webkit-touch-callout:none]")}
      {...longPressHandlers}
      onClick={() => {
        if (suppressClick.current) {
          suppressClick.current = false;
          return;
        }
        const open = () => {
          if (boostId) void logBoostEvent(boostId, "click");
          navigate(`/project/${project.id}`);
        };
        if (!gallery || lastPointer.current !== "touch") {
          open();
          return;
        }
        if (tapTimer.current) {
          window.clearTimeout(tapTimer.current);
          tapTimer.current = null;
          setHeartBurst((n) => n + 1);
          if (isDbProject && !isLiked) toggleLike();
          return;
        }
        tapTimer.current = window.setTimeout(() => {
          tapTimer.current = null;
          open();
        }, 260);
      }}
      whileHover={gallery ? undefined : { y: -2 }}
      whileTap={{ scale: 0.985 }}
      transition={{ duration: 0.22, ease: smoothEase }}
    >
      <div
        ref={wrapRef}
        className={cn(
          "relative isolate w-full overflow-hidden bg-[#e5e4e2]",
          "rounded-[6px]",
          !showNatural && "aspect-[4/3]",
        )}
      >
        <SafeDemoImage
          src={coverSrc}
          index={imageIndex}
          naturalFallback={showNatural}
          alt={project.title}
          width={showNatural ? 960 : 480}
          {...(showNatural ? {} : { height: 360 })}
          sizes="(max-width: 640px) 50vw, (max-width: 1280px) 33vw, 20vw"
          className={cn(
            "transition-transform duration-500 group-hover:scale-[1.03]",
            showNatural
              ? "block h-auto w-full"
              : "absolute inset-0 w-full h-full object-cover",
          )}
          loading="lazy"
        />

        <AnimatePresence>
          {heartBurst > 0 ? (
            <motion.span
              key={heartBurst}
              className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center"
              initial={{ opacity: 0, scale: 0.4 }}
              animate={{ opacity: [0, 1, 1, 0], scale: [0.4, 1.15, 1, 1.05] }}
              transition={{ duration: 0.8, times: [0, 0.25, 0.7, 1], ease: smoothEase }}
              onAnimationComplete={() => setHeartBurst(0)}
              aria-hidden
            >
              <Heart className="h-16 w-16 fill-white text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.45)]" strokeWidth={1.5} />
            </motion.span>
          ) : null}
        </AnimatePresence>

        {boosted ? (
          <div className="absolute top-2 left-2 z-10">
            <BoostBadge />
          </div>
        ) : null}

        <div className="absolute top-2 right-2 z-20 flex items-start gap-1.5 pointer-events-none">
          {showCornerBadges ? (
            <div className="flex flex-col items-end gap-1 pointer-events-auto">
              {projectHasDrillTag(project.tags) ? <DrillProjectBadge tags={project.tags} /> : null}
              <AiDisclosureBadge
                assisted={project.aiAssisted}
                note={project.aiDisclosureNote}
              />
            </div>
          ) : null}
          <SaveToCollectionPopover
            projectId={isDbProject ? project.id : undefined}
            align="end"
            onOpenChange={setCollectionOpen}
          >
            <button
              type="button"
              aria-label={savedInCollection ? "เก็บในคอลเลกชันแล้ว" : "เก็บเข้าคอลเลกชัน"}
              aria-pressed={savedInCollection}
              title="เก็บเข้าคอลเลกชัน"
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border/70 bg-background/90 text-foreground shadow-sm backdrop-blur-sm hover:bg-background transition-opacity duration-200",
                menuOpen || collectionOpen || savedInCollection
                  ? "opacity-100 pointer-events-auto"
                  : "opacity-0 pointer-events-none md:group-hover:opacity-100 md:group-hover:pointer-events-auto md:group-focus-within:opacity-100 md:group-focus-within:pointer-events-auto",
              )}
            >
              <Bookmark
                className={cn("h-4 w-4", savedInCollection && "fill-current")}
                strokeWidth={savedInCollection ? 0 : 1.8}
              />
            </button>
          </SaveToCollectionPopover>
        </div>

        {/* Hover glass overlay (desktop) — gradient blur from bottom */}
        <div
          className={cn(
            "absolute inset-0 pointer-events-none transition-opacity duration-300",
            "bg-gradient-to-t from-black/55 via-black/20 to-transparent",
            "supports-[backdrop-filter]:backdrop-blur-md [-webkit-backdrop-filter:blur(12px)]",
            "[mask-image:linear-gradient(to_top,black_18%,transparent_48%)]",
            "[-webkit-mask-image:linear-gradient(to_top,black_18%,transparent_48%)]",
            menuOpen ? "opacity-100" : "opacity-0 md:group-hover:opacity-100"
          )}
        />

        {/* Title only. Hire / collab live in chat. Share lives on the project page. */}
        <div
          className={cn(
            "absolute bottom-2 left-2 flex items-center gap-1 transition-all duration-200",
            "right-2",
            menuOpen
              ? "opacity-100 translate-y-0 pointer-events-auto"
              : "opacity-0 translate-y-1 pointer-events-none md:group-hover:opacity-100 md:group-hover:translate-y-0 md:group-hover:pointer-events-auto",
          )}
        >
          <div className="min-w-0 flex-1 pointer-events-none">
            <p className="text-white text-sm font-medium line-clamp-1 thai-leading-tight drop-shadow">
              {searchQuery.trim() ? highlight(project.title, searchQuery) : project.title}
            </p>
            {searchQuery.trim()
              ? (() => {
                  const fromDesc = extractSearchSnippet(project.description, searchQuery);
                  const fromTags = extractSearchSnippet((project.tags ?? []).join(" · "), searchQuery);
                  const fromTools = extractSearchSnippet((project.tools ?? []).join(" · "), searchQuery);
                  const snippet = fromDesc || fromTags || fromTools;
                  return snippet ? (
                    <p className="mt-0.5 text-[11px] text-white/80 line-clamp-2 drop-shadow">
                      {highlight(snippet, searchQuery)}
                    </p>
                  ) : null;
                })()
              : null}
          </div>
        </div>

      </div>

      {gallery ? null : (
      <div className="pt-2 px-0.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex shrink-0 -space-x-1.5 isolate" aria-label="เจ้าของผลงานและผู้ร่วมคอลแลป">
            {creators.map((creator, index) => {
              const avatar = (
                <UserAvatar
                  src={creator.avatar}
                  name={creator.name}
                  username={creator.username}
                  className="w-6 h-6 ring-2 ring-background"
                  fallbackClassName="text-[10px]"
                />
              );
              return creator.id ? (
                <button
                  key={creator.id}
                  type="button"
                  onClick={stop(() => goToProfile(creator))}
                  className="relative rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  style={{ zIndex: creators.length - index }}
                  aria-label={`เปิดโปรไฟล์ ${creator.name}`}
                  title={creator.name}
                >
                  {avatar}
                </button>
              ) : (
                <span key={`${creator.name}-${index}`} className="relative" aria-hidden>
                  {avatar}
                </span>
              );
            })}
          </div>
          <p
            className="text-sm text-foreground/90 thai-leading-tight min-w-0 truncate"
            title={creators.map((creator) => creator.name).join(", ")}
          >
            {creators.map((creator, index) => (
              <span key={creator.id ?? `${creator.name}-${index}`} className="inline-flex items-center gap-0.5">
                {index > 0 ? <span className="text-muted-foreground">, </span> : null}
                {creator.id ? (
                  <button
                    type="button"
                    onClick={stop(() => goToProfile(creator))}
                    className="inline max-w-full truncate text-left hover:text-primary hover:underline underline-offset-2 decoration-primary/80 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm"
                    aria-label={`เปิดโปรไฟล์ ${creator.name}`}
                  >
                    {creator.name}
                  </button>
                ) : (
                  <span>{creator.name}</span>
                )}
                <VerifiedBadge verified={creator.verified} size="sm" />
              </span>
            ))}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0 text-xs text-muted-foreground">
          <span className="flex items-center gap-1" title="ยอดเข้าชม" aria-label="ยอดเข้าชม">
            <Eye className="w-3.5 h-3.5" />
            {formatCompact(project.views ?? 0)}
          </span>
          <PlusOneControl
            active={isLiked}
            count={isDbProject ? likes : project.likes}
            onClick={stop(() => toggleLike())}
            ariaLabel={isLiked ? "ยกเลิกถูกใจ" : "ถูกใจ"}
          />
        </div>
      </div>
      )}
    </motion.div>
  );
};

export default ProjectCard;
