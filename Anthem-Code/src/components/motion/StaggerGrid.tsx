import { Children, isValidElement, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { staggerReveal, viewportOnce } from "@/lib/motion";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  children: ReactNode;
  /** Tighter stagger for dense masonry / feed grids */
  dense?: boolean;
  /** Wrap each child for CSS column masonry (break-inside-avoid). */
  masonry?: boolean;
};

/** Scroll-reveal grid wrapper — caps stagger so long lists stay smooth. */
export function StaggerGrid({ className, children, dense, masonry }: Props) {
  const reduced = useReducedMotion();
  const items = Children.toArray(children);

  if (reduced) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div className={cn(className)}>
      {items.map((child, i) => {
        if (!isValidElement(child)) return child;
        return (
          <motion.div
            key={child.key ?? `stagger-${i}`}
            className={masonry ? "break-inside-avoid mb-2 sm:mb-3" : undefined}
            initial={{ opacity: 0, y: dense ? 10 : 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={viewportOnce}
            transition={staggerReveal(i, { dense })}
          >
            {child}
          </motion.div>
        );
      })}
    </div>
  );
}
