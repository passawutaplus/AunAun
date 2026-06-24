import * as React from "react";

function formatRemaining(ms: number): string {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) {
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function useDrillCountdown(startedAt: number | null, totalMinutes: number) {
  const totalMs = totalMinutes * 60 * 1000;
  const [now, setNow] = React.useState(() => Date.now());

  React.useEffect(() => {
    if (startedAt == null) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [startedAt, totalMinutes]);

  if (startedAt == null) {
    return {
      remainingMs: totalMs,
      elapsedMs: 0,
      isExpired: false,
      formatted: formatRemaining(totalMs),
      progress: 0,
    };
  }

  const elapsedMs = Math.max(0, now - startedAt);
  const remainingMs = Math.max(0, totalMs - elapsedMs);
  const isExpired = remainingMs <= 0;
  const progress = Math.min(1, elapsedMs / totalMs);

  return {
    remainingMs,
    elapsedMs,
    isExpired,
    formatted: isExpired ? "00:00" : formatRemaining(remainingMs),
    progress,
  };
}
