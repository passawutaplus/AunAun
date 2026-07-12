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
