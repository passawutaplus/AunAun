import * as React from "react";

const STORAGE_KEY = "so1o:assistant-sidebar-width:v1";
export const SIDEBAR_DEFAULT_WIDTH = 400;
export const SIDEBAR_MIN_WIDTH = 300;
export const SIDEBAR_MAX_WIDTH = 720;
export const SIDEBAR_CLOSE_WIDTH = 200;

export function loadSidebarWidth(): number {
  if (typeof window === "undefined") return SIDEBAR_DEFAULT_WIDTH;
  try {
    const n = Number(localStorage.getItem(STORAGE_KEY));
    if (Number.isFinite(n) && n >= SIDEBAR_MIN_WIDTH && n <= SIDEBAR_MAX_WIDTH) return n;
  } catch {
    /* noop */
  }
  return SIDEBAR_DEFAULT_WIDTH;
}

export function useResizableSidebar(
  onClose: () => void,
  width: number,
  setWidth: (w: number) => void,
) {
  const drag = React.useRef<{ startX: number; startW: number } | null>(null);

  const onResizePointerDown = React.useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      drag.current = { startX: e.clientX, startW: width };
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    },
    [width],
  );

  const onResizePointerMove = React.useCallback(
    (e: React.PointerEvent) => {
      if (!drag.current) return;
      const delta = drag.current.startX - e.clientX;
      const next = Math.max(120, Math.min(SIDEBAR_MAX_WIDTH, drag.current.startW + delta));
      setWidth(next);
    },
    [setWidth],
  );

  const onResizePointerUp = React.useCallback(
    (e: React.PointerEvent) => {
      if (!drag.current) return;
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      const delta = drag.current.startX - e.clientX;
      const finalW = Math.max(120, Math.min(SIDEBAR_MAX_WIDTH, drag.current.startW + delta));
      drag.current = null;
      if (finalW < SIDEBAR_CLOSE_WIDTH) {
        onClose();
        setWidth(loadSidebarWidth());
        return;
      }
      const clamped = Math.max(SIDEBAR_MIN_WIDTH, Math.min(SIDEBAR_MAX_WIDTH, finalW));
      setWidth(clamped);
      try {
        localStorage.setItem(STORAGE_KEY, String(clamped));
      } catch {
        /* noop */
      }
    },
    [onClose, setWidth],
  );

  return {
    width,
    onResizePointerDown,
    onResizePointerMove,
    onResizePointerUp,
  };
}
