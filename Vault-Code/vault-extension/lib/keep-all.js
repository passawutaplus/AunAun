/**
 * Keep All (phase 11.D): pure candidate filtering for the picker. No DOM, no network, never reads cross-origin pixels.
 * A candidate is { url, width, height, source: "img" | "picture" | "bg" | "poster", alt? } with natural sizes the page already reports.
 */
export const KEEP_ALL_MIN_EDGE = 400;
export const KEEP_ALL_MAX = 60;

// Size/format params that change between renditions of the SAME image (used for comparing, not for saving).
const SIZE_PARAMS = new Set(["w", "h", "width", "height", "size", "quality", "q", "fit", "fm", "format", "dpr", "auto", "crop", "resize", "ixlib", "s", "scale", "ssl"]);
const JUNK_NAME = /(?:^|[\/_.-])(sprite|icon|icons|logo|logos|avatar|avatars|pixel|spacer|tracking|beacon|blank|placeholder|emoji|badge|favicon|1x1|transparent)(?:[\/_.-]|$)/i;
const TRACKING_HOST = /(doubleclick|googlesyndication|google-analytics|googletagmanager|facebook\.com\/tr|px\.ads|adservice|scorecardresearch|quantserve|bat\.bing)/i;

/** Key for "same image at another size": host+path without WordPress "-300x200", "@2x" or size query params. */
export function imageKey(url) {
  try {
    const u = new URL(url);
    for (const k of [...u.searchParams.keys()]) if (SIZE_PARAMS.has(k.toLowerCase())) u.searchParams.delete(k);
    const path = u.pathname.replace(/-\d{2,4}x\d{2,4}(?=\.[a-z0-9]+$)/i, "").replace(/@\d+x(?=\.[a-z0-9]+$)/i, "").replace(/\/(?:resize|thumb|thumbs|cache)\/\d+x?\d*\//i, "/");
    const rest = [...u.searchParams.entries()].sort().map(([k, v]) => `${k}=${v}`).join("&");
    return `${u.hostname.toLowerCase().replace(/^www\./, "")}${path}${rest ? `?${rest}` : ""}`;
  } catch {
    return String(url || "");
  }
}

export function isJunkUrl(url) {
  const raw = String(url || "");
  if (!/^https?:\/\//i.test(raw)) return true; // data:, blob:, chrome-extension:, relative leftovers
  if (TRACKING_HOST.test(raw)) return true;
  if (/\.(svg|ico)(\?|$)/i.test(raw)) return true; // icons/sprites; real art is raster
  return JUNK_NAME.test(new URL(raw).pathname);
}

const area = c => (Number(c.width) || 0) * (Number(c.height) || 0);
const longEdge = c => Math.max(Number(c.width) || 0, Number(c.height) || 0);

/**
 * Filters + dedupes + caps. Returns { items, hiddenJunk, hiddenDup, capped }.
 * Each item: the best candidate for its key, plus { key, small (below minEdge: shown but off), kept (already in the Vault) }.
 * `keptKeys` is a Set of imageKey() values the user already kept.
 */
export function rankCandidates(candidates, { minEdge = KEEP_ALL_MIN_EDGE, max = KEEP_ALL_MAX, keptKeys = new Set() } = {}) {
  let hiddenJunk = 0, hiddenDup = 0;
  const byKey = new Map();
  for (const c of candidates || []) {
    if (!c || isJunkUrl(c.url)) { hiddenJunk++; continue; }
    // Unknown size (lazy image not loaded yet) is allowed through; known tiny ones are junk (tracking pixels, icons).
    if ((c.width || c.height) && longEdge(c) < 48) { hiddenJunk++; continue; }
    const key = imageKey(c.url);
    const cur = byKey.get(key);
    if (!cur) byKey.set(key, { ...c, key });
    else { hiddenDup++; if (area(c) > area(cur)) byKey.set(key, { ...c, key }); }
  }
  let items = [...byKey.values()].map(c => ({ ...c, small: longEdge(c) > 0 && longEdge(c) < minEdge, kept: keptKeys.has(c.key) }));
  items.sort((a, b) => Number(a.small) - Number(b.small) || area(b) - area(a));
  const capped = Math.max(0, items.length - max);
  items = items.slice(0, max);
  return { items, hiddenJunk, hiddenDup, capped };
}

/** The picker starts with every non-small, not-yet-kept image ticked. */
export function defaultSelection(items) {
  return items.filter(i => !i.small && !i.kept).map(i => i.key);
}

/** New collection name for a batch, from the page title (fallback host). */
export function collectionNameFor(title, host) {
  const t = String(title || "").replace(/\s+/g, " ").replace(/\s*[|–—-]\s*[^|–—-]{0,40}$/, "").trim();
  return (t || host || "Kept images").slice(0, 60);
}
