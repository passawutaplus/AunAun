import { useLayoutEffect, useRef, useState } from "react";
import { LayoutGrid, Users, Building2, Orbit, Target } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { isAplus1LaunchMinimal, isLaunchDesignDrillEnabled } from "@/lib/aplus1Launch";

export type FeedMode = "projects" | "designers" | "studios" | "community";

type ToggleItem = {
  id: FeedMode | "drill";
  label: string;
  icon: typeof LayoutGrid;
  mobileOnly?: boolean;
  desktopOnly?: boolean;
};

interface Props {
  value: FeedMode;
  drillActive?: boolean;
  onChange: (v: FeedMode) => void;
  onDrillSelect?: () => void;
  className?: string;
  /** Icon-only (e.g. mobile while search is expanded) */
  compact?: boolean;
}

const items: ToggleItem[] = [
  { id: "projects", label: "Projects", icon: LayoutGrid },
  { id: "community", label: "Area", icon: Orbit, desktopOnly: true },
  { id: "drill", label: "Design Drill", icon: Target, mobileOnly: true },
  { id: "designers", label: "Designers", icon: Users },
  { id: "studios", label: "Studios", icon: Building2 },
];

const launchItems = items.filter(
  (item) => item.id === "projects" || item.id === "designers",
);

/** Smooth horizontal slide — spring tuned for a short pill travel. */
const slideTransition = {
  type: "spring" as const,
  stiffness: 380,
  damping: 34,
  mass: 0.7,
};

type IndicatorBox = { x: number; width: number };

const FeedModeToggle = ({
  value,
  drillActive = false,
  onChange,
  onDrillSelect,
  className,
  compact = false,
}: Props) => {
  const reduced = useReducedMotion();
  const trackRef = useRef<HTMLDivElement>(null);
  const btnRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const [indicator, setIndicator] = useState<IndicatorBox | null>(null);

  const visible = (isAplus1LaunchMinimal() ? launchItems : items).filter(
    (item) => item.id !== "drill" || isLaunchDesignDrillEnabled(),
  );

  /** Equal-width segments → pill mostly translates X (feels like a clean L/R slide). */
  const equalSplit = visible.every((item) => !item.mobileOnly && !item.desktopOnly);

  const activeId = drillActive ? "drill" : value;
  const visibleKey = visible.map((v) => v.id).join("|");

  useLayoutEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    const measure = () => {
      const btn = btnRefs.current.get(activeId);
      if (!btn) {
        setIndicator(null);
        return;
      }
      const btnRect = btn.getBoundingClientRect();
      if (btnRect.width < 1) {
        setIndicator(null);
        return;
      }
      const trackRect = track.getBoundingClientRect();
      const next = {
        x: btnRect.left - trackRect.left,
        width: btnRect.width,
      };
      setIndicator((prev) =>
        prev &&
        Math.abs(prev.x - next.x) < 0.5 &&
        Math.abs(prev.width - next.width) < 0.5
          ? prev
          : next,
      );
    };

    measure();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    ro?.observe(track);
    window.addEventListener("resize", measure);
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [activeId, visibleKey, equalSplit, compact]);

  return (
    <div
      ref={trackRef}
      className={cn(
        "relative shrink-0 flex items-center rounded-full glass-panel p-0.5 transition-[width,box-shadow] duration-200",
        "hover:shadow-md hover:shadow-primary/20",
        equalSplit && !compact && "w-[14.5rem]",
        className,
      )}
      role="group"
      aria-label="Feed view"
    >
      {indicator ? (
        reduced ? (
          <span
            className="pointer-events-none absolute top-0.5 bottom-0.5 left-0 rounded-full bg-gradient-brand"
            style={{ transform: `translateX(${indicator.x}px)`, width: indicator.width }}
            aria-hidden
          />
        ) : (
          <motion.span
            className="pointer-events-none absolute top-0.5 bottom-0.5 left-0 rounded-full bg-gradient-brand will-change-transform"
            initial={false}
            animate={{ x: indicator.x, width: indicator.width }}
            transition={slideTransition}
            aria-hidden
          />
        )
      ) : null}

      {visible.map(({ id, label, icon: Icon, mobileOnly, desktopOnly }) => {
        const active = id === activeId;
        const visibility = mobileOnly
          ? "flex lg:hidden"
          : desktopOnly
            ? "hidden lg:flex"
            : "flex";

        return (
          <button
            key={id}
            type="button"
            ref={(el) => {
              if (el) btnRefs.current.set(id, el);
              else btnRefs.current.delete(id);
            }}
            aria-label={`${label} view`}
            aria-pressed={active}
            onClick={() => (id === "drill" ? onDrillSelect?.() : onChange(id))}
            className={cn(
              "relative z-10 items-center justify-center rounded-full text-xs font-medium transition-[padding,gap,colors] duration-200",
              compact ? "gap-0 px-2.5 py-1.5" : "gap-1.5 px-3 py-1.5",
              visibility,
              equalSplit && !compact && "flex-1",
              active
                ? "text-white"
                : "text-foreground/75 hover:text-foreground",
            )}
          >
            <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden />
            <span
              className={cn(
                "overflow-hidden whitespace-nowrap transition-[max-width,opacity,margin] duration-200",
                compact ? "max-w-0 opacity-0" : "max-w-[6rem] opacity-100",
              )}
              aria-hidden={compact}
            >
              {label}
            </span>
          </button>
        );
      })}
    </div>
  );
};

export default FeedModeToggle;
