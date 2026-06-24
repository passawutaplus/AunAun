/**
 * Optional Sentry + global error hooks. No-op when VITE_SENTRY_DSN is unset.
 */
let sentryReady = false;

export async function initErrorMonitoring(): Promise<void> {
  if (typeof window === "undefined") return;

  const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
  if (dsn?.trim()) {
    try {
      const Sentry = await import("@sentry/react");
      Sentry.init({
        dsn: dsn.trim(),
        environment: import.meta.env.PROD ? "production" : "development",
        tracesSampleRate: 0.05,
        ignoreErrors: ["ResizeObserver loop"],
      });
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
