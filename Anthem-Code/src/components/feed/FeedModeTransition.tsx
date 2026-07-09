import type { ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { carouselSlideTransition, carouselSlideVariants } from "@/lib/motion";
import { cn } from "@/lib/utils";

type Props = {
  modeKey: string;
  children: ReactNode;
  className?: string;
};

/** Cross-fade + slide when switching feed tabs (Area, Studios, Projects, …). */
export function FeedModeTransition({ modeKey, children, className }: Props) {
  const reduced = useReducedMotion();

  if (reduced) {
    return <div className={cn("min-w-0", className)}>{children}</div>;
  }

  return (
    <div className={cn("min-w-0", className)}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={modeKey}
          initial="initial"
          animate="animate"
          exit="exit"
          variants={carouselSlideVariants}
          transition={carouselSlideTransition}
          className="min-w-0"
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
