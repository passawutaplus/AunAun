import BriefcaseIcon from "./icons/BriefcaseIcon";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Bookmark, Eye, MoreHorizontal, Handshake } from "lucide-react";
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
import { profilePublicPath } from "@/lib/profileRoutes";

interface ProjectCardProps {
  project: Project;
  onHireClick?: (projectId: string) => void;
  onCollabClick?: (projectId: string) => void;
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
  onHireClick,
  onCollabClick,
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
  const showHire = project.allowHire ?? true;
  const showCollab = project.allowCollab ?? true;
  const hasCardActions = showHire || showCollab;
  const showCornerBadges = projectHasDrillTag(project.tags) || project.aiAssisted;

  return (
    <motion.div
      className="group cursor-pointer"
      onClick={() => {
        if (boostId) void logBoostEvent(boostId, "click");
        navigate(`/project/${project.id}`);
      }}
      whileHover={gallery ? undefined : { y: -2 }}
      whileTap={{ scale: 0.985 }}
      transition={{ duration: 0.22, ease: smoothEase }}
    >
      <div
        ref={wrapRef}
        className={cn(
          "relative w-full overflow-hidden bg-[#e5e4e2]",
          "rounded-none",
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
              title="Keep Collection"
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

        {/* Title on the left, hire / collab on the right. Share lives on the project page. */}
        <div
          className={cn(
            "absolute bottom-2 left-2 flex items-center gap-1 transition-all duration-200",
            hasCardActions ? "right-10 md:right-2" : "right-2",
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
          {hasCardActions ? (
            <div className="flex shrink-0 items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
              {showHire && (
                <button
                  onClick={stop(() => onHireClick?.(project.id))}
                  aria-label="สนใจจ้างงาน"
                  title="สนใจจ้างงาน"
                  className="p-1.5 rounded-full text-white hover:bg-white/15 transition-colors"
                >
                  <BriefcaseIcon className="w-4 h-4" />
                </button>
              )}
              {showCollab && (
                <button
                  onClick={stop(() => onCollabClick?.(project.id))}
                  aria-label="สนใจคอลแลป"
                  title="สนใจคอลแลป"
                  className="p-1.5 rounded-full text-white hover:bg-white/15 transition-colors"
                >
                  <Handshake className="w-4 h-4" />
                </button>
              )}
            </div>
          ) : null}
        </div>

        {hasCardActions ? (
        <button
          onClick={stop(() => setMenuOpen((v) => !v))}
          aria-label="ตัวเลือก"
          aria-expanded={menuOpen}
          className={cn(
            "absolute bottom-2 right-2 p-1.5 rounded-full transition-all hover:scale-110 text-white md:hidden",
            menuOpen
              ? "bg-white/20 border border-white/25 backdrop-blur-md opacity-100"
              : "bg-background/15 border border-white/10 backdrop-blur-md"
          )}
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>
        ) : null}
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
