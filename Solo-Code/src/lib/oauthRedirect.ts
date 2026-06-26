import { safeRelativePath } from "./safeUrl";

export { safeRelativePath };

/** Post-OAuth destination stored before IdP redirect (survives cross-site return). */
const STORAGE_KEY = "ecosystem_oauth_redirect";

export function getAppOrigin(): string {
  if (typeof window === "undefined") return "";
  const configured = import.meta.env.VITE_SITE_URL as string | undefined;
  if (configured?.trim()) return configured.trim().replace(/\/$/, "");
  return window.location.origin;
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
  // PKCE stores the verifier per origin — callback must match where sign-in started.
  if (typeof window !== "undefined") {
    return `${window.location.origin}/auth/callback`;
  }
  const configured = import.meta.env.VITE_SITE_URL as string | undefined;
  if (configured?.trim()) return `${configured.trim().replace(/\/$/, "")}/auth/callback`;
  return "/auth/callback";
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
