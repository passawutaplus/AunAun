import { useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";
import { getBackgroundLocation } from "@/lib/projectOverlay";

/** Reset scroll on route change — skip when opening #comments anchor, and keep the page under a work overlay where it was. */
export function ScrollToTop() {
  const location = useLocation();
  const { pathname, hash } = getBackgroundLocation(location.state) ?? location;

  useLayoutEffect(() => {
    if (hash === "#comments") return;
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname, hash]);

  return null;
}
