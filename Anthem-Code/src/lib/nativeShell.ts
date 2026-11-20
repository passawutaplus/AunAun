/**
 * Native features of the SAMECOR store apps, read from the shell bridge `window.SamecorShell`
 * (Android: capacitor-shell/android/.../MainActivity.java, iOS: capacitor-shell/ios/App/App/ShellViewController.swift).
 *
 * `getFeatures()` arrived with Android 1.2.0 and iOS 1.1.0. Older app builds do not have it, so every check here is
 * false there and the site keeps its older in-app behaviour (no social sign-in, no store review prompt, ...).
 * On the website there is no bridge at all.
 */
import { isWebViewApp } from "@/lib/appShell";

export type ShellFeature =
  /** Sign-in pages open in the phone's browser (Custom Tabs / ASWebAuthenticationSession) and come back to the app. */
  | "auth"
  /** Native Sign in with Apple (iOS). */
  | "apple"
  /** Store rating sheet (SKStoreReviewController / Play In-App Review). */
  | "review"
  /** window.print opens the system print dialog. */
  | "print"
  /** navigator.share opens the system share sheet. */
  | "share"
  /** Blob / data / `download` links are saved by the app. */
  | "download"
  /** Push notifications through @capacitor/push-notifications (APNs on iOS, FCM on Android). */
  | "push";

type ShellBridge = {
  getFeatures?: () => unknown;
  openAuth?: (url: string) => unknown;
  requestReview?: () => unknown;
  signInWithApple?: (nonceHash: string) => unknown;
};

function bridge(): ShellBridge | null {
  if (typeof window === "undefined" || !isWebViewApp()) return null;
  return (window as Window & { SamecorShell?: ShellBridge }).SamecorShell ?? null;
}

/** Feature names the installed app reports, e.g. {"auth", "share", "print"}. Empty on the web and in old builds. */
export function shellFeatures(): ReadonlySet<string> {
  const shell = bridge();
  if (typeof shell?.getFeatures !== "function") return new Set();
  try {
    const raw = shell.getFeatures();
    return new Set(
      String(raw ?? "")
        .split(",")
        .map((f) => f.trim())
        .filter(Boolean),
    );
  } catch {
    return new Set();
  }
}

export function hasShellFeature(feature: ShellFeature): boolean {
  return shellFeatures().has(feature);
}

/**
 * Where sign-in started in the app comes back: the phone's browser lands on this page, which hands the code
 * to the app (public/app-return.js). `to=reset-password` makes the app open /reset-password instead of /auth/callback.
 */
export function appReturnUrl(to: "callback" | "reset-password" = "callback"): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "https://samecor.com";
  return to === "reset-password" ? `${origin}/auth/app-return?to=reset-password` : `${origin}/auth/app-return`;
}

/** Opens a provider's sign-in page in the phone's browser. False when this app build cannot. */
export function openAuthInSystemBrowser(url: string): boolean {
  const shell = bridge();
  if (!hasShellFeature("auth") || typeof shell?.openAuth !== "function") return false;
  try {
    shell.openAuth(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Asks the store to show its rating sheet. The store decides whether it really appears (Apple shows it at most
 * three times a year), and nothing tells the page what the user chose. False when this app build cannot.
 */
export function requestStoreReview(): boolean {
  const shell = bridge();
  if (!hasShellFeature("review") || typeof shell?.requestReview !== "function") return false;
  try {
    shell.requestReview();
    return true;
  } catch {
    return false;
  }
}

export type AppleCredential = { token: string; name?: string };

/** Thrown when the user closes the Apple sheet; callers stay quiet for it. */
export class ShellCanceledError extends Error {
  constructor() {
    super("canceled");
    this.name = "ShellCanceledError";
  }
}

/**
 * Native Sign in with Apple (iOS app). `nonceHash` is the SHA-256 (hex) of the raw nonce given to Supabase;
 * Apple puts it in the identity token and Supabase checks it.
 */
export async function nativeAppleSignIn(nonceHash: string): Promise<AppleCredential> {
  const shell = bridge();
  if (!hasShellFeature("apple") || typeof shell?.signInWithApple !== "function") {
    throw new Error("Sign in with Apple is not available in this app version");
  }
  const result = (await shell.signInWithApple(nonceHash)) as
    | { token?: unknown; name?: unknown; error?: unknown }
    | null
    | undefined;
  if (result?.error === "canceled") throw new ShellCanceledError();
  if (typeof result?.token !== "string" || !result.token) {
    throw new Error(typeof result?.error === "string" && result.error ? result.error : "Sign in with Apple failed");
  }
  const name = typeof result.name === "string" && result.name.trim() ? result.name.trim() : undefined;
  return { token: result.token, name };
}
