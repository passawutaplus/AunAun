import { useCallback, useRef } from "react";

const DOUBLE_TAP_MS = 400;

export type TapPoint = { x: number; y: number };

/** Set true briefly after a double-tap so parent click handlers can skip navigation. */
export const doubleTapSuppressClickRef = { current: false };

function markDoubleTapHandled() {
  doubleTapSuppressClickRef.current = true;
  window.setTimeout(() => {
    doubleTapSuppressClickRef.current = false;
  }, 450);
}

export function useDoubleTapLike(onDoubleTap: (point: TapPoint) => void) {
  const lastTapRef = useRef(0);
  const touchRecentRef = useRef(false);

  const fire = useCallback(
    (point: TapPoint, e?: { preventDefault?: () => void; stopPropagation?: () => void }) => {
      e?.preventDefault?.();
      e?.stopPropagation?.();
      markDoubleTapHandled();
      onDoubleTap(point);
    },
    [onDoubleTap],
  );

  const tryDoubleTap = useCallback(
    (point: TapPoint, e?: { preventDefault?: () => void; stopPropagation?: () => void }) => {
      const now = Date.now();
      if (now - lastTapRef.current < DOUBLE_TAP_MS) {
        fire(point, e);
        lastTapRef.current = 0;
        return true;
      }
      lastTapRef.current = now;
      return false;
    },
    [fire],
  );

  const onTouchEndCapture = useCallback(
    (e: React.TouchEvent) => {
      const touch = e.changedTouches[0];
      if (!touch) return;
      touchRecentRef.current = true;
      window.setTimeout(() => {
        touchRecentRef.current = false;
      }, 500);
      tryDoubleTap({ x: touch.clientX, y: touch.clientY }, e);
    },
    [tryDoubleTap],
  );

  const onClickCapture = useCallback(
    (e: React.MouseEvent) => {
      if (touchRecentRef.current) return;
      tryDoubleTap({ x: e.clientX, y: e.clientY }, e);
    },
    [tryDoubleTap],
  );

  const onDoubleClickCapture = useCallback(
    (e: React.MouseEvent) => {
      fire({ x: e.clientX, y: e.clientY }, e);
    },
    [fire],
  );

  return { onTouchEndCapture, onClickCapture, onDoubleClickCapture };
}

/** Delayed single-tap navigation — skip if a double-tap just fired. */
export function useDelayedTapNavigate(onNavigate: () => void, delayMs = DOUBLE_TAP_MS + 40) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onClick = useCallback(
    (e: React.MouseEvent) => {
      if (doubleTapSuppressClickRef.current) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        if (doubleTapSuppressClickRef.current) return;
        onNavigate();
      }, delayMs);
    },
    [delayMs, onNavigate],
  );

  return onClick;
}
