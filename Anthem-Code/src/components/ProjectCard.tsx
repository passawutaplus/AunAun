import BriefcaseIcon from "./icons/BriefcaseIcon";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Eye, MoreHorizontal, Layers3, Share2, Handshake } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { Project } from "@/data/projectTypes";
import { useProjectLike } from "@/hooks/useProjectInteractions";
import SaveToCollectionPopover from "@/components/collections/SaveToCollectionPopover";
import SharePopover from "@/components/SharePopover";
import { cn } from "@/lib/utils";
import SafeDemoImage from "@/components/SafeDemoImage";
import { naturalFeedCoverUrl, optimizedFeedImageUrl } from "@/lib/feedProjectCover";
import { smoothEase } from "@/lib/motion";
import BoostBadge from "@/components/boost/BoostBadge";
import { DrillProjectBadge } from "@/components/drill/DrillProjectBadge";
import { projectHasDrillTag } from "@/lib/drillProject";
import { logBoostEvent } from "@/hooks/useBoost";
import { PlusOneControl } from "@/components/brand/PlusOneControl";
import UserAvatar from "@/components/UserAvatar";

interface ProjectCardProps {
  project: Project;
  onHireClick?: (projectId: string) => void;
  onCollabClick?: (projectId: string) => void;
  boosted?: boolean;
  boostId?: string;
  /** Feed masonry — preserve original cover aspect (no CDN crop). */
  naturalCover?: boolean;
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
}: ProjectCardProps) => {
  const navigate = useNavigate();
  const isDbProject = /^[0-9a-f]{8}-/.test(project.id);
  const { likes, isLiked, toggle: toggleLike } = useProjectLike(isDbProject ? project.id : undefined);

  const [menuOpen, setMenuOpen] = useState(false);
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

  const shareUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/project/${project.id}`;
  const imageIndex = project.id.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const coverSrc = naturalCover
    ? naturalFeedCoverUrl(project.image)
    : optimizedFeedImageUrl(project.image, { width: 480, quality: 70, natural: false });

  const goToProfile = (userId?: string) => {
    if (userId) navigate(`/u/${userId}`);
  };
  const creators = [
    {
      id: project.ownerId,
      name: project.owner,
      avatar: project.ownerAvatar,
      username: project.ownerUsername,
    },
    ...(project.collaborators ?? []),
  ];

  return (
    <motion.div
      className="group cursor-pointer"
      onClick={() => {
        if (boostId) void logBoostEvent(boostId, "click");
        navigate(`/project/${project.id}`);
      }}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.985 }}
      transition={{ duration: 0.22, ease: smoothEase }}
    >
      <div
        ref={wrapRef}
        className={cn(
          "relative w-full overflow-hidden rounded-[6px] bg-muted",
          !naturalCover && "aspect-[4/3]",
        )}
      >
        <SafeDemoImage
          src={coverSrc}
          index={imageIndex}
          naturalFallback={naturalCover}
          alt={project.title}
          width={naturalCover ? 640 : 480}
          {...(naturalCover ? {} : { height: 360 })}
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 240px"
          className={cn(
            "transition-transform duration-500 group-hover:scale-[1.04]",
            naturalCover
              ? "w-full h-auto block"
              : "absolute inset-0 w-full h-full object-cover",
          )}
          loading="lazy"
        />

        {boosted ? (
          <div className="absolute top-2 left-2 z-10">
            <BoostBadge />
          </div>
        ) : null}

        {projectHasDrillTag(project.tags) ? (
          <div className="absolute top-2 right-2 z-10">
            <DrillProjectBadge tags={project.tags} />
          </div>
        ) : null}

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

        {/* Project title — bottom-left, visible on hover or when menu open */}
        <div
          className={cn(
            "absolute bottom-2 left-3 right-12 md:right-3 pointer-events-none transition-opacity duration-300",
            menuOpen ? "opacity-100" : "opacity-0 md:group-hover:opacity-100"
          )}
        >
          <p className="text-white text-sm font-medium line-clamp-1 thai-leading-tight drop-shadow">
            {project.title}
          </p>
        </div>

        {/* Action icons — hover on desktop, menu open, or tap ⋯ on mobile */}
        <div
          className={cn(
            "absolute bottom-9 left-2 right-2 flex items-center gap-0.5 transition-all duration-200",
            menuOpen
              ? "opacity-100 translate-y-0 pointer-events-auto"
              : "opacity-0 translate-y-1 pointer-events-none md:group-hover:opacity-100 md:group-hover:translate-y-0 md:group-hover:pointer-events-auto",
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {(project.allowHire ?? true) && (
            <button
              onClick={stop(() => onHireClick?.(project.id))}
              aria-label="สนใจจ้างงาน"
              title="สนใจจ้างงาน"
              className="p-1.5 rounded-full text-white hover:bg-white/15 transition-colors"
            >
              <BriefcaseIcon className="w-4 h-4" />
            </button>
          )}
          {(project.allowCollab ?? true) && (
            <button
              onClick={stop(() => onCollabClick?.(project.id))}
              aria-label="สนใจคอลแลป"
              title="สนใจคอลแลป"
              className="p-1.5 rounded-full text-white hover:bg-white/15 transition-colors"
            >
              <Handshake className="w-4 h-4" />
            </button>
          )}
          <SaveToCollectionPopover projectId={isDbProject ? project.id : undefined}>
            <button
              aria-label="เก็บเข้าคอลเลกชัน"
              title="เก็บเข้าคอลเลกชัน"
              className="p-1.5 rounded-full text-white hover:bg-white/15 transition-colors"
            >
              <Layers3 className="w-4 h-4" />
            </button>
          </SaveToCollectionPopover>
          <SharePopover url={shareUrl} title={project.title} label="แชร์ผลงาน" align="start">
            <button
              type="button"
              onClick={(e) => e.stopPropagation()}
              aria-label="แชร์"
              title="แชร์"
              className="p-1.5 rounded-full text-white hover:bg-white/15 transition-colors"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </SharePopover>
        </div>

        {/* 3-dot trigger — bottom-right, hover-reveal on desktop, always-on mobile */}
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
      </div>

      {/* Creator row — owner/collaborators on the left, view/like on the right */}
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
                  onClick={stop(() => goToProfile(creator.id))}
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
          <span
            className="text-sm text-foreground/90 line-clamp-1 thai-leading-tight"
            title={creators.map((creator) => creator.name).join(", ")}
          >
            {creators.map((creator) => creator.name).join(", ")}
          </span>
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
    </motion.div>
  );
};

export default ProjectCard;
