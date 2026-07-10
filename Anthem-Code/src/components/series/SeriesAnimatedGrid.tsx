import { Children, isValidElement, useEffect, useRef, useState, type ReactNode } from "react";
import { LayoutGroup, motion, useReducedMotion } from "framer-motion";
import { smoothEase } from "@/lib/motion";
import { cn } from "@/lib/utils";
import type { SeriesWorksDensity } from "@/lib/seriesGridDensity";
import { seriesDensityGridClass } from "@/lib/seriesGridDensity";

const layoutTransition = {
  layout: { duration: 0.42, ease: smoothEase },
};

type Props = {
  density: SeriesWorksDensity;
  className?: string;
  children: ReactNode;
  layoutGroupId?: string;
};

/** Smooth layout reflow when series grid density changes. */
export function SeriesAnimatedGrid({
  density,
  className,
  children,
  layoutGroupId = "series-works-grid",
}: Props) {
  const reduced = useReducedMotion();
  const items = Children.toArray(children);
  const prevDensity = useRef(density);
  const [shifting, setShifting] = useState(false);

  useEffect(() => {
    if (prevDensity.current === density) return;
    prevDensity.current = density;
    setShifting(true);
    const timer = window.setTimeout(() => setShifting(false), 420);
    return () => window.clearTimeout(timer);
  }, [density]);

  if (reduced) {
    return (
      <div className={cn(seriesDensityGridClass(density), className)} data-series-density={density}>
        {items.map((child, i) => {
          if (!isValidElement(child)) return child;
          return (
            <div key={child.key ?? `series-item-${i}`}>{child}</div>
          );
        })}
      </div>
    );
  }

  return (
    <LayoutGroup id={layoutGroupId}>
      <motion.div
        layout
        data-series-density={density}
        className={cn(seriesDensityGridClass(density), className)}
        animate={{ opacity: shifting ? 0.94 : 1 }}
        transition={{
          opacity: { duration: 0.22, ease: smoothEase },
          layout: layoutTransition.layout,
        }}
      >
        {items.map((child, i) => {
          if (!isValidElement(child)) return child;
          return (
            <motion.div
              key={child.key ?? `series-item-${i}`}
              layout
              transition={{ layout: layoutTransition.layout }}
            >
              {child}
            </motion.div>
          );
        })}
      </motion.div>
    </LayoutGroup>
  );
}
