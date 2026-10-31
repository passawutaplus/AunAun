// Holds the pre-React brand screen (#boot in index.html) over the app until the first feed is ready,
// then fades it out. A timeout guarantees it can never stay up forever.
const MIN_VISIBLE_MS = 600;
const MAX_VISIBLE_MS = 4000;
const FADE_MS = 400;

let released = false;

export function releaseBoot(): void {
  if (released || typeof document === "undefined") return;
  released = true;
  const el = document.getElementById("boot");
  if (!el) return;
  const wait = Math.max(0, MIN_VISIBLE_MS - performance.now());
  window.setTimeout(() => {
    el.classList.add("boot-hide");
    window.setTimeout(() => el.remove(), FADE_MS + 50);
  }, wait);
}

/** Call once at startup: failsafe timeout, and non-feed routes show their own loader so release right away. */
export function installBootGate(): void {
  window.setTimeout(releaseBoot, MAX_VISIBLE_MS);
  if (window.location.pathname !== "/") requestAnimationFrame(() => requestAnimationFrame(releaseBoot));
}
