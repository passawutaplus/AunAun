/**
 * Routes where the interest survey must not interrupt auth / legal / system flows.
 * First-time users should see the survey on feed and most app pages after login.
 */
const DEFERRED_SURVEY_PREFIXES = [
  "/auth",
  "/legal",
  "/error/",
  "/admin",
] as const;

/** Defer interest survey only on auth/legal/admin/error — show it for first login elsewhere. */
export function shouldDeferInterestSurvey(pathname: string): boolean {
  if (pathname === "/") return false;
  return DEFERRED_SURVEY_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix),
  );
}

export function isAuthRoute(pathname: string): boolean {
  return pathname === "/auth" || pathname.startsWith("/auth/");
}
