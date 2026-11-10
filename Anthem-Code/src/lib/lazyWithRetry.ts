import { lazy, type ComponentType, type LazyExoticComponent } from "react";

const RELOAD_KEY = "aplus1_chunk_reload";

/** True when a Vite/SPA deploy left the tab holding a stale chunk URL (404). */
export function isChunkLoadError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err ?? "");
  return /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Loading chunk [\d]+ failed|ChunkLoadError/i.test(
    msg,
  );
}

/**
 * Vite fires `vite:preloadError` when any dynamic import 404s (stale tab after a deploy, e.g. Sentry
 * "Failed to fetch dynamically imported module .../CollabDialog-*.js"). Reload once to pick up the new build.
 */
export function installChunkReload() {
  // A page that stays up 30 s after loading is healthy: allow one more reload for the next deploy.
  window.setTimeout(() => {
    try {
      sessionStorage.removeItem(RELOAD_KEY);
    } catch {
      /* ignore */
    }
  }, 30_000);
  window.addEventListener("vite:preloadError", (event) => {
    try {
      if (sessionStorage.getItem(RELOAD_KEY)) return; // already reloaded once: let the error surface
      sessionStorage.setItem(RELOAD_KEY, "1");
    } catch {
      return;
    }
    event.preventDefault();
    window.location.reload();
  });
}

/**
 * Like React.lazy, but one hard reload when a chunk 404s after deploy
 * (old index still in memory requesting a deleted hashed asset).
 */
export function lazyWithRetry<T extends ComponentType<unknown>>(
  factory: () => Promise<{ default: T }>,
): LazyExoticComponent<T> {
  return lazy(async () => {
    try {
      const mod = await factory();
      try {
        sessionStorage.removeItem(RELOAD_KEY);
      } catch {
        /* ignore */
      }
      return mod;
    } catch (err) {
      if (isChunkLoadError(err)) {
        try {
          if (!sessionStorage.getItem(RELOAD_KEY)) {
            sessionStorage.setItem(RELOAD_KEY, "1");
            window.location.reload();
            return await new Promise<{ default: T }>(() => {});
          }
        } catch {
          /* fall through */
        }
      }
      throw err;
    }
  });
}
