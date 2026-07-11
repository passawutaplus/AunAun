import { Children, isValidElement, useEffect, useRef, useState, type ReactNode } from "react";
import { LayoutGroup, motion, useReducedMotion } from "framer-motion";
import { smoothEase } from "@/lib/motion";
import { cn } from "@/lib/utils";

const layoutTransition = {
  layout: { duration: 0.42, ease: smoothEase },
};

type Props = {
  /** Density key — used to trigger shift animation + data attribute. */
  density: string;
  gridClassName: string;
  className?: string;
  children: ReactNode;
  layoutGroupId?: string;
};

/** Smooth layout reflow when grid density / column count changes. */
export function AnimatedDensityGrid({
  density,
  gridClassName,
  className,
  children,
  layoutGroupId = "density-grid",
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
      <div className={cn(gridClassName, className)} data-grid-density={density}>
        {items.map((child, i) => {
          if (!isValidElement(child)) return child;
          return <div key={child.key ?? `density-item-${i}`} className="break-inside-avoid">{child}</div>;
        })}
      </div>
    );
  }

  return (
    <LayoutGroup id={layoutGroupId}>
      <motion.div
        layout
        data-grid-density={density}
        className={cn(gridClassName, className)}
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
              key={child.key ?? `density-item-${i}`}
              layout
              className="break-inside-avoid"
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
