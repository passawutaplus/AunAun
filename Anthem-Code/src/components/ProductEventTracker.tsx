import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { featureFromRoute } from "@/lib/featureRoute";
import { trackProductEvent } from "@/lib/productEvents";

const MIN_DWELL_MS = 3_000;
const MAX_DWELL_MS = 30 * 60 * 1000;

type VisitState = {
  path: string;
  feature: string;
  visibleAccumMs: number;
  visibleSince: number | null;
};

function visibleMs(visit: VisitState): number {
  let ms = visit.visibleAccumMs;
  if (visit.visibleSince != null && document.visibilityState === "visible") {
    ms += Date.now() - visit.visibleSince;
  }
  return Math.min(Math.max(0, ms), MAX_DWELL_MS);
}

function flushDwell(visit: VisitState | null) {
  if (!visit) return;
  const ms = visibleMs(visit);
  if (ms < MIN_DWELL_MS) return;
  void trackProductEvent(
    "page_dwell",
    {
      duration_ms: Math.round(ms),
      feature: visit.feature,
    },
    { path: visit.path, debounceMs: 0 },
  );
}

/** Logs page_view on enter and page_dwell (visible time) on leave. */
export function ProductEventTracker() {
  const { pathname, search } = useLocation();
  const visitRef = useRef<VisitState | null>(null);

  useEffect(() => {
    if (pathname.startsWith("/admin")) {
      flushDwell(visitRef.current);
      visitRef.current = null;
      return;
    }

    const path = `${pathname}${search}`;
    const prev = visitRef.current;
    if (prev && prev.path !== path) {
      flushDwell(prev);
    }

    visitRef.current = {
      path,
      feature: featureFromRoute(pathname),
      visibleAccumMs: 0,
      visibleSince: document.visibilityState === "visible" ? Date.now() : null,
    };

    void trackProductEvent("page_view", {}, { path, debounceMs: 800 });
  }, [pathname, search]);

  useEffect(() => {
    const onVisibility = () => {
      const visit = visitRef.current;
      if (!visit) return;
      if (document.visibilityState === "hidden") {
        if (visit.visibleSince != null) {
          visit.visibleAccumMs += Date.now() - visit.visibleSince;
          visit.visibleSince = null;
        }
      } else if (visit.visibleSince == null) {
        visit.visibleSince = Date.now();
      }
    };

    const onPageHide = () => {
      flushDwell(visitRef.current);
      visitRef.current = null;
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
      flushDwell(visitRef.current);
      visitRef.current = null;
    };
  }, []);

  return null;
}
