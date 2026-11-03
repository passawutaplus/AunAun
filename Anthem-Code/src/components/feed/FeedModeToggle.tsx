import { useLayoutEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import ExhibitionIcon from "@/components/icons/ExhibitionIcon";
import { Box, LayoutGrid, Target, Users } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import PackagesIcon from "@/components/icons/PackagesIcon";
import { isFeedModeVisible, isLaunchDesignDrillEnabled } from "@/lib/aplus1Launch";

export type FeedMode = "showcase" | "creators" | "packages" | "objects" | "studios" | "community";

const FEED_MODES: readonly FeedMode[] = ["showcase", "creators", "packages", "objects", "studios", "community"];
/** Pre-rename ids still arriving via old links (`?mode=designers`) and stored `feed-mode` values. */
const LEGACY_FEED_MODES: Record<string, FeedMode> = { projects: "showcase", designers: "creators" };

/** Read a feed mode from a URL param or storage, mapping the old ids; null when unknown. */
export function parseFeedMode(raw: string | null | undefined): FeedMode | null {
  if (!raw) return null;
  if ((FEED_MODES as readonly string[]).includes(raw)) return raw as FeedMode;
  return LEGACY_FEED_MODES[raw] ?? null;
}

type ToggleItem = {
  /** "drill" and "exhibition" are buttons that leave the feed instead of switching its mode. */
  id: FeedMode | "drill" | "exhibition";
  label: string;
  icon: LucideIcon;
  mobileOnly?: boolean;
  desktopOnly?: boolean;
};

interface Props {
  value: FeedMode;
  drillActive?: boolean;
  /** True on /exhibition, where the pill sits on Exhibition. */
  exhibitionActive?: boolean;
  onChange: (v: FeedMode) => void;
  onDrillSelect?: () => void;
  /** Replaces the default "go to /exhibition" (e.g. the search screen just switches scope). */
  onExhibitionSelect?: () => void;
  className?: string;
  /** Icon-only (e.g. mobile while search is expanded) */
  compact?: boolean;
}

const items: ToggleItem[] = [
  { id: "showcase", label: "Showcase", icon: LayoutGrid },
  { id: "drill", label: "Design Drill", icon: Target, mobileOnly: true },
  { id: "creators", label: "Creators", icon: Users },
  { id: "exhibition", label: "Exhibition", icon: ExhibitionIcon },
  { id: "packages", label: "Packages", icon: PackagesIcon },
  { id: "objects", label: "Objects", icon: Box },
];

/** Smooth horizontal slide — spring tuned for a short pill travel. */
const slideTransition = {
  type: "spring" as const,
  stiffness: 380,
  damping: 34,
  mass: 0.7,
};

type IndicatorBox = { x: number; width: number };

/**
 * Segment that was active when the user last clicked the toggle. Exhibition is its own route, so switching to or from it
 * remounts the toggle; the new one starts the pill on the old segment and slides it over.
 */
let lastActive: { id: string; at: number } | null = null;
const HANDOFF_MS = 1500;

const FeedModeToggle = ({
  value,
  drillActive = false,
  exhibitionActive = false,
  onChange,
  onDrillSelect,
  onExhibitionSelect,
  className,
  compact = false,
}: Props) => {
  const reduced = useReducedMotion();
  const navigate = useNavigate();
  const trackRef = useRef<HTMLDivElement>(null);
  const btnRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const [indicator, setIndicator] = useState<IndicatorBox | null>(null);
  const indicatorRef = useRef(indicator);
  indicatorRef.current = indicator;

  const visible = items.filter((item) =>
    item.id === "drill"
      ? isLaunchDesignDrillEnabled()
      : item.id === "exhibition" || isFeedModeVisible(item.id as FeedMode),
  );

  /** Equal-width segments → pill mostly translates X (feels like a clean L/R slide). */
  const equalSplit = visible.every((item) => !item.mobileOnly && !item.desktopOnly);
  const packed = equalSplit && !compact && visible.length <= 3;

  const activeId = drillActive ? "drill" : exhibitionActive ? "exhibition" : value;
  const visibleKey = visible.map((v) => v.id).join("|");

  useLayoutEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    let firstMeasured = indicatorRef.current !== null;
    let slideRaf = 0;
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
      const handoff = lastActive;
      if (!firstMeasured && handoff && handoff.id !== activeId && Date.now() - handoff.at < HANDOFF_MS) {
        const fromRect = btnRefs.current.get(handoff.id)?.getBoundingClientRect();
        if (fromRect && fromRect.width >= 1) {
          firstMeasured = true;
          setIndicator({ x: fromRect.left - trackRect.left, width: fromRect.width });
          slideRaf = window.requestAnimationFrame(() => setIndicator(next));
          return;
        }
      }
      firstMeasured = true;
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
    // Label widths change when the web font lands; re-measure so the pill never lags behind them.
    let live = true;
    void document.fonts?.ready.then(() => live && measure());
    const raf = window.requestAnimationFrame(measure);
    window.addEventListener("resize", measure);
    return () => {
      live = false;
      window.cancelAnimationFrame(raf);
      window.cancelAnimationFrame(slideRaf);
      ro?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [activeId, visibleKey, equalSplit, compact]);

  return (
    <div
      ref={trackRef}
      className={cn(
        "relative shrink-0 flex items-center rounded-full border border-border bg-white p-0.5 shadow-none transition-[width] duration-200 dark:bg-card",
        // Phones: icon-only segments at their natural width; tablets and up get labels and fixed equal widths.
        packed && visible.length === 2 && "md:w-[14.5rem]",
        packed && visible.length === 3 && "md:w-[21.75rem]",
        !compact && visible.length >= 4 && "w-max",
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
            onClick={() => {
              lastActive = { id: activeId, at: Date.now() };
              if (id === "drill") onDrillSelect?.();
              else if (id === "exhibition") (onExhibitionSelect ?? (() => navigate("/exhibition")))();
              else onChange(id);
            }}
            className={cn(
              "relative z-10 items-center justify-center rounded-full text-xs font-medium transition-[padding,gap,colors] duration-200",
              compact ? "gap-0 px-2.5 py-1.5" : "gap-0 px-3.5 py-1.5 md:gap-1.5 md:px-3",
              visibility,
              packed && "md:flex-1",
              active
                ? "text-white dark:text-primary-foreground"
                : "text-foreground/75 hover:text-foreground",
              // The label colour assumes the sliding pill is under it; if the pill is not drawn
              // (not measured yet / failed) paint the same fill on the button so the label stays readable.
              active && !indicator && "bg-primary",
            )}
          >
            <Icon className="w-4 h-4 shrink-0 md:w-3.5 md:h-3.5" aria-hidden />
            <span
              className={cn(
                "overflow-hidden whitespace-nowrap transition-[max-width,opacity,margin] duration-200",
                // Labels from md (tablet) up; below that the icon carries the segment (aria-label names it).
                compact ? "max-w-0 opacity-0" : "max-w-0 opacity-0 md:max-w-[6rem] md:opacity-100",
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
