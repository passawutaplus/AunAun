import { useEffect, useState } from "react";

/**
 * Returns `percent` when known, otherwise ramps a simulated value so
 * progress UI never looks frozen while waiting on an indeterminate stage
 * (e.g. network upload with no progress events). Switches to the real value
 * the instant one is reported.
 */
export function useAutoPercent(percent?: number | null): number {
  const [simPercent, setSimPercent] = useState(8);
  useEffect(() => {
    if (percent != null) return;
    setSimPercent(8);
    const id = window.setInterval(() => {
      setSimPercent((p) => {
        if (p >= 92) return p;
        const step = p < 40 ? 6 : p < 70 ? 3 : 1;
        return Math.min(92, p + step);
      });
    }, 280);
    return () => window.clearInterval(id);
  }, [percent]);
  return percent ?? simPercent;
}
