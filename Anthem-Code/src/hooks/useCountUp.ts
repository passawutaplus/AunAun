import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";

/** Animate a number from its previous value to `target` (running digits). */
export function useCountUp(target: number, durationMs = 720): number {
  const reduceMotion = useReducedMotion();
  const fromRef = useRef(0);
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (reduceMotion) {
      fromRef.current = target;
      setDisplay(target);
      return;
    }
    const from = fromRef.current;
    const start = performance.now();
    let frame = 0;
    let latest = from;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - (1 - t) ** 3;
      latest = Math.round(from + (target - from) * eased);
      setDisplay(latest);
      if (t < 1) {
        frame = requestAnimationFrame(tick);
      } else {
        fromRef.current = target;
      }
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      fromRef.current = latest;
    };
  }, [target, durationMs, reduceMotion]);

  return display;
}
