import { useEffect, useState } from "react";

/** Pixels of travel in one direction before the bar flips state — ignores jitter from momentum scroll. */
const FLIP_DISTANCE = 12;
/** Always show the bar this close to the top of the page. */
const TOP_ZONE = 80;

/**
 * X-style top bar: true while the user scrolls down (bar slides away), false as soon
 * as they scroll back up or reach the top. Inactive (always false) when `enabled` is off.
 */
export function useHideOnScroll(enabled: boolean): boolean {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setHidden(false);
      return;
    }
    let anchor = window.scrollY;
    let frame = 0;

    const update = () => {
      frame = 0;
      const y = window.scrollY;
      if (y < TOP_ZONE) {
        setHidden(false);
        anchor = y;
        return;
      }
      const delta = y - anchor;
      if (delta > FLIP_DISTANCE) {
        setHidden(true);
        anchor = y;
      } else if (delta < -FLIP_DISTANCE) {
        setHidden(false);
        anchor = y;
      }
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [enabled]);

  return hidden;
}
