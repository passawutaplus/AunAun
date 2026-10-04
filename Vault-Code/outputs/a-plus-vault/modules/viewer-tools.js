/**
 * Image viewer helpers (phase 07), shared by the Discover detail and the My Vault detail.
 * Markup builders are pure strings; behaviours (copy hex, B&W, thirds, tag pins) are wired in app.js with delegated events.
 * Everything uses STORED palettes/tags: never pixels of a cross-origin image (canvas is blocked), no AI, no server call.
 */
import { esc, escA } from "./utils.js";

export const BW_KEY = "aplus-vault-viewer-bw";
export const LONG_PRESS_MS = 500;

const HEX = /^#[0-9a-f]{6}$/i;
const normHex = h => {
  const v = String(h || "").trim().toLowerCase();
  if (/^#[0-9a-f]{3}$/.test(v)) return "#" + v.slice(1).split("").map(c => c + c).join("");
  return HEX.test(v) ? v : "";
};

/** Palette as [{hex, pct}] from {palette:[{hex,pct}]} or a plain colours list (equal shares). Max 5. */
export function paletteList(source) {
  const rich = Array.isArray(source?.palette) ? source.palette : null;
  let list = rich
    ? rich.map(p => ({ hex: normHex(p?.hex), pct: Number(p?.pct) > 0 ? Number(p.pct) : 0 })).filter(p => p.hex)
    : [];
  if (!list.length) {
    const colors = (Array.isArray(source?.colors) ? source.colors : []).map(normHex).filter(Boolean);
    list = colors.map(hex => ({ hex, pct: 0 }));
  }
  list = list.slice(0, 5);
  const total = list.reduce((n, p) => n + p.pct, 0);
  return list.map(p => ({ hex: p.hex, share: total > 0 ? p.pct / total : 1 / Math.max(1, list.length) }));
}

/** Dark, low-saturation variant of a colour for the ambient backdrop (white text on it stays >= 4.5:1). */
export function ambientColor(hex) {
  const h = normHex(hex);
  if (!h) return "";
  const r = parseInt(h.slice(1, 3), 16) / 255, g = parseInt(h.slice(3, 5), 16) / 255, b = parseInt(h.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  let hue = 0;
  if (d) {
    if (max === r) hue = ((g - b) / d) % 6; else if (max === g) hue = (b - r) / d + 2; else hue = (r - g) / d + 4;
    hue = (hue * 60 + 360) % 360;
  }
  const l = (max + min) / 2;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  return `hsl(${Math.round(hue)} ${Math.round(Math.min(s, 0.45) * 100)}% 11%)`;
}

/** Index of the most prominent non-neutral swatch (falls back to the largest). */
export function dominantSwatch(list) {
  if (!list.length) return null;
  const vivid = list.filter(p => {
    const r = parseInt(p.hex.slice(1, 3), 16), g = parseInt(p.hex.slice(3, 5), 16), b = parseInt(p.hex.slice(5, 7), 16);
    return Math.max(r, g, b) - Math.min(r, g, b) > 24;
  });
  return (vivid.length ? vivid : list).reduce((a, b) => (b.share > a.share ? b : a));
}

/** Swatch widths follow their share; tap = copy hex; a separate action finds images with that colour. */
export function paletteStripMarkup(list, { find = true } = {}) {
  if (!list.length) return "";
  const swatches = list
    .map(p => `<button type='button' class='viewer-swatch' data-viewer-copy='${escA(p.hex)}' style='flex:${Math.max(0.08, p.share).toFixed(3)} 1 0;background:${escA(p.hex)}' aria-label='${escA("Copy " + p.hex)}' title='${escA(p.hex)}'><span class='viewer-swatch-hex'>${esc(p.hex)}</span></button>`)
    .join("");
  const action = find ? `<button type='button' class='viewer-find-color' data-viewer-find-color hidden>Find images with this color</button>` : "";
  return `<div class='viewer-palette' aria-label='Color palette'><div class='viewer-palette-strip' role='group'>${swatches}</div><div class='viewer-palette-status' aria-live='polite' data-viewer-palette-status></div>${action}</div>`;
}

export function viewerToolsMarkup({ bw = false, grid = false } = {}) {
  return `<div class='viewer-tools'><button type='button' class='viewer-tool' data-viewer-bw aria-pressed='${bw ? "true" : "false"}' title='Black and white (B)'>B&amp;W</button><button type='button' class='viewer-tool' data-viewer-grid aria-pressed='${grid ? "true" : "false"}' title='Composition grid'>Thirds</button><span class='viewer-hint'>Hold the image to see its color</span></div>`;
}

/** Taxonomy chips: tap = pin (aria-pressed), long-press = exclude. `labelOf` is null until the taxonomy has loaded. */
export function tagChipsMarkup(ids, labelOf, { pinned = [], excluded = [], limit = 12 } = {}) {
  if (!labelOf || !Array.isArray(ids) || !ids.length) return "";
  const chips = ids
    .slice(0, limit)
    .map(id => {
      const isPinned = pinned.includes(id), isExcluded = excluded.includes(id);
      return `<button type='button' class='tag viewer-tag${isExcluded ? " is-excluded" : ""}' data-viewer-tag='${escA(id)}' aria-pressed='${isPinned ? "true" : "false"}' aria-label='${escA(labelOf(id) + (isExcluded ? " (excluded)" : ""))}'>${esc(labelOf(id))}</button>`;
    })
    .join("");
  const n = pinned.length + excluded.length;
  return `<div class='viewer-tags' data-viewer-tags><div class='tag-row'>${chips}</div><button type='button' class='ghost-button viewer-search-tags'${n ? "" : " hidden"} data-viewer-search-tags>Search with selected tags (${n})</button></div>`;
}

/** Search text for the pinned/excluded tags, in the parser's own syntax (#word / "no word"). */
export function selectedTagsQuery(pinned, excluded, termById) {
  const word = id => {
    const t = termById.get(id);
    return t ? (t.en[0] || t.th[0] || "").toLowerCase().replace(/\s+/g, "") : "";
  };
  const plus = pinned.map(id => word(id)).filter(Boolean).map(w => "#" + w);
  const minus = excluded.map(id => word(id)).filter(Boolean).map(w => "no " + w);
  return [...plus, ...minus].join(" ").trim();
}

export function readBw() {
  try { return localStorage.getItem(BW_KEY) === "1"; } catch { return false; }
}
export function writeBw(on) {
  try { localStorage.setItem(BW_KEY, on ? "1" : "0"); } catch { /* private mode */ }
}

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      ta.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

/** Breadcrumb "search › similar #3 › this image": each step is tappable to go back. */
export function trailMarkup(trail) {
  if (!Array.isArray(trail) || trail.length < 2) return "";
  const last = trail.length - 1;
  return `<nav class='viewer-trail' aria-label='Where you came from'>${trail
    .map((t, i) => (i === last ? `<span aria-current='page'>${esc(t.label)}</span>` : `<button type='button' data-viewer-trail='${i}'>${esc(t.label)}</button>`))
    .join("<span aria-hidden='true'> › </span>")}</nav>`;
}

/** Horizontal "continue from this image" strip. */
export function continueStripMarkup(items, mediaUrl) {
  return items
    .map(it => `<button type='button' class='discover-similar-item' data-discover-open='${escA(it.id)}' data-viewer-from='continue' title='${escA(it.title || "Untitled")}'><img src='${escA(mediaUrl(it.image_sm_path))}' alt='${escA(it.title || "")}' loading='lazy' decoding='async'></button>`)
    .join("");
}

export function continueTabsMarkup(mode) {
  const tab = (m, label) => `<button type='button' class='viewer-continue-tab' role='tab' data-viewer-continue='${m}' aria-selected='${mode === m ? "true" : "false"}'>${label}</button>`;
  return `<div class='viewer-continue-tabs' role='tablist' aria-label='Continue from this image'>${tab("similar", "Similar")}${tab("opposite", "Opposite")}</div>`;
}
