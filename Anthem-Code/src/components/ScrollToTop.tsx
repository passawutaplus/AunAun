import { useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";

/** Reset scroll on route change — skip when opening #comments anchor. */
export function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useLayoutEffect(() => {
    if (hash === "#comments") return;
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname, hash]);

  return null;
}
