/**
 * Optional Sentry + global error hooks. No-op when VITE_SENTRY_DSN is unset.
 */
let sentryReady = false;

export async function initErrorMonitoring(): Promise<void> {
  if (typeof window === "undefined") return;

  const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
  if (dsn?.trim()) {
    try {
      const [Sentry, { shellName }] = await Promise.all([
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
      Sentry.setTag("shell", shellName());
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

/** Browser wording for a request that never reached the server (Safari, Chrome, Firefox, React Native). */
const NETWORK_FAILURE = /\b(Load failed|Failed to fetch|NetworkError when attempting to fetch resource|Network request failed)\b/i;

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && "message" in error) return String((error as { message: unknown }).message ?? "");
  return "";
}

/** A dropped connection (offline, page left mid-request) is not a bug in our code. */
export function isNetworkFailure(error: unknown): boolean {
  return NETWORK_FAILURE.test(errorMessage(error));
}

/**
 * Supabase returns errors as plain objects, which Sentry files as "Object captured as exception".
 * Turn them into an Error carrying the message so each problem gets its own readable issue.
 */
export function toReportable(error: unknown): unknown {
  if (error instanceof Error || !error || typeof error !== "object") return error;
  const message = errorMessage(error);
  if (!message) return error;
  const reportable = new Error(message);
  reportable.name = "ApiError";
  return reportable;
}

export function captureException(error: unknown, context?: Record<string, string>): void {
  if (isNetworkFailure(error)) return;
  if (!sentryReady) {
    console.error("[monitoring]", error, context);
    return;
  }
  const code = error && typeof error === "object" && "code" in error ? String((error as { code: unknown }).code ?? "") : "";
  const extra = code ? { ...context, code } : context;
  void import("@sentry/react").then((Sentry) => {
    Sentry.captureException(toReportable(error), extra ? { extra } : undefined);
  });
}
