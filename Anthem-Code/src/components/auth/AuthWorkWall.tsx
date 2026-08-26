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
  compact = false,
}: {
  items: DBProject[];
  direction: "up" | "down";
  animate: boolean;
  duration: string;
  className?: string;
  compact?: boolean;
}) {
  const loop = items.length ? [...items, ...items] : [];

  return (
    <div className={cn("relative min-h-0 min-w-0 flex-1 overflow-hidden", className)}>
      <div
        className={cn(
          "flex flex-col will-change-transform",
          compact ? "gap-2.5" : "gap-4",
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
              className={cn(
                "relative aspect-[3/4] w-full shrink-0 overflow-hidden bg-muted ring-1 ring-white/10",
                compact ? "rounded-xl" : "rounded-2xl",
              )}
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

type AuthWorkWallProps = {
  className?: string;
  /** In-flow 2-col vertical slider under the login form (mobile / tablet). */
  embed?: boolean;
};

/** Vertical zigzag work wall — full-bleed on desktop, 2-col embed on mobile. */
const AuthWorkWall = ({ className, embed = false }: AuthWorkWallProps) => {
  const reduced = useReducedMotion();
  const { data: top = [], isLoading } = useTopProjects();

  const withCover = useMemo(
    () => top.filter((p) => projectCover(p)).slice(0, embed ? 16 : 18),
    [top, embed],
  );

  const cols = useMemo(
    () => splitIntoColumns(withCover, embed ? 2 : 3, embed ? 4 : 5),
    [withCover, embed],
  );
  const animate = !reduced && withCover.length >= 4;

  if (embed) {
    if (isLoading && !withCover.length) {
      return (
        <div
          className={cn("h-[24rem] animate-pulse rounded-2xl bg-muted/20", className)}
          aria-hidden
        />
      );
    }

    if (!withCover.length) return null;

    return (
      <div className={cn("pointer-events-none relative", className)} aria-hidden>
        <div className="relative h-[24rem] overflow-hidden sm:h-[28rem]">
          <div className="flex h-full gap-2.5 overflow-hidden">
            <MarqueeColumn
              items={cols[0]}
              direction="up"
              animate={animate}
              duration="42s"
              compact
            />
            <MarqueeColumn
              items={cols[1]}
              direction="down"
              animate={animate}
              duration="54s"
              compact
            />
          </div>
          <div
            className="absolute inset-x-0 top-0 z-[1] h-10 bg-gradient-to-b from-background to-transparent"
            aria-hidden
          />
          <div
            className="absolute inset-x-0 bottom-0 z-[1] h-12 bg-gradient-to-t from-background to-transparent"
            aria-hidden
          />
        </div>
      </div>
    );
  }

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
      <MarqueeColumn items={cols[0]} direction="up" animate={animate} duration="34s" />
      <MarqueeColumn items={cols[1]} direction="down" animate={animate} duration="42s" />
      <MarqueeColumn
        items={cols[2]}
        direction="up"
        animate={animate}
        duration="38s"
        className="hidden xl:block"
      />
    </div>
  );
};

export default AuthWorkWall;
