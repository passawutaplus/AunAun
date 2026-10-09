import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * Text sharpens in the middle of the viewport and blurs as it scrolls away,
 * the same focus pass as the Bungee landing.
 */
export function ScrollFocus({
  children,
  className,
  strong = false,
}: {
  children: ReactNode;
  className?: string;
  strong?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 100%", "end 0%"],
  });
  const blur = strong ? 16 : 9;
  const shift = strong ? 28 : 14;
  const filter = useTransform(
    scrollYProgress,
    [0, 0.2, 0.8, 1],
    [`blur(${blur}px)`, "blur(0px)", "blur(0px)", `blur(${blur}px)`],
  );
  const y = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [shift, 0, 0, -shift]);

  if (reduced) return <div className={className}>{children}</div>;

  return (
    <motion.div ref={ref} style={{ filter, y }} className={className}>
      {children}
    </motion.div>
  );
}

/** Vertical scroll slides the card row sideways once it no longer fits. */
export function ScrollWays({
  heading,
  children,
  className,
}: {
  heading: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const [overflow, setOverflow] = useState(0);
  const [wide, setWide] = useState(false);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });
  const x = useTransform(scrollYProgress, [0.08, 0.92], [0, -overflow]);

  useEffect(() => {
    const query = window.matchMedia("(min-width: 768px)");
    const track = trackRef.current;
    const measure = () => {
      setWide(query.matches);
      if (!track) return;
      setOverflow(Math.max(0, track.scrollWidth - track.clientWidth));
    };
    measure();
    const observer = track ? new ResizeObserver(measure) : null;
    if (track) observer.observe(track);
    query.addEventListener("change", measure);
    return () => {
      observer?.disconnect();
      query.removeEventListener("change", measure);
    };
  }, []);

  const pin = wide && !reduced && overflow > 24;

  return (
    <div ref={ref} className={cn(pin && "h-[165vh]", className)}>
      <div className={cn(pin && "sticky top-28 md:top-32")}>
        {heading}
        <div ref={trackRef} className={cn("mt-8", pin ? "overflow-hidden" : "overflow-x-auto scrollbar-none")}>
          <motion.div style={pin ? { x } : undefined} className="flex w-max gap-4 pb-2">
            {children}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
