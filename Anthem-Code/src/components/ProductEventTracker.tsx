import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { trackProductEvent } from "@/lib/productEvents";

/** Logs page_view on route changes when analytics consent is granted. */
export function ProductEventTracker() {
  const { pathname, search } = useLocation();
  const last = useRef("");

  useEffect(() => {
    const path = `${pathname}${search}`;
    if (path === last.current) return;
    last.current = path;
    // Skip noisy admin polling surfaces for product analytics
    if (pathname.startsWith("/admin")) return;
    void trackProductEvent("page_view", {}, { path, debounceMs: 800 });
  }, [pathname, search]);

  return null;
}
