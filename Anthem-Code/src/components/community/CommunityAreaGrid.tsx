import { Children, isValidElement, useEffect, useRef, useState, type ReactNode } from "react";
import { LayoutGroup, motion, useReducedMotion } from "framer-motion";
import { useFeedAreaLayout } from "@/hooks/useFeedAreaLayout";
import { smoothEase } from "@/lib/motion";
import { cn } from "@/lib/utils";

const layoutTransition = {
  layout: { duration: 0.42, ease: smoothEase },
};

type Props = {
  className?: string;
  children: ReactNode;
};

/** Community Area feed with smooth layout animation when switching feed/grid. */
export function CommunityAreaGrid({ className, children }: Props) {
  const { layout, mobileColumns, narrow, containerClass, itemClass, gapClass } = useFeedAreaLayout();
  const reduced = useReducedMotion();
  const items = Children.toArray(children);
  const layoutKey = narrow ? mobileColumns : layout;
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
      <div
        className={cn(containerClass, gapClass, className)}
        data-feed-area-layout={layoutKey}
      >
        {items.map((child, i) => {
          if (!isValidElement(child)) return child;
          return (
            <div key={child.key ?? `area-item-${i}`} className={itemClass}>
              {child}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <LayoutGroup id="feed-area-grid">
      <motion.div
        layout
        data-feed-area-layout={layoutKey}
        className={cn(containerClass, gapClass, className)}
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
              key={child.key ?? `area-item-${i}`}
              layout
              className={itemClass}
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
