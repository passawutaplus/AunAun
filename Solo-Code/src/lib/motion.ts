import type { Transition, Variants } from "framer-motion";

/** Smooth ease for section reveals (no bounce). */
export const smoothEase = [0.22, 1, 0.36, 1] as const;

export const viewportOnce = { once: true, margin: "-80px" } as const;

export const fadeUpVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0 },
};

export const fadeUpTransition = (delay = 0): Transition => ({
  duration: 0.45,
  delay,
  ease: smoothEase,
});

/** Hero mockup crossfade */
export const carouselSlideVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

export const carouselSlideTransition: Transition = {
  duration: 0.5,
  ease: smoothEase,
};

/** Stagger delay capped so grids stay snappy. */
export function staggerDelay(index: number) {
  return Math.min(index, 3) * 0.06;
}
