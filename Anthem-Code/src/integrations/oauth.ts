import { supabase } from "@/integrations/supabase/client";
import {
  buildOAuthCallbackUrl,
  clearStaleOAuthPkceState,
  currentAppPath,
  OAUTH_POPUP_WINDOW_NAME,
  safeRelativePath,
  storeOAuthRedirect,
} from "@/lib/oauthRedirect";

const DEFAULT_AFTER_AUTH = "/";
const POPUP_AUTH_TIMEOUT_MS = 120_000;

/**
 * Opens a blank popup synchronously (call this directly inside the click
 * handler, before any `await`) so browsers don't treat it as a blocked
 * auto-popup. The URL is filled in later once we know the Google auth URL.
 */
export function openOAuthPopup(): Window | null {
  if (typeof window === "undefined") return null;
  const width = 480;
  const height = 640;
  const left = window.screenX + Math.max(0, (window.outerWidth - width) / 2);
  const top = window.screenY + Math.max(0, (window.outerHeight - height) / 2);
  try {
    return window.open(
      "about:blank",
      OAUTH_POPUP_WINDOW_NAME,
      `width=${width},height=${height},left=${left},top=${top},menubar=no,toolbar=no,location=no,status=no,scrollbars=yes`,
    );
  } catch {
    return null;
  }
}

/** Resolves once a Supabase session appears (popup completed login) or times out/closes. */
function waitForPopupAuth(popup: Window, timeoutMs: number): Promise<boolean> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      window.removeEventListener("storage", onStorage);
      window.clearInterval(pollId);
      window.clearTimeout(timeoutId);
      resolve(ok);
    };

    const onStorage = (e: StorageEvent) => {
      if (e.key?.includes("-auth-token") && e.newValue) finish(true);
    };
    window.addEventListener("storage", onStorage);

    const pollId = window.setInterval(() => {
      void supabase.auth.getSession().then(({ data }) => {
        if (data.session) {
          finish(true);
          return;
        }
        if (popup.closed) finish(false);
      });
    }, 500);

    const timeoutId = window.setTimeout(() => finish(false), timeoutMs);
  });
}

export async function signInWithOAuth(
  options?: { redirectTo?: string; popup?: Window | null },
): Promise<{ error?: Error; redirected?: boolean }> {
  const afterAuth = safeRelativePath(
    options?.redirectTo ?? (typeof window !== "undefined" ? currentAppPath() : undefined),
    DEFAULT_AFTER_AUTH,
  );
  storeOAuthRedirect(afterAuth);

  const callbackUrl = buildOAuthCallbackUrl();
  clearStaleOAuthPkceState();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: callbackUrl,
      skipBrowserRedirect: true,
    },
  });

  const popup = options?.popup && !options.popup.closed ? options.popup : null;

  if (error) {
    popup?.close();
    return { error };
  }
  if (!data?.url || typeof window === "undefined") {
    popup?.close();
    return {};
  }

  if (!popup) {
    // No popup available (blocked or not opened by caller) — fall back to a
    // full-page redirect like before. replace() keeps Google out of history —
    // back after login won't replay a stale OAuth flow (best effort only).
    window.location.replace(data.url);
    return { redirected: true };
  }

  try {
    popup.location.href = data.url;
  } catch {
    popup.close();
    window.location.replace(data.url);
    return { redirected: true };
  }

  const ok = await waitForPopupAuth(popup, POPUP_AUTH_TIMEOUT_MS);
  try {
    if (!popup.closed) popup.close();
  } catch {
    /* ignore */
  }

  if (!ok) return {}; // user closed the popup or timed out — no toast, just re-enable the button

  // Main tab never left this page during the whole flow, so its history stays
  // clean — no Google or Solo pages to land on when the user presses back.
  window.location.assign(afterAuth);
  return { redirected: true };
}
