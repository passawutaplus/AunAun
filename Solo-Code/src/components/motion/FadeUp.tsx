import * as React from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { fadeUpTransition, fadeUpVariants, viewportOnce } from "@/lib/motion";

type Props = {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  /** When false, animates on mount (hero). Default: scroll into view. */
  onScroll?: boolean;
};

export function FadeUp({ children, className, delay = 0, onScroll = true }: Props) {
  const reduced = useReducedMotion();
  const ref = React.useRef<HTMLDivElement>(null);
  const inView = useInView(ref, viewportOnce);

  if (reduced) {
    return (
      <div ref={ref} className={className}>
        {children}
      </div>
    );
  }

  const shouldShow = onScroll ? inView : true;

  return (
    <motion.div
      ref={ref}
      className={cn(className)}
      initial="hidden"
      animate={shouldShow ? "show" : "hidden"}
      variants={fadeUpVariants}
      transition={fadeUpTransition(delay)}
    >
      {children}
    </motion.div>
  );
}
