/**
 * Auto-attached feedback diagnostics: browser, viewport, app build and the last
 * few console errors. Kept in memory only and sent with a feedback ticket.
 */

const MAX_ERRORS = 10;
const MAX_ERROR_LEN = 300;

type RecentError = { at: string; text: string };

const recentErrors: RecentError[] = [];
let installed = false;

function stringify(value: unknown): string {
  if (value instanceof Error) return `${value.name}: ${value.message}`;
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export function recordFeedbackError(...parts: unknown[]): void {
  const text = parts.map(stringify).join(" ").trim().slice(0, MAX_ERROR_LEN);
  if (!text) return;
  recentErrors.push({ at: new Date().toISOString(), text });
  if (recentErrors.length > MAX_ERRORS) recentErrors.shift();
}

export function installFeedbackDiagnostics(): void {
  if (installed || typeof window === "undefined") return;
  installed = true;
  const original = console.error.bind(console);
  console.error = (...args: unknown[]) => {
    recordFeedbackError(...args);
    original(...args);
  };
  window.addEventListener("error", (e) => recordFeedbackError(e.error ?? e.message));
  window.addEventListener("unhandledrejection", (e) => recordFeedbackError(e.reason));
}

export function appBuild(): string {
  return typeof __APP_BUILD__ !== "undefined" ? __APP_BUILD__ : "dev";
}

export type FeedbackDiagnostics = {
  build: string;
  url: string;
  viewport: string;
  dpr: number;
  language: string;
  online: boolean;
  standalone: boolean;
  errors: RecentError[];
};

export function collectFeedbackDiagnostics(): FeedbackDiagnostics {
  const w = typeof window !== "undefined" ? window : undefined;
  return {
    build: appBuild(),
    url: w ? w.location.pathname : "",
    viewport: w ? `${w.innerWidth}x${w.innerHeight}` : "",
    dpr: w?.devicePixelRatio ?? 1,
    language: typeof navigator !== "undefined" ? navigator.language : "",
    online: typeof navigator !== "undefined" ? navigator.onLine : true,
    standalone: !!w?.matchMedia?.("(display-mode: standalone)").matches,
    errors: [...recentErrors],
  };
}
