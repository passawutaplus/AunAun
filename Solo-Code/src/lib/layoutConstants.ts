/**
 * Layout offsets for mobile dashboard (bottom nav + iOS safe-area).
 * BottomNav is `min-h-[56px]` + `env(safe-area-inset-bottom)` on the nav itself.
 */

/** Content height of the bottom nav row (px). */
export const DASH_MOBILE_NAV_BAR_PX = 56;

/** Main scroll spacer — slightly taller than the bar for breathing room. */
export const DASH_MOBILE_NAV_SPACER_PX = 64;

/** Approx. height of QuotationEditor mobile sticky action bar (px). */
export const DASH_MOBILE_STICKY_ACTION_PX = 52;

/** CSS `bottom` for fixed UI that sits directly above the mobile bottom nav. */
export function cssAboveMobileBottomNav(extraPx = 0): string {
  return `calc(${DASH_MOBILE_NAV_SPACER_PX}px + env(safe-area-inset-bottom, 0px) + ${extraPx}px)`;
}

/** CSS `padding-bottom` for scrollable content clearing nav + optional sticky bar. */
export function cssMobileDashboardScrollPadding(stickyBarPx = 0): string {
  return cssAboveMobileBottomNav(stickyBarPx + 16);
}
