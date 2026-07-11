import type { ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  carouselSlideTransition,
  carouselSlideVariants,
  slideStepTransition,
  slideStepVariants,
} from "@/lib/motion";
import { cn } from "@/lib/utils";

type Props = {
  modeKey: string;
  children: ReactNode;
  className?: string;
  /**
   * When set, slide directionally (+1 forward / -1 back).
   * Omit for the default cross-fade + slight horizontal slide.
   */
  direction?: number;
};

/** Cross-fade + slide when switching feed tabs / workspace panes. */
export function FeedModeTransition({ modeKey, children, className, direction }: Props) {
  const reduced = useReducedMotion();
  const directional = typeof direction === "number";

  if (reduced) {
    return <div className={cn("min-w-0", className)}>{children}</div>;
  }

  return (
    <div className={cn("min-w-0", className)}>
      <AnimatePresence mode="wait" custom={direction} initial={false}>
        <motion.div
          key={modeKey}
          custom={direction}
          initial={directional ? "enter" : "initial"}
          animate={directional ? "center" : "animate"}
          exit={directional ? "exit" : "exit"}
          variants={directional ? slideStepVariants : carouselSlideVariants}
          transition={directional ? slideStepTransition : carouselSlideTransition}
          className="min-w-0"
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
