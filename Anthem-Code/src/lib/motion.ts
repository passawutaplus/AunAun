import type { Transition, Variants } from "framer-motion";

/** Smooth ease for portfolio reveals (no bounce). */
export const smoothEase = [0.22, 1, 0.36, 1] as const;

export const viewportOnce = { once: true, margin: "-32px" } as const;

/** Spring transition for progress bars (matches Solo onboarding). */
export const springProgress: Transition = {
  type: "spring",
  stiffness: 120,
  damping: 20,
};

/** Step wizard slide — pass direction (+1 / -1) via custom prop. */
export const slideStepVariants: Variants = {
  enter: (direction: number) => ({
    opacity: 0,
    x: direction * 40,
  }),
  center: {
    opacity: 1,
    x: 0,
  },
  exit: (direction: number) => ({
    opacity: 0,
    x: direction * -40,
  }),
};

export const slideStepTransition: Transition = {
  duration: 0.28,
  ease: "easeOut",
};

/** Floating panel / popover entrance (assistant, chat panels). */
export const panelVariants: Variants = {
  initial: { opacity: 0, y: 12, scale: 0.96 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: 8, scale: 0.96 },
};

export const panelTransition: Transition = {
  duration: 0.22,
  ease: "easeOut",
};

/** Carousel / content swap slide. */
export const carouselSlideVariants: Variants = {
  initial: { opacity: 0, x: 16 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -16 },
};

export const carouselSlideTransition: Transition = {
  duration: 0.4,
  ease: "easeOut",
};

/** Image load / crossfade — opacity + scale only (GPU-friendly). */
export const imageRevealTransition: Transition = {
  duration: 0.45,
  ease: smoothEase,
};

export const imageCrossfadeVariants: Variants = {
  initial: { opacity: 0, scale: 1.04 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 1.02 },
};

/** Lightbox backdrop + image zoom. */
export const lightboxBackdropVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

export const lightboxImageVariants: Variants = {
  initial: { opacity: 0, scale: 0.94 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.96 },
};

export const lightboxTransition: Transition = {
  duration: 0.28,
  ease: smoothEase,
};

/** Hero / section fade-up on first paint. */
export const fadeUpVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0 },
};

export const fadeUpTransition = (delay = 0): Transition => ({
  duration: 0.5,
  delay,
  ease: smoothEase,
});

/** Route enter — short fade/slide; skip exit to keep navigations snappy on mobile. */
export const pageEnterVariants: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
};

export const pageEnterTransition: Transition = {
  duration: 0.22,
  ease: smoothEase,
};

/** Stagger delay capped so large grids stay snappy. */
export function staggerDelay(index: number, opts?: { dense?: boolean }) {
  const max = opts?.dense ? 8 : 12;
  const step = opts?.dense ? 0.035 : 0.045;
  return Math.min(index, max) * step;
}

export function staggerReveal(index: number, opts?: { dense?: boolean }): Transition {
  return {
    duration: opts?.dense ? 0.35 : 0.42,
    delay: staggerDelay(index, opts),
    ease: smoothEase,
  };
}
