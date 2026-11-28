/** Noto Serif Thai + IBM Plex Mono: the two extra fonts of styled text blocks (mock Upload). Loaded once, when needed. */
const HREF = "https://fonts.googleapis.com/css2?family=Noto+Serif+Thai:wght@300;400;700&family=IBM+Plex+Mono:wght@300;400;700&display=swap";

export function ensureTextFonts(): void {
  if (typeof document === "undefined" || document.querySelector(`link[data-sc-text-fonts]`)) return;
  const l = document.createElement("link");
  l.rel = "stylesheet";
  l.href = HREF;
  l.dataset.scTextFonts = "1";
  document.head.appendChild(l);
}
