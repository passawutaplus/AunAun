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
  const mid = Math.ceil(items.length / 2);
  const rowA = items.slice(0, mid);
  const rowB = items.slice(mid);
  if (rowB.length < 4 && rowA.length > 4) {
    return [items.filter((_, i) => i % 2 === 0), items.filter((_, i) => i % 2 === 1)];
  }
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
    <div className="relative overflow-hidden">
      <div
        className={cn(
          "flex w-max gap-2.5 sm:gap-3 will-change-transform",
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
                "h-[9.5rem] w-[13.5rem] sm:h-[12rem] sm:w-[17rem] md:h-[14rem] md:w-[20rem] lg:h-[16rem] lg:w-[23rem]",
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
              <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent opacity-70" />
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Ambient portfolio wall — 1 row mobile, 2 rows desktop, continuous scroll. */
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
        "absolute inset-0 z-0 flex flex-col justify-center gap-3 sm:gap-4 overflow-hidden py-10 sm:py-12 md:py-14",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-y-0 left-0 z-[1] w-10 sm:w-16 md:w-20 lg:w-28 bg-gradient-to-r from-background from-[8%] via-background/75 via-[45%] to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-[1] w-10 sm:w-16 md:w-20 lg:w-28 bg-gradient-to-l from-background from-[8%] via-background/75 via-[45%] to-transparent" />

      <div className="md:hidden">
        <MarqueeRow items={withCover} direction="left" animate={animate} eagerCount={4} />
      </div>

      <div className="hidden md:flex md:flex-col md:gap-4">
        <MarqueeRow items={rowA} direction="left" animate={animate} eagerCount={5} />
        <MarqueeRow items={rowB} direction="right" animate={animate} eagerCount={3} />
      </div>
    </div>
  );
};

export default WorkWallMarquee;
