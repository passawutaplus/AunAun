import { safeRelativePath } from "./safeUrl";

export { safeRelativePath };

const STORAGE_KEY = "ecosystem_oauth_redirect";

export function getAppOrigin(): string {
  if (typeof window === "undefined") return "";
  const configured = import.meta.env.VITE_SITE_URL as string | undefined;
  if (configured?.trim()) return configured.trim().replace(/\/$/, "");
  return window.location.origin;
}

/** True when redirect query must be removed from the URL bar (open-redirect attempt). */
export function shouldStripRedirectParam(raw?: string | null): boolean {
  if (!raw) return false;
  return safeRelativePath(raw, "/") !== raw;
}

export function storeOAuthRedirect(path: string): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, path);
  } catch {
    /* Safari private mode */
  }
}

export function consumeOAuthRedirect(fallback: string): string {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    sessionStorage.removeItem(STORAGE_KEY);
    return safeRelativePath(stored, fallback);
  } catch {
    return fallback;
  }
}

export function buildOAuthCallbackUrl(): string {
  return `${getAppOrigin()}/auth/callback`;
}

export function parseOAuthError(): string | null {
  if (typeof window === "undefined") return null;
  const search = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  return (
    search.get("error_description") ||
    search.get("error") ||
    hash.get("error_description") ||
    hash.get("error")
  );
}

export function currentAppPath(): string {
  if (typeof window === "undefined") return "/";
  return `${window.location.pathname}${window.location.search}`;
}
