/**
 * Routes where task completion must not be blocked by the interest survey or cookie banner.
 */
const DEFERRED_SURVEY_PREFIXES = [
  "/auth",
  "/chat",
  "/project/",
  "/collections",
  "/portfolio/",
  "/jobs",
  "/settings",
  "/verify",
  "/advertise",
  "/admin",
  "/studio/",
  "/notifications",
  "/hire-requests",
  "/collab-requests",
  "/contracts/",
  "/me/",
  "/error/",
] as const;

/** Show interest survey only on discovery/home routes (not deep task flows). */
export function shouldDeferInterestSurvey(pathname: string): boolean {
  if (pathname === "/") return false;
  return DEFERRED_SURVEY_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix),
  );
}

export function isAuthRoute(pathname: string): boolean {
  return pathname === "/auth" || pathname.startsWith("/auth/");
}
