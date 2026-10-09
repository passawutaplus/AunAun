import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { smoothEase } from "@/lib/motion";
import { cn } from "@/lib/utils";

/** EN headline + TH subtitle nouns — same index, change together. */
export const HERO_ROTATING_PAIRS: readonly {
  en: string;
  th: string;
}[] = [
  { en: "Opportunity", th: "โอกาส" },
  { en: "Business", th: "ธุรกิจ" },
  { en: "Design&Art", th: "ออกแบบ & ศิลปะ" },
  { en: "Designer", th: "นักออกแบบ" },
  { en: "Connections", th: "คอนเนกชัน" },
  { en: "Collab", th: "คอลแลป" },
  { en: "Hires", th: "งานจ้าง" },
];

/** @deprecated use HERO_ROTATING_PAIRS */
export const HERO_ROTATING_WORDS = HERO_ROTATING_PAIRS.map((p) => p.en);

const INTERVAL_MS = 2800;
const COUNT_MS = 1500;

export function useHeroRotatingCycle(startDelayMs = COUNT_MS) {
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);
  const pair = HERO_ROTATING_PAIRS[index % HERO_ROTATING_PAIRS.length];
  const enSizer = useMemo(
    () => HERO_ROTATING_PAIRS.reduce((a, b) => (a.en.length >= b.en.length ? a : b)).en,
    [],
  );
  const thSizer = useMemo(
    () => HERO_ROTATING_PAIRS.reduce((a, b) => (a.th.length >= b.th.length ? a : b)).th,
    [],
  );

  useEffect(() => {
    if (reduced || HERO_ROTATING_PAIRS.length < 2) return;
    let intervalId = 0;
    const delayId = window.setTimeout(() => {
      intervalId = window.setInterval(() => {
        setIndex((i) => (i + 1) % HERO_ROTATING_PAIRS.length);
      }, INTERVAL_MS);
    }, startDelayMs);
    return () => {
      window.clearTimeout(delayId);
      if (intervalId) window.clearInterval(intervalId);
    };
  }, [reduced, startDelayMs]);

  return {
    en: pair.en,
    th: pair.th,
    enSizer,
    thSizer,
    reduced: !!reduced,
  };
}

type SlideProps = {
  word: string;
  sizer: string;
  reduced?: boolean;
  className?: string;
  /** EN sits flush after 100+; TH centers in the reserved slot. */
  align?: "start" | "center";
};

/** Rise through the line, same motion as the home poster word. */
export function HeroRotatingSlide({
  word,
  sizer,
  reduced,
  className,
  align = "start",
}: SlideProps) {
  const centered = align === "center";
  return (
    <span
      className={cn(
        "relative inline-grid overflow-hidden align-baseline leading-[0.92]",
        centered ? "justify-items-center text-center" : "justify-items-start text-left",
        className,
      )}
      aria-live="polite"
      aria-atomic="true"
    >
      <span className="invisible col-start-1 row-start-1 whitespace-nowrap" aria-hidden>
        {sizer}
      </span>
      <AnimatePresence initial={false}>
        <motion.span
          key={word}
          className={cn(
            "col-start-1 row-start-1 w-full whitespace-nowrap",
            centered ? "text-center" : "text-left",
          )}
          initial={reduced ? false : { y: "100%" }}
          animate={{ y: "0%" }}
          exit={reduced ? undefined : { y: "-100%" }}
          transition={{ duration: 0.55, ease: smoothEase }}
        >
          {word}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

type RotatingProps = {
  className?: string;
  lang?: "en" | "th";
  /** Shared cycle from `useHeroRotatingCycle` so EN + TH stay in sync. */
  cycle: ReturnType<typeof useHeroRotatingCycle>;
};

/** Rise through hero nouns — pass one shared `cycle` for EN + TH. */
export default function HeroRotatingWord({ className, lang = "en", cycle }: RotatingProps) {
  const word = lang === "th" ? cycle.th : cycle.en;
  const sizer = lang === "th" ? cycle.thSizer : cycle.enSizer;

  return (
    <HeroRotatingSlide
      word={word}
      sizer={sizer}
      reduced={cycle.reduced}
      className={className}
      align={lang === "th" ? "center" : "start"}
    />
  );
}

type CountProps = {
  className?: string;
  /** Count duration in ms. */
  durationMs?: number;
};

/** Run 1+ → 100+ once on mount (1.5s default). */
export function HeroHundredPlus({ className, durationMs = COUNT_MS }: CountProps) {
  const reduced = useReducedMotion();
  const [n, setN] = useState(reduced ? 100 : 1);

  useEffect(() => {
    if (reduced) {
      setN(100);
      return;
    }
    const from = 1;
    const to = 100;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - (1 - t) ** 3;
      setN(Math.round(from + (to - from) * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
      else setN(to);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reduced, durationMs]);

  return (
    <span className={cn("relative inline-grid tabular-nums", className)}>
      <span className="invisible col-start-1 row-start-1" aria-hidden>
        100+
      </span>
      <span className="col-start-1 row-start-1" aria-label="100+">
        {n}+
      </span>
    </span>
  );
}
