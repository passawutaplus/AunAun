import { useCallback, useEffect, useRef, useState } from "react";

const calm = () =>
  typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/**
 * Open / close state for popups that fade out before they unmount
 * (design rule A6: closing is a soft fade, never an instant cut). With reduced motion it closes at once.
 */
export function usePresence(exitMs: number) {
  const [phase, setPhase] = useState<"closed" | "open" | "leaving">("closed");
  const timer = useRef<number | undefined>(undefined);

  const clear = () => {
    if (timer.current !== undefined) window.clearTimeout(timer.current);
    timer.current = undefined;
  };

  const open = useCallback(() => {
    clear();
    setPhase("open");
  }, []);

  const close = useCallback(() => {
    clear();
    if (calm() || exitMs <= 0) {
      setPhase("closed");
      return;
    }
    setPhase((p) => (p === "open" ? "leaving" : p));
    timer.current = window.setTimeout(() => setPhase("closed"), exitMs);
  }, [exitMs]);

  useEffect(() => clear, []);

  return { isOpen: phase === "open", mounted: phase !== "closed", leaving: phase === "leaving", open, close };
}
