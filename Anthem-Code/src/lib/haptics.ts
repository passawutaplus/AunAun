/**
 * Light haptic ticks for touch actions (like, save, long-press).
 * Android Chrome and the Android app support the Vibration API; iOS Safari and desktop
 * ignore it, so these are safe no-ops there. Skipped when the user asks for reduced motion.
 */
function vibrate(ms: number): void {
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
  try {
    navigator.vibrate(ms);
  } catch {
    /* blocked until the first user gesture — ignore */
  }
}

/** A single light tick — like, save, follow. */
export const hapticTap = () => vibrate(10);

/** Slightly firmer — long-press that opens something. */
export const hapticPress = () => vibrate(14);
