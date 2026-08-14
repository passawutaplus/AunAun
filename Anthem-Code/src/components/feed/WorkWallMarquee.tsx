import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useReducedMotion } from "framer-motion";
import { useTopProjects, type DBProject } from "@/hooks/useProjects";
import { optimizedFeedImageUrl } from "@/lib/feedProjectCover";
import { cn } from "@/lib/utils";

const projectCover = (p: DBProject) =>
  p.cover_url?.trim() || p.gallery_urls?.find((url) => url?.trim()) || "";

function wallThumbUrl(url: string) {
  return optimizedFeedImageUrl(url, { width: 560, quality: 70, natural: false });
}

function splitRows(items: DBProject[]): [DBProject[], DBProject[]] {
  if (items.length <= 1) return [items, items];
  const rowA = items.filter((_, i) => i % 2 === 0);
  const rowB = items.filter((_, i) => i % 2 === 1);
  return [rowA, rowB.length ? rowB : rowA];
}

function MarqueeRow({
  items,
  direction,
  animate,
  eagerCount,
}: {
  items: DBProject[];
  direction: "left" | "right";
  animate: boolean;
  eagerCount: number;
}) {
  const navigate = useNavigate();
  const loop = items.length ? [...items, ...items] : [];

  return (
    <div className="relative min-h-0 overflow-hidden max-lg:flex-1">
      <div
        className={cn(
          "flex w-max items-stretch gap-2.5 sm:gap-3 will-change-transform max-lg:h-full",
          animate && (direction === "left" ? "animate-work-wall-left" : "animate-work-wall-right"),
        )}
        style={animate ? undefined : { transform: "translateX(0)" }}
      >
        {loop.map((project, index) => {
          const raw = projectCover(project);
          const src = wallThumbUrl(raw);
          const isClone = index >= items.length;
          const eager = !isClone && index < eagerCount;

          return (
            <button
              key={`${project.id}-${index}`}
              type="button"
              tabIndex={isClone ? -1 : 0}
              aria-hidden={isClone || undefined}
              aria-label={isClone ? undefined : `ดูผลงาน: ${project.title}`}
              onClick={() => navigate(`/project/${project.id}`)}
              className={cn(
                "group relative shrink-0 overflow-hidden rounded-xl sm:rounded-2xl",
                "max-lg:h-full aspect-[7/5] lg:h-[14.5rem] lg:w-[20.5rem] lg:aspect-auto",
                "bg-muted ring-1 ring-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
              )}
            >
              <img
                src={src}
                alt=""
                width={560}
                height={400}
                decoding={eager ? "sync" : "async"}
                loading={eager ? "eager" : "lazy"}
                fetchPriority={eager && index === 0 ? "high" : "low"}
                className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
              />
              <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent opacity-80" />
              {!isClone && project.title ? (
                <span className="pointer-events-none absolute inset-x-0 bottom-0 px-2 pb-1.5 sm:px-2.5 sm:pb-2">
                  <span className="block truncate text-left text-[11px] sm:text-xs font-medium text-white drop-shadow thai-leading-tight">
                    {project.title}
                  </span>
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Ambient portfolio wall — 2 sliding rows, opposite directions. */
const WorkWallMarquee = ({ className }: { className?: string }) => {
  const reduced = useReducedMotion();
  const { data: top = [], isLoading } = useTopProjects();

  const withCover = useMemo(
    () => top.filter((p) => projectCover(p)).slice(0, 24),
    [top],
  );

  const [rowA, rowB] = useMemo(() => splitRows(withCover), [withCover]);
  const animate = !reduced && withCover.length >= 4;

  if (isLoading && !withCover.length) {
    return (
      <div
        className={cn(
          "absolute inset-0 bg-gradient-to-br from-primary/[0.06] via-muted/30 to-muted/50 animate-pulse",
          className,
        )}
        aria-hidden
      />
    );
  }

  if (!withCover.length) {
    return (
      <div
        className={cn(
          "absolute inset-0 bg-gradient-to-br from-primary/[0.08] via-muted/40 to-background",
          className,
        )}
        aria-hidden
      />
    );
  }

  return (
    <div
      className={cn(
        "absolute inset-0 z-0 flex h-full min-h-0 flex-col gap-2.5 sm:gap-3 overflow-hidden py-1 sm:py-2 lg:justify-center",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-y-0 left-0 z-[1] w-8 sm:w-12 md:w-16 bg-gradient-to-r from-background from-[8%] via-background/70 via-[45%] to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-[1] w-8 sm:w-12 md:w-16 bg-gradient-to-l from-background from-[8%] via-background/70 via-[45%] to-transparent" />

      <MarqueeRow items={rowA} direction="left" animate={animate} eagerCount={5} />
      <MarqueeRow items={rowB} direction="right" animate={animate} eagerCount={3} />
    </div>
  );
};

export default WorkWallMarquee;
