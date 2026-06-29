import type { NavigateFunction } from "react-router-dom";

/** Current path + search, optionally merged with extra query params. */
export function authRedirectPath(extra?: Record<string, string>): string {
  if (typeof window === "undefined") return "/";
  const url = new URL(window.location.href);
  if (extra) {
    for (const [k, v] of Object.entries(extra)) url.searchParams.set(k, v);
  }
  return `${url.pathname}${url.search}`;
}

/** Send guest to full auth page; after login AuthPage navigates back to redirect. */
export function navigateToAuth(navigate: NavigateFunction, extra?: Record<string, string>) {
  const redirect = authRedirectPath(extra);
  navigate(`/auth?redirect=${encodeURIComponent(redirect)}`);
}

/** Strip intent query keys after handling (e.g. hire=1). */
export function stripSearchParams(
  searchParams: URLSearchParams,
  keys: string[],
): URLSearchParams {
  const next = new URLSearchParams(searchParams);
  for (const k of keys) next.delete(k);
  return next;
}

const PENDING_HIRE_KEY = "aplus1-pending-hire";

export function stashPendingHire(freelancerId: string, projectTitle: string) {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(PENDING_HIRE_KEY, JSON.stringify({ freelancerId, projectTitle }));
}

export function consumePendingHire(): { freelancerId: string; projectTitle: string } | null {
  if (typeof sessionStorage === "undefined") return null;
  const raw = sessionStorage.getItem(PENDING_HIRE_KEY);
  if (!raw) return null;
  sessionStorage.removeItem(PENDING_HIRE_KEY);
  try {
    return JSON.parse(raw) as { freelancerId: string; projectTitle: string };
  } catch {
    return null;
  }
}
