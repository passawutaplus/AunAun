/**
 * Gaps in older phones and in-app browsers, patched before anything else runs (first import in main.tsx and go/main.ts).
 * Seen in Sentry 2026-11: `crypto.randomUUID is not a function` (iOS < 15.4, old Android WebViews) and
 * `null is not an object (evaluating 'localStorage.getItem')` (WebViews with DOM storage off).
 */

function uuidFromRandomValues(): `${string}-${string}-${string}-${string}-${string}` {
  const b = new Uint8Array(16);
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") crypto.getRandomValues(b);
  else for (let i = 0; i < 16; i++) b[i] = Math.floor(Math.random() * 256);
  b[6] = (b[6] & 0x0f) | 0x40; // version 4
  b[8] = (b[8] & 0x3f) | 0x80; // RFC 4122 variant
  const h = Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

function memoryStorage(): Storage {
  const m = new Map<string, string>();
  return {
    get length() {
      return m.size;
    },
    clear: () => m.clear(),
    getItem: (k) => (m.has(String(k)) ? (m.get(String(k)) as string) : null),
    key: (i) => Array.from(m.keys())[i] ?? null,
    removeItem: (k) => void m.delete(String(k)),
    setItem: (k, v) => void m.set(String(k), String(v)),
  };
}

function patchStorage(name: "localStorage" | "sessionStorage") {
  let ok = false;
  try {
    ok = window[name] != null;
  } catch {
    ok = false; // access itself throws when storage is blocked
  }
  if (ok) return;
  try {
    Object.defineProperty(window, name, { value: memoryStorage(), configurable: true });
  } catch {
    /* leave it; callers already guard most reads */
  }
}

export function installRuntimePolyfills() {
  if (typeof window === "undefined") return;
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID !== "function") {
      Object.defineProperty(crypto, "randomUUID", { value: uuidFromRandomValues, configurable: true });
    }
  } catch {
    /* read-only crypto object: nothing more we can do */
  }
  patchStorage("localStorage");
  patchStorage("sessionStorage");
}

installRuntimePolyfills();
