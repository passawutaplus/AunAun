import { Children, isValidElement, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { staggerReveal, viewportOnce } from "@/lib/motion";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  children: ReactNode;
  /** Tighter stagger for dense masonry / feed grids */
  dense?: boolean;
};

/** Scroll-reveal grid wrapper — caps stagger so long lists stay smooth. */
export function StaggerGrid({ className, children, dense }: Props) {
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
