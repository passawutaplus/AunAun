import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  motion,
  useInView,
  useReducedMotion,
  useScroll,
  type MotionValue,
} from "framer-motion";
import { fadeUpTransition, fadeUpVariants } from "@/lib/motion";
import { cn } from "@/lib/utils";

export function useIsMd() {
  const [md, setMd] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const sync = () => setMd(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return md;
}

/** Enter when the block hits the viewport — not on page mount. */
export function EnterView({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const reduced = useReducedMotion();
  if (reduced) return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={cn(className)}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.35, margin: "-8% 0px -8% 0px" }}
      variants={fadeUpVariants}
      transition={fadeUpTransition(delay)}
    >
      {children}
    </motion.div>
  );
}

export function HoverLift({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className={className}
      whileHover={reduced ? undefined : { y: -4 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Desktop: sticky cinema, scroll drives progress 0→1.
 * Mobile: no pin — parent should autoplay stages while in view.
 */
export function PinFilm({
  children,
  className,
}: {
  children: (progress: MotionValue<number>, reduced: boolean) => ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });

  return (
    <div ref={ref} className={cn(!reduced && "md:h-[155vh]", className)}>
      <div
        className={cn(
          "w-full",
          !reduced && "md:sticky md:top-24 md:flex md:h-[calc(100dvh-7rem)] md:items-center",
        )}
      >
        {children(scrollYProgress, !!reduced)}
      </div>
    </div>
  );
}

export function useCinemaStage(
  progress: MotionValue<number>,
  count: number,
  reduced: boolean,
) {
  const md = useIsMd();
  const hostRef = useRef<HTMLDivElement>(null);
  const inView = useInView(hostRef, { amount: 0.45 });
  const [stage, setStage] = useState(0);

  useEffect(() => {
    if (reduced) {
      setStage(count - 1);
      return;
    }
    if (md) return;
    if (!inView) return;
    const id = window.setInterval(() => {
      setStage((s) => (s + 1) % count);
    }, 1700);
    return () => window.clearInterval(id);
  }, [count, inView, md, reduced]);

  useEffect(() => {
    if (!md || reduced) return;
    const unsub = progress.on("change", (v) => {
      setStage(Math.min(count - 1, Math.floor(v * 0.999 * count)));
    });
    return unsub;
  }, [count, md, progress, reduced]);

  return { stage, hostRef, md };
}
