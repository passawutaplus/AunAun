import { useMemo } from "react";
import { useReducedMotion } from "framer-motion";
import { useTopProjects, type DBProject } from "@/hooks/useProjects";
import { optimizedFeedImageUrl } from "@/lib/feedProjectCover";
import { cn } from "@/lib/utils";

const projectCover = (p: DBProject) =>
  p.cover_url?.trim() || p.gallery_urls?.find((url) => url?.trim()) || "";

function wallThumbUrl(url: string) {
  return optimizedFeedImageUrl(url, { width: 420, quality: 70, natural: false });
}

function splitIntoColumns(items: DBProject[], count: number, minPerCol = 5): DBProject[][] {
  const cols: DBProject[][] = Array.from({ length: count }, () => []);
  items.forEach((item, i) => {
    cols[i % count].push(item);
  });
  return cols.map((col) => {
    if (!items.length) return col;
    const filled = col.length ? [...col] : [...items];
    let i = 0;
    while (filled.length < minPerCol) {
      filled.push(items[i % items.length]);
      i += 1;
    }
    return filled;
  });
}

function MarqueeColumn({
  items,
  direction,
  animate,
  duration,
  className,
}: {
  items: DBProject[];
  direction: "up" | "down";
  animate: boolean;
  duration: string;
  className?: string;
}) {
  const loop = items.length ? [...items, ...items] : [];

  return (
    <div className={cn("relative min-h-0 min-w-0 flex-1 overflow-hidden", className)}>
      <div
        className={cn(
          "flex flex-col gap-4 will-change-transform",
          animate && (direction === "up" ? "animate-work-wall-up" : "animate-work-wall-down"),
        )}
        style={animate ? { animationDuration: duration } : undefined}
      >
        {loop.map((project, index) => {
          const src = wallThumbUrl(projectCover(project));
          const isClone = index >= items.length;
          const eager = !isClone && index < 3;

          return (
            <div
              key={`${project.id}-${index}`}
              aria-hidden={isClone || undefined}
              className="relative aspect-[3/4] w-full shrink-0 overflow-hidden rounded-2xl bg-muted ring-1 ring-white/10"
            >
              <img
                src={src}
                alt=""
                width={420}
                height={560}
                decoding={eager ? "sync" : "async"}
                loading={eager ? "eager" : "lazy"}
                fetchPriority={eager && index === 0 ? "high" : "low"}
                className="h-full w-full object-cover"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Vertical zigzag work wall for the auth page — 2 cols at lg, 3 at xl. */
const AuthWorkWall = ({ className }: { className?: string }) => {
  const reduced = useReducedMotion();
  const { data: top = [], isLoading } = useTopProjects();

  const withCover = useMemo(
    () => top.filter((p) => projectCover(p)).slice(0, 18),
    [top],
  );

  const [colA, colB, colC] = useMemo(
    () => splitIntoColumns(withCover, 3),
    [withCover],
  );
  const animate = !reduced && withCover.length >= 4;

  if (isLoading && !withCover.length) {
    return (
      <div
        className={cn("absolute inset-0 animate-pulse bg-muted/20", className)}
        aria-hidden
      />
    );
  }

  if (!withCover.length) return null;

  return (
    <div
      className={cn("pointer-events-none absolute inset-0 flex gap-3 overflow-hidden", className)}
      aria-hidden
    >
      <MarqueeColumn items={colA} direction="up" animate={animate} duration="34s" />
      <MarqueeColumn items={colB} direction="down" animate={animate} duration="42s" />
      <MarqueeColumn
        items={colC}
        direction="up"
        animate={animate}
        duration="38s"
        className="hidden xl:block"
      />
    </div>
  );
};

export default AuthWorkWall;
