import { mergeRedirectTarget } from "@/lib/mergeRedirectTarget";

/** Map legacy / broken notification links to current routes. */
export function resolveNotificationLink(link: string): string {
  if (!link) return "/notifications";
  const trimmed = link.trim();
  const [pathWithHash, search = ""] = trimmed.split("?");
  const [pathname, hash = ""] = pathWithHash.split("#");
  const params = new URLSearchParams(search);
  const legacyMode = params.get("mode");
  params.delete("mode");
  const rest = params.toString();
  const focus = params.get("focus") ?? hash;

  if (pathname === "/dashboard" && (legacyMode === "collab" || focus === "collab")) {
    return rest ? `/dashboard/collab?${rest}` : "/dashboard/collab";
  }
  if (pathname === "/dashboard" && (legacyMode === "wallet" || focus === "wallet" || focus === "earnings")) {
    return rest ? `/earnings?${rest}` : "/earnings";
  }
  if (pathname === "/dashboard" && (legacyMode === "hire" || focus === "hiring" || focus === "hire")) {
    return rest ? `/dashboard?${rest}` : "/dashboard";
  }
  if (pathname === "/dashboard/collab") {
    return rest ? `/dashboard/collab?${rest}` : "/dashboard/collab";
  }

  const legacy: Record<string, string> = {
    "/hire-requests": "/dashboard",
    "/collab-requests": "/dashboard/collab",
    "/followers": "/portfolio/followers",
  };
  const base = legacy[pathname] ?? trimmed;
  if (legacy[pathname]) {
    return rest ? mergeRedirectTarget(base, `?${rest}`) : base;
  }
  return search ? mergeRedirectTarget(pathname + (hash ? `#${hash}` : ""), `?${search}`) : base;
}
