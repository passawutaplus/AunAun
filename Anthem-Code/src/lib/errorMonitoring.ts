/**
 * Optional Sentry + global error hooks. No-op when VITE_SENTRY_DSN is unset.
 */
let sentryReady = false;

export async function initErrorMonitoring(): Promise<void> {
  if (typeof window === "undefined") return;

  const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
  if (dsn?.trim()) {
    try {
      const [Sentry, { isAndroidApp, isStandaloneDisplay }] = await Promise.all([
        import("@sentry/react"),
        import("@/lib/appShell"),
      ]);
      Sentry.init({
        dsn: dsn.trim(),
        // Vercel exposes VITE_VERCEL_ENV for Vite builds — keeps preview-deploy errors out of production
        environment:
          (import.meta.env.VITE_VERCEL_ENV as string | undefined) ?? (import.meta.env.PROD ? "production" : "development"),
        tracesSampleRate: 0.05,
        ignoreErrors: ["ResizeObserver loop"],
      });
      Sentry.setTag("shell", isAndroidApp() ? "android" : isStandaloneDisplay() ? "pwa" : "web");
      sentryReady = true;
    } catch (err) {
      console.warn("[monitoring] Sentry init failed", err);
    }
  }

  window.addEventListener("error", (event) => {
    if (sentryReady) return;
    console.error("[monitoring] uncaught", event.error ?? event.message);
  });
  window.addEventListener("unhandledrejection", (event) => {
    if (sentryReady) return;
    console.error("[monitoring] unhandled rejection", event.reason);
  });
}

export function captureException(error: unknown, context?: Record<string, string>): void {
  if (!sentryReady) {
    console.error("[monitoring]", error, context);
    return;
  }
  void import("@sentry/react").then((Sentry) => {
    Sentry.captureException(error, context ? { extra: context } : undefined);
  });
}
