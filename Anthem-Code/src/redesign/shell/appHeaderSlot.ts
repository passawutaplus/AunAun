import { useEffect, useState } from "react";
import { isNativeApp } from "@/lib/appShell";

/** Id of the empty spot at the right end of the header (RedesignShell) that the store app's home fills. */
export const APP_HEADER_SLOT_ID = "sc-hd-slot";

/**
 * Inside the store apps the home page moves its search and Showcase / Creators / Event switch up into the
 * header, as in the old app (owner 2026-11-28). Returns the header spot to portal them into; null on the
 * website and on pages without a header. A browser can try it with `/?source=android` (see lib/appShell.ts).
 */
export function useAppHeaderSlot(): HTMLElement | null {
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  useEffect(() => {
    if (isNativeApp()) setSlot(document.getElementById(APP_HEADER_SLOT_ID));
  }, []);
  return slot;
}

/** Scroll distance that counts as a direction change (ignores finger jitter). */
const SCROLL_STEP = 6;

/**
 * Old app behaviour (owner 2026-11-28): the header slides up while scrolling down and comes back on
 * any scroll up. Only runs while `slot` is set, i.e. the store app's home.
 */
export function useAppHeaderAutoHide(slot: HTMLElement | null): void {
  useEffect(() => {
    const header = slot?.closest<HTMLElement>(".sc-hd");
    if (!header) return;
    let lastY = Math.max(0, window.scrollY);
    let frame = 0;
    const update = () => {
      frame = 0;
      const y = Math.max(0, window.scrollY);
      if (Math.abs(y - lastY) < SCROLL_STEP) return;
      header.toggleAttribute("data-hide", y > lastY && y > header.offsetHeight);
      lastY = y;
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.cancelAnimationFrame(frame);
      header.removeAttribute("data-hide");
    };
  }, [slot]);
}
