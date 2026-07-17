import { mergeRedirectTarget } from "@/lib/mergeRedirectTarget";

/** Map legacy / broken notification links to current routes. */
export function resolveNotificationLink(link: string): string {
  if (!link) return "/notifications";
  const trimmed = link.trim();
  const [pathname, search = ""] = trimmed.split("?");
  const legacy: Record<string, string> = {
    "/hire-requests": "/dashboard?mode=hire",
    "/collab-requests": "/dashboard?mode=collab",
    "/followers": "/portfolio/followers",
  };
  const base = legacy[pathname] ?? trimmed;
  return search ? mergeRedirectTarget(base, `?${search}`) : base;
}
