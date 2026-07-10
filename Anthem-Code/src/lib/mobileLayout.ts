/** Shared mobile / app-shell layout tokens (web + future Capacitor). */

export const MOBILE_BREAKPOINT = 768;
/** Matches Tailwind `lg:` — bottom nav hidden at this width and above. */
export const BOTTOM_NAV_MAX_WIDTH = 1023;

export const NAV_HIDDEN_PREFIXES = ["/auth", "/admin", "/error", "/community/new", "/settings"];

export const isPortfolioEditorRoute = (pathname: string) =>
  pathname === "/portfolio/new" || /^\/portfolio\/[^/]+\/edit/.test(pathname);

export const isActiveChatThread = (pathname: string) => /^\/chat\/[^/]+/.test(pathname);

export function shouldHideBottomNav(pathname: string, narrowViewport: boolean): boolean {
  if (NAV_HIDDEN_PREFIXES.some((p) => pathname.startsWith(p))) return true;
  if (isPortfolioEditorRoute(pathname)) return true;
  if (/^\/community\/[^/]+\/edit/.test(pathname)) return true;
  if (narrowViewport && isActiveChatThread(pathname)) return true;
  return false;
}

/** Tailwind class: bottom padding when floating nav is visible (< lg). */
export const MOBILE_PAGE_BOTTOM_CLASS = "pb-28 lg:pb-0";

/** CSS calc for fixed FABs sitting above the floating nav row. */
export function mobileFabBottom(extra = "0px"): string {
  return `calc(env(safe-area-inset-bottom, 0px) + 5.5rem + ${extra})`;
}
