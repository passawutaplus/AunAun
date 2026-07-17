import { useEffect, useState } from "react";

/**
 * After `ms` of continuous loading, flip true so UI can show a slow-load fallback
 * (retry / tip) instead of an infinite spinner.
 */
export function useSlowLoadFallback(isLoading: boolean, ms = 10_000): boolean {
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      setSlow(false);
      return;
    }
    setSlow(false);
    const t = window.setTimeout(() => setSlow(true), ms);
    return () => window.clearTimeout(t);
  }, [isLoading, ms]);

  return slow;
}
