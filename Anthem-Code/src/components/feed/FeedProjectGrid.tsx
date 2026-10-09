import { Children, isValidElement, useEffect, useRef, useState, type ReactNode } from "react";
import { LayoutGroup, motion, useReducedMotion } from "framer-motion";
import { useFeedGridDensity } from "@/hooks/useFeedGridDensity";
import { FEED_PROJECT_GRID_GAP } from "@/lib/feedMasonry";
import { smoothEase, staggerReveal, viewportOnce } from "@/lib/motion";
import { cn } from "@/lib/utils";

const layoutTransition = {
  layout: { duration: 0.42, ease: smoothEase },
};

type Props = {
  className?: string;
  /** Stretch cards to the row height (package listing). */
  itemClassName?: string;
  /** Override density picker, e.g. locked 4-column package grid. */
  columnsClass?: string;
  /** Pinterest columns — each image keeps its own height. */
  masonry?: boolean;
  children: ReactNode;
};

/** Project feed grid with smooth layout animation when density changes. */
export function FeedProjectGrid({ className, itemClassName, columnsClass, masonry = false, children }: Props) {
  const { density, mobileColumns, narrow, gridClass } = useFeedGridDensity();
  const reduced = useReducedMotion();
  const items = Children.toArray(children);
  const resolvedGrid = columnsClass ?? gridClass;
  const layoutKey = columnsClass ? "locked" : narrow ? mobileColumns : density;
  const prevLayoutKey = useRef(layoutKey);
  const [shifting, setShifting] = useState(false);

  useEffect(() => {
    if (prevLayoutKey.current === layoutKey) return;
    prevLayoutKey.current = layoutKey;
    setShifting(true);
    const timer = window.setTimeout(() => setShifting(false), 420);
    return () => window.clearTimeout(timer);
  }, [layoutKey]);

  if (masonry) {
    return (
      <div
        className={cn("columns-2 gap-2 sm:columns-3 sm:gap-2.5 lg:columns-4 xl:columns-5", className)}
        data-feed-results=""
        data-feed-density="masonry"
      >
        {items.map((child, i) =>
          isValidElement(child) ? (
            <div key={child.key ?? `feed-item-${i}`} className={cn("mb-2 break-inside-avoid sm:mb-2.5", itemClassName)}>
              {child}
            </div>
          ) : (
            child
          ),
        )}
      </div>
    );
  }

  if (reduced) {
    return (
      <div className={cn(resolvedGrid, FEED_PROJECT_GRID_GAP, className)} data-feed-results="" data-feed-density={layoutKey}>
        {itemClassName
          ? items.map((child, i) =>
              isValidElement(child) ? (
                <div key={child.key ?? `feed-item-${i}`} className={itemClassName}>
                  {child}
                </div>
              ) : (
                child
              ),
            )
          : children}
      </div>
    );
  }

  return (
    <LayoutGroup id="feed-project-grid">
      <motion.div
        layout
        data-feed-results=""
        data-feed-density={layoutKey}
        className={cn(resolvedGrid, FEED_PROJECT_GRID_GAP, className)}
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
              key={child.key ?? `feed-item-${i}`}
              layout
              className={itemClassName}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={viewportOnce}
              transition={{
                layout: layoutTransition.layout,
                ...staggerReveal(i, { dense: true }),
              }}
            >
              {child}
            </motion.div>
          );
        })}
      </motion.div>
    </LayoutGroup>
  );
}
