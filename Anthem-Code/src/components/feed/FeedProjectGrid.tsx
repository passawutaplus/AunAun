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
  children: ReactNode;
};

/** Project feed grid with smooth layout animation when density changes. */
export function FeedProjectGrid({ className, children }: Props) {
  const { density, mobileColumns, narrow, gridClass } = useFeedGridDensity();
  const reduced = useReducedMotion();
  const items = Children.toArray(children);
  const layoutKey = narrow ? mobileColumns : density;
  const prevLayoutKey = useRef(layoutKey);
  const [shifting, setShifting] = useState(false);

  useEffect(() => {
    if (prevLayoutKey.current === layoutKey) return;
    prevLayoutKey.current = layoutKey;
    setShifting(true);
    const timer = window.setTimeout(() => setShifting(false), 420);
    return () => window.clearTimeout(timer);
  }, [layoutKey]);

  if (reduced) {
    return (
      <div className={cn(gridClass, FEED_PROJECT_GRID_GAP, className)} data-feed-density={layoutKey}>
        {children}
      </div>
    );
  }

  return (
    <LayoutGroup id="feed-project-grid">
      <motion.div
        layout
        data-feed-density={layoutKey}
        className={cn(gridClass, FEED_PROJECT_GRID_GAP, className)}
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
