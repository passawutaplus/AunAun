import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { isAndroidApp } from "@/lib/appShell";
import { BrandLoader } from "@/components/ui/BrandLoader";

/** Pull distance (after resistance) that triggers a refresh, and the most the indicator travels. */
const TRIGGER_PX = 64;
const MAX_PULL_PX = 110;
/** Finger travel is damped so the indicator follows at about half speed, like native lists. */
const RESISTANCE = 0.5;
/** Keep the loader on screen at least this long so a fast refresh still reads as a refresh. */
const MIN_SHOW_MS = 700;
/** Refreshing never hangs the screen longer than this, whatever the network does. */
const MAX_SHOW_MS = 8000;

const OVERLAY_SELECTOR = '[role="dialog"],[role="alertdialog"],[aria-modal="true"],[data-feedback-ui],[data-vaul-drawer]';
/** Pulling on these must keep its normal meaning (typing, text selection, sliders, map-like canvases). */
const IGNORE_SELECTOR = 'input,textarea,select,[contenteditable="true"],[data-no-ptr]';

/** True if something between `el` and the page can still scroll up (or sideways), so the pull is not ours. */
function innerScrollWins(el: Element | null): boolean {
  for (let node: Element | null = el; node && node !== document.body && node !== document.documentElement; node = node.parentElement) {
    const cs = getComputedStyle(node);
    const scrollsY = /(auto|scroll)/.test(cs.overflowY) && node.scrollHeight > node.clientHeight + 1;
    if (scrollsY && node.scrollTop > 0) return true;
    const scrollsX = /(auto|scroll)/.test(cs.overflowX) && node.scrollWidth > node.clientWidth + 1;
    if (scrollsX) return true;
  }
  return false;
}

function overlayOpen(): boolean {
  return Array.from(document.querySelectorAll<HTMLElement>(OVERLAY_SELECTOR)).some((e) => {
    const r = e.getBoundingClientRect();
    const cs = getComputedStyle(e);
    return r.width > 0 && r.height > 0 && cs.visibility !== "hidden" && cs.display !== "none";
  });
}

/**
 * Android app only: pull down at the very top of a page to refresh it, with the SAMECOR loader as the
 * indicator. "Refresh" = refetch every active query (no full reload, no flash); if the page has no
 * query data at all it falls back to a reload so the gesture never does nothing.
 * Sits on window touch events, so it works on every page without wiring.
 */
export default function PullToRefresh() {
  const enabled = isAndroidApp();
  const queryClient = useQueryClient();
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const state = useRef({ startX: 0, startY: 0, active: false, pull: 0, refreshing: false });

  useEffect(() => {
    if (!enabled) return;
    // The WebView's own overscroll glow / bounce would fight the gesture.
    const root = document.documentElement;
    const prevOverscroll = root.style.overscrollBehaviorY;
    root.style.overscrollBehaviorY = "contain";

    const s = state.current;

    const reset = () => {
      s.active = false;
      s.pull = 0;
      setPull(0);
    };

    const onStart = (e: TouchEvent) => {
      if (s.refreshing || e.touches.length !== 1) return;
      const target = e.target instanceof Element ? e.target : null;
      if (window.scrollY > 0 || overlayOpen() || target?.closest(IGNORE_SELECTOR) || innerScrollWins(target)) {
        s.active = false;
        return;
      }
      s.active = true;
      s.startX = e.touches[0].clientX;
      s.startY = e.touches[0].clientY;
      s.pull = 0;
    };

    const onMove = (e: TouchEvent) => {
      if (!s.active || s.refreshing) return;
      const dy = e.touches[0].clientY - s.startY;
      const dx = e.touches[0].clientX - s.startX;
      // Not a downward vertical pull (sideways swipe, or scrolling the page up): let the page handle it.
      if (window.scrollY > 0 || dy <= 0 || Math.abs(dx) > dy * 0.8) {
        if (dy <= 0 || window.scrollY > 0) reset();
        return;
      }
      if (e.cancelable) e.preventDefault();
      s.pull = Math.min(MAX_PULL_PX, dy * RESISTANCE);
      setPull(s.pull);
    };

    const onEnd = async () => {
      if (!s.active) return;
      const reached = s.pull >= TRIGGER_PX;
      s.active = false;
      if (!reached) {
        reset();
        return;
      }
      s.refreshing = true;
      setRefreshing(true);
      setPull(TRIGGER_PX);
      const startedAt = Date.now();
      try {
        const activeQueries = queryClient.getQueryCache().findAll({ type: "active" }).length;
        if (activeQueries === 0) {
          window.location.reload();
          return;
        }
        await Promise.race([
          queryClient.refetchQueries({ type: "active" }),
          new Promise((resolve) => window.setTimeout(resolve, MAX_SHOW_MS)),
        ]);
      } catch {
        /* a failed refetch shows through the page's own error state */
      }
      const wait = Math.max(0, MIN_SHOW_MS - (Date.now() - startedAt));
      window.setTimeout(() => {
        s.refreshing = false;
        setRefreshing(false);
        reset();
      }, wait);
    };

    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onEnd, { passive: true });
    window.addEventListener("touchcancel", reset, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
      window.removeEventListener("touchcancel", reset);
      root.style.overscrollBehaviorY = prevOverscroll;
    };
  }, [enabled, queryClient]);

  if (!enabled || (pull === 0 && !refreshing)) return null;

  const progress = Math.min(1, pull / TRIGGER_PX);
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-0 z-[120] flex justify-center"
      style={{
        transform: `translateY(${Math.max(0, pull - 44)}px)`,
        opacity: refreshing ? 1 : 0.35 + progress * 0.65,
        transition: refreshing || pull === 0 ? "transform 0.2s ease-out, opacity 0.2s" : "none",
      }}
    >
      <span className="mt-2 flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card shadow-sm">
        <BrandLoader size={28} aria-label="กำลังรีเฟรช" />
      </span>
    </div>
  );
}
