/** Load brand fonts after first paint — avoids render-blocking CSS @import on mobile. */
const FONT_HREF =
  "https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Thai:wght@400;500;600&family=IBM+Plex+Sans+Thai+Looped:wght@400;500;600&display=swap";

let started = false;

export function loadBrandFonts() {
  if (started || typeof document === "undefined") return;
  started = true;

  const inject = () => {
    if (document.querySelector(`link[data-brand-fonts]`)) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = FONT_HREF;
    link.dataset.brandFonts = "1";
    document.head.appendChild(link);
  };

  const ric = window.requestIdleCallback?.bind(window);
  if (ric) {
    ric(() => inject(), { timeout: 2000 });
  } else {
    window.setTimeout(inject, 1);
  }
}
