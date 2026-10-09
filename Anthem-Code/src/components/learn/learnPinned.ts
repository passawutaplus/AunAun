import { useEffect, useState, type CSSProperties, type RefObject } from "react";
import { useMotionValue, useMotionValueEvent, type MotionValue } from "framer-motion";

export const LEARN_SERIF: CSSProperties = {
  fontFamily: '"Newsreader", "Iowan Old Style", Palatino, Georgia, serif',
  fontStyle: "italic",
  fontWeight: 400,
  fontSynthesis: "none",
  fontOpticalSizing: "auto",
};

export const LEARN_FALLBACK_WORKS = [
  "/learn/learn-way-show.jpg",
  "/learn/learn-way-discover.jpg",
  "/learn/learn-way-talk.jpg",
  "/learn/learn-way-opportunity.jpg",
  "/learn/learn-about-portrait.jpg",
  "/learn/learn-platform.jpg",
];

/** The one piece of work the conversation, package and objects stories all grow from. */
export const LEARN_SOURCE_ART = {
  image: "/learn/learn-conversation-art.jpg",
  title: "Night Market Koi",
  by: "Ploy Sirinya · Illustration",
} as const;

/** 0 → 1 while a tall track scrolls past a sticky 100dvh stage. */
export function usePinnedProgress(trackRef: RefObject<HTMLElement>, disabled: boolean): MotionValue<number> {
  const progress = useMotionValue(0);
  useEffect(() => {
    const el = trackRef.current;
    if (!el || disabled) return;
    const update = () => {
      const scrollable = el.offsetHeight - window.innerHeight;
      const passed = -el.getBoundingClientRect().top;
      progress.set(scrollable <= 0 ? 0 : Math.min(1, Math.max(0, passed / scrollable)));
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [disabled, progress, trackRef]);
  return progress;
}

/** Re-renders only when `derive(progress)` changes. */
export function useProgressDerived<T>(progress: MotionValue<number>, derive: (v: number) => T): T {
  const [value, setValue] = useState(() => derive(progress.get()));
  useMotionValueEvent(progress, "change", (v) => {
    const next = derive(v);
    setValue((current) => (Object.is(current, next) ? current : next));
  });
  return value;
}

export function useProgressReached(progress: MotionValue<number>, at: number): boolean {
  return useProgressDerived(progress, (v) => v >= at);
}

export function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}

/** True below the md breakpoint. */
export function useIsCompact(): boolean {
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(max-width: 767px)");
    const update = () => setCompact(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return compact;
}

type SegmenterCtor = new (
  locale: string,
  options: { granularity: "grapheme" },
) => { segment: (input: string) => Iterable<{ segment: string }> };

/** Split text into user-visible characters so Thai marks never render detached mid-typing. */
export function graphemes(text: string): string[] {
  const Segmenter = (Intl as unknown as { Segmenter?: SegmenterCtor }).Segmenter;
  if (Segmenter) {
    return Array.from(new Segmenter("th", { granularity: "grapheme" }).segment(text), (item) => item.segment);
  }
  return Array.from(text);
}

/** How many glyphs are typed at progress `v` between `from` and `to`. */
export function typedAt(v: number, from: number, to: number, total: number): number {
  if (v <= from) return 0;
  if (v >= to) return total;
  return Math.min(total, Math.max(1, Math.ceil(((v - from) / (to - from)) * total)));
}
