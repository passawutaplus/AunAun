import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { BOTTOM_NAV_MAX_WIDTH, isActiveChatThread, shouldHideBottomNav } from "@/lib/mobileLayout";
import { useIsMobile } from "@/hooks/use-mobile";

/**
 * App shell layout signals for mobile web and future Capacitor builds.
 * - `showBottomNav`: floating nav visible (< lg), not hidden routes/chat thread on phone
 * - `isMobile`: phone breakpoint (< md), used for chat full-screen behavior
 */
export function useAppLayout() {
  const { pathname } = useLocation();
  const isMobile = useIsMobile();
  const [belowLg, setBelowLg] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${BOTTOM_NAV_MAX_WIDTH}px)`);
    const sync = () => setBelowLg(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const navHidden = shouldHideBottomNav(pathname, isMobile);
  const showBottomNav = belowLg && !navHidden;

  return {
    isMobile,
    belowLg,
    showBottomNav,
    pathname,
    isChatThread: isActiveChatThread(pathname),
  };
}
