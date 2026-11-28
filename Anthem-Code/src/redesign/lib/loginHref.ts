/**
 * Log-in link that brings the person back to the page they were on (Login reads `?redirect=`
 * and only accepts a relative path). Use it for every "Log In" button and every action that
 * needs an account (like, follow, save, interested, greet…).
 */
export function loginHref(path?: string): string {
  const here = path ?? (typeof window === "undefined" ? "" : `${window.location.pathname}${window.location.search}`);
  return here && here !== "/" && !here.startsWith("/auth") ? `/auth?redirect=${encodeURIComponent(here)}` : "/auth";
}
