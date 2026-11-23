import { supabase } from "@/integrations/supabase/client";
import { isStandaloneDisplay, isWebViewApp } from "@/lib/appShell";
import {
  appReturnUrl,
  hasShellFeature,
  nativeAppleSignIn,
  openAuthInSystemBrowser,
  ShellCanceledError,
} from "@/lib/nativeShell";
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
  // Installed PWA / Android app: a popup opens as a separate tab that never hands the
  // session back, so sign-in uses the full-page redirect instead.
  // Store apps open sign-in in the phone's browser instead (signInWithOAuth below).
  if (isStandaloneDisplay() || isWebViewApp()) return null;
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

/**
 * Supabase provider ids. LINE has no built-in provider: it is a Supabase custom OAuth2
 * provider named "custom:line" (Auth → Providers → New provider), see .env.example.
 */
export type OAuthProviderId = "google" | "facebook" | "apple" | "custom:line";

export async function signInWithOAuth(
  options?: { redirectTo?: string; popup?: Window | null; provider?: OAuthProviderId },
): Promise<{ error?: Error; redirected?: boolean }> {
  const afterAuth = safeRelativePath(
    options?.redirectTo ?? (typeof window !== "undefined" ? currentAppPath() : undefined),
    DEFAULT_AFTER_AUTH,
  );
  storeOAuthRedirect(afterAuth);

  // Store app: the provider page opens in the phone's browser and comes back through /auth/app-return.
  const inApp = hasShellFeature("auth");
  const callbackUrl = inApp ? appReturnUrl() : buildOAuthCallbackUrl();
  clearStaleOAuthPkceState();

  const { data, error } = await supabase.auth.signInWithOAuth({
    // supabase-js types list only built-in providers; "custom:*" ids are accepted at runtime.
    provider: (options?.provider ?? "google") as "google",
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

  if (inApp) {
    // The app comes back to /auth/callback in this web view, which finishes the PKCE exchange.
    if (!openAuthInSystemBrowser(data.url)) return { error: new Error("เปิดหน้าเข้าสู่ระบบไม่ได้ ลองใหม่อีกครั้ง") };
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

/** Random string for the Sign in with Apple nonce (Supabase gets it raw, Apple gets its SHA-256). */
function randomNonce(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Apple's identity token for the signed-in Apple ID, with the raw nonce Supabase checks it against. */
export async function nativeAppleIdToken(): Promise<
  { token: string; nonce: string; name?: string; code?: string } | null
> {
  const nonce = randomNonce();
  try {
    const credential = await nativeAppleSignIn(await sha256Hex(nonce));
    return { ...credential, nonce };
  } catch (err) {
    if (err instanceof ShellCanceledError) return null;
    throw err;
  }
}

/**
 * Hands Apple's one-time code to the apple-signin-token function, so a later account deletion can revoke
 * SAMECOR's access at Apple (App Review 5.1.1(v)). Never throws and gives up after 6 s: it must not block sign-in.
 */
export async function saveAppleSignInCode(code: string | undefined): Promise<void> {
  if (!code) return;
  await Promise.race([
    supabase.functions.invoke("apple-signin-token", { body: { code } }).catch(() => undefined),
    new Promise((resolve) => window.setTimeout(resolve, 6000)),
  ]);
}

/**
 * Sign in with Apple inside the iOS app (App Review 4.8): Apple's own sheet, then Supabase signInWithIdToken.
 * Apple shares the name only the first time, so it is saved to the account then.
 */
export async function signInWithApple(
  options?: { redirectTo?: string },
): Promise<{ error?: Error; redirected?: boolean }> {
  const afterAuth = safeRelativePath(
    options?.redirectTo ?? (typeof window !== "undefined" ? currentAppPath() : undefined),
    DEFAULT_AFTER_AUTH,
  );
  let apple: Awaited<ReturnType<typeof nativeAppleIdToken>>;
  try {
    apple = await nativeAppleIdToken();
  } catch (err) {
    return { error: err instanceof Error ? err : new Error(String(err)) };
  }
  if (!apple) return {}; // closed the Apple sheet

  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: "apple",
    token: apple.token,
    nonce: apple.nonce,
  });
  if (error) return { error };

  const meta = data.user?.user_metadata ?? {};
  if (apple.name && !meta.full_name && !meta.name) {
    await supabase.auth.updateUser({ data: { full_name: apple.name, name: apple.name } }).catch(() => undefined);
  }
  await saveAppleSignInCode(apple.code);
  window.location.assign(afterAuth);
  return { redirected: true };
}
