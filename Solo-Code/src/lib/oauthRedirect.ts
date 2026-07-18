import { safeRelativePath } from "./safeUrl";

export { safeRelativePath };

/** Post-OAuth destination stored before IdP redirect (survives cross-site return). */
const STORAGE_KEY = "ecosystem_oauth_redirect";

/**
 * window.name of the popup used for Google sign-in. Checked (not window.opener,
 * which can be severed by cross-origin COOP headers on Google/Supabase pages)
 * by the auth callback route to know it's running inside that popup and
 * should just close itself instead of navigating the tiny popup window.
 */
export const OAUTH_POPUP_WINDOW_NAME = "google-oauth-signin";

export function isOAuthPopupWindow(): boolean {
  return typeof window !== "undefined" && window.name === OAUTH_POPUP_WINDOW_NAME;
}

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

/** Drop PKCE verifier from a prior attempt (back-button retries reuse stale Supabase state). */
export function clearStaleOAuthPkceState(): void {
  if (typeof window === "undefined") return;
  try {
    const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
    const ref = url?.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
    const prefix = ref ? `sb-${ref}-auth-token` : "sb-";
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith(prefix) && key.includes("code-verifier")) {
        localStorage.removeItem(key);
      }
    }
  } catch {
    /* Safari private mode */
  }
}

export function formatOAuthCallbackError(message: string): string {
  if (/code verifier|pkce|invalid flow state|flow state|oauth state|bad_oauth_state/i.test(message)) {
    return "เซสชันเข้าสู่ระบบหมดอายุแล้ว (มักเกิดเมื่อกดย้อนกลับ) — กลับไปหน้าเข้าสู่ระบบแล้วกด Google ใหม่";
  }
  return message;
}
