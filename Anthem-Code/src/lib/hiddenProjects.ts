const KEY = "aplus1:hidden-projects";
const EMPTY = new Set<string>();

const listeners = new Set<() => void>();
let snapshot: Set<string> = EMPTY;
let loaded = false;

function readStorage(): Set<string> {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = JSON.parse(window.localStorage.getItem(KEY) ?? "[]") as unknown;
    return new Set(Array.isArray(raw) ? raw.filter((id): id is string => typeof id === "string") : []);
  } catch {
    return new Set();
  }
}

function ensureLoaded(): Set<string> {
  if (!loaded) {
    snapshot = readStorage();
    loaded = true;
  }
  return snapshot;
}

export function hideProjectId(projectId: string): void {
  const next = new Set(ensureLoaded());
  next.add(projectId);
  snapshot = next;
  if (typeof window !== "undefined") {
    window.localStorage.setItem(KEY, JSON.stringify([...next]));
  }
  listeners.forEach((fn) => fn());
}

export function subscribeHiddenProjects(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange);
  return () => listeners.delete(onStoreChange);
}

export function getHiddenProjectIds(): Set<string> {
  return ensureLoaded();
}

export function getHiddenProjectIdsSnapshot(): Set<string> {
  return EMPTY;
}

/** Test-only: drop in-memory cache so localStorage is re-read. */
export function resetHiddenProjectsForTests(): void {
  snapshot = EMPTY;
  loaded = false;
}
