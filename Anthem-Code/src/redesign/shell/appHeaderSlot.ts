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
 * Store app header rules (owner 2026-11-28), called once by RedesignShell:
 * - marks <html data-native-app> so app-shell.css shows the logo mark only, under the safe area;
 * - on the top-level pages (`autoHide`: home, My Profile / My Studio, chat) the header slides up while
 *   scrolling down and comes back on any scroll up, as in the old app.
 * `routeKey` (the path) finds the header again after a page change.
 */
export function useAppHeaderChrome(autoHide: boolean, routeKey: string): void {
  useEffect(() => {
    if (!isNativeApp()) return;
    document.documentElement.setAttribute("data-native-app", "");
  }, []);

  useEffect(() => {
    if (!autoHide || !isNativeApp()) return;
    const header = document.querySelector<HTMLElement>(".sc-app .sc-hd");
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
  }, [autoHide, routeKey]);
}
