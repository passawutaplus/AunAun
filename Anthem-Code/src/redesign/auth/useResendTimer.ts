import { useEffect, useState } from "react";

/** "ส่งอีกครั้ง" with a 60-second wait (owner rule: limit resends). */
export function useResendTimer(seconds = 60) {
  const [left, setLeft] = useState(0);
  useEffect(() => {
    if (left <= 0) return;
    const t = window.setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => window.clearTimeout(t);
  }, [left]);
  return { left, start: () => setLeft(seconds) };
}
