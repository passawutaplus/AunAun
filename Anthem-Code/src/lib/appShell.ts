/**
 * Where the web app is running: a normal browser tab, an installed PWA, or the
 * Android app (a Trusted Web Activity wrapping this site — see android/README.md).
 *
 * The TWA shares Chrome's cookies and localStorage with normal browsing, so the
 * "inside the Android app" flag lives in sessionStorage: it is set once per app
 * session from the launch signal and never leaks into a later Chrome tab.
 */

const ANDROID_SESSION_KEY = "samecor:android-app";
/** Query param the TWA start URL carries (android/twa-manifest.json → startUrl). */
const ANDROID_SOURCE_PARAM = "android";
const ANDROID_REFERRER_PREFIX = "android-app://com.samecor.twa";

/** Status bar / theme-color per theme — matches --background in index.css. */
const THEME_COLOR = { light: "#F8F7F2", dark: "#201F1E" } as const;

function readSession(key: string): string | null {
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeSession(key: string, value: string): void {
  try {
    window.sessionStorage.setItem(key, value);
  } catch {
    /* storage blocked — detection falls back to the launch signal only */
  }
}

function launchedFromAndroidApp(): boolean {
  if (typeof window === "undefined") return false;
  const source = new URLSearchParams(window.location.search).get("source");
  return source === ANDROID_SOURCE_PARAM || document.referrer.startsWith(ANDROID_REFERRER_PREFIX);
}

/** True when the page is shown without browser chrome (installed PWA or the Android app). */
export function isStandaloneDisplay(): boolean {
  if (typeof window === "undefined") return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return Boolean(window.matchMedia?.("(display-mode: standalone)").matches || nav.standalone);
}

/** User-agent suffix the Capacitor shell appends (capacitor-shell/capacitor.config.json → android.appendUserAgent). */
const WEBVIEW_APP_UA_MARKER = "SamecorApp";

/**
 * True inside the Capacitor WebView build of the Android app. Unlike the TWA it
 * does not share Chrome's session, and Google blocks OAuth sign-in in WebViews.
 */
export function isWebViewApp(): boolean {
  if (typeof navigator === "undefined") return false;
  return navigator.userAgent.includes(WEBVIEW_APP_UA_MARKER);
}

/** True inside the SAMECOR Android app (TWA or Capacitor WebView). */
export function isAndroidApp(): boolean {
  if (typeof window === "undefined") return false;
  return isWebViewApp() || readSession(ANDROID_SESSION_KEY) === "1" || launchedFromAndroidApp();
}

function syncThemeColor(): void {
  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (!meta) return;
  const color = document.documentElement.classList.contains("dark") ? THEME_COLOR.dark : THEME_COLOR.light;
  if (meta.content !== color) meta.content = color;
}

/** Call once at startup: remembers the Android launch and keeps the status bar colour in step with the theme. */
export function installAppShell(): void {
  if (typeof window === "undefined") return;
  if (launchedFromAndroidApp()) writeSession(ANDROID_SESSION_KEY, "1");

  syncThemeColor();
  new MutationObserver(syncThemeColor).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });
}
