import { motion, useReducedMotion } from "framer-motion";
import { fadeUpTransition, fadeUpVariants } from "@/lib/motion";
import { cn } from "@/lib/utils";

type Props = {
  children: React.ReactNode;
  className?: string;
  delay?: number;
};

export function FadeUp({ children, className, delay = 0 }: Props) {
  const reduced = useReducedMotion();
  if (reduced) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={cn(className)}
      initial="hidden"
      animate="show"
      variants={fadeUpVariants}
      transition={fadeUpTransition(delay)}
    >
      {children}
    </motion.div>
  );
}
