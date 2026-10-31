import { useEffect, useState, type RefObject } from "react";

/** Pixels of travel in one direction before the bar flips state — ignores jitter from momentum scroll. */
const FLIP_DISTANCE = 12;
/** Always show the bar this close to the top of the page. */
const TOP_ZONE = 80;
/** Below the Tailwind `lg` breakpoint (1024px) the layout is the phone/tablet one. */
const MOBILE_QUERY = "(max-width: 1023.98px)";

/**
 * X-style top bar for phones and tablets: `hidden` turns true while the user scrolls down (bar
 * slides away) and false as soon as they scroll back up or reach the top. `scrolled` is true once
 * the page has left the very top, so the bar can take a solid background while stuck.
 * The bar only hides/solidifies while it is actually stuck to the top of the screen: before that it
 * is still in the page flow and sliding it away would leave a blank gap where it was.
 * Does nothing (both false) on desktop widths.
 */
export function useHideOnScroll(barRef: RefObject<HTMLElement | null>): { hidden: boolean; scrolled: boolean } {
  const [state, setState] = useState({ hidden: false, scrolled: false });

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_QUERY);
    let anchor = window.scrollY;
    let frame = 0;

    const set = (hidden: boolean, scrolled: boolean) =>
      setState((s) => (s.hidden === hidden && s.scrolled === scrolled ? s : { hidden, scrolled }));

    const update = () => {
      frame = 0;
      if (!mq.matches) return set(false, false);
      const y = window.scrollY;
      // Stuck = the sticky bar has reached the top edge (also true while it is slid away above it).
      const bar = barRef.current;
      const stuck = !!bar && bar.getBoundingClientRect().top <= 1;
      if (!stuck) {
        anchor = y;
        return set(false, false);
      }
      const scrolled = true;
      if (y < TOP_ZONE) {
        anchor = y;
        return set(false, scrolled);
      }
      const delta = y - anchor;
      if (delta > FLIP_DISTANCE) {
        anchor = y;
        set(true, scrolled);
      } else if (delta < -FLIP_DISTANCE) {
        anchor = y;
        set(false, scrolled);
      } else {
        setState((s) => (s.scrolled === scrolled ? s : { ...s, scrolled }));
      }
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    mq.addEventListener("change", update);
    return () => {
      window.removeEventListener("scroll", onScroll);
      mq.removeEventListener("change", update);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [barRef]);

  return state;
}
