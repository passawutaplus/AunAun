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

/**
 * Version of the installed Android app ("1.0.2 (3)"), read from the native shell bridge
 * (capacitor-shell MainActivity.getAppVersion). Null on the web and in app builds older than the bridge.
 */
export function getNativeAppVersion(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const bridge = (window as Window & { SamecorShell?: { getAppVersion?: () => unknown } }).SamecorShell;
    const v = typeof bridge?.getAppVersion === "function" ? bridge.getAppVersion() : null;
    return typeof v === "string" && v.trim() ? v.trim() : null;
  } catch {
    return null;
  }
}

/** True inside the SAMECOR Android app (TWA or Capacitor WebView). */
export function isAndroidApp(): boolean {
  if (typeof window === "undefined") return false;
  return isWebViewApp() || readSession(ANDROID_SESSION_KEY) === "1" || launchedFromAndroidApp();
}

/** Native bridge MainActivity adds in the Capacitor shell (capacitor-shell/android/.../MainActivity.java). */
type SamecorShellBridge = { setSystemBarColor(hex: string, dark: boolean): void };

function syncThemeColor(): void {
  const dark = document.documentElement.classList.contains("dark");
  const color = dark ? THEME_COLOR.dark : THEME_COLOR.light;
  // WebView ignores theme-color, so paint the status / gesture bars through the shell.
  (window as Window & { SamecorShell?: SamecorShellBridge }).SamecorShell?.setSystemBarColor(color, dark);
  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (meta && meta.content !== color) meta.content = color;
}

/**
 * Pinch zoom scales the whole page, which drags fixed toolbars (side tools,
 * bottom bars) half off screen in the app. Lock it there; in-page zoom (e.g. the
 * image lightbox) handles its own gestures.
 */
function lockPageZoom(): void {
  const meta = document.querySelector<HTMLMetaElement>('meta[name="viewport"]');
  if (meta && !meta.content.includes("user-scalable")) {
    meta.content = `${meta.content}, maximum-scale=1, user-scalable=no`;
  }
  document.documentElement.style.touchAction = "pan-x pan-y";
}

/** Call once at startup: remembers the Android launch and keeps the status bar colour in step with the theme. */
export function installAppShell(): void {
  if (typeof window === "undefined") return;
  if (launchedFromAndroidApp()) writeSession(ANDROID_SESSION_KEY, "1");
  if (isWebViewApp()) lockPageZoom();

  syncThemeColor();
  new MutationObserver(syncThemeColor).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });
}
