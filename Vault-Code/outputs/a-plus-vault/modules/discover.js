import { ambientColor, continueTabsMarkup, dominantSwatch, paletteList, paletteStripMarkup, tagChipsMarkup, trailMarkup, viewerToolsMarkup } from "./viewer-tools.js";
import { esc, escA } from "./utils.js";
import { hasThai, thaiConcepts } from "./thai-search.js";
import {
  COLOR_MATCH_MIN, DISCOVER_FACET_KEYS, DISCOVER_SHAPES, DISCOVER_TONES, MAX_SEARCH_COLORS,
  hsvToHex, materialsFrom, matchesShape, normalizeHex, paletteTones, rankSimilar, scoreColorSet,
} from "./discover-search.js";

export { COLOR_MATCH_MIN, hexToHsv, hsvToHex, normalizeHex, scoreColors } from "./discover-search.js";

export const DISCOVER_PAGE_SIZE = 30;
export const DISCOVER_MEDIA_BUCKET = "discover-media";
export const DISCOVER_PENDING_KEY = "aplus-vault-pending-action";

export const DISCOVER_CATEGORIES = [
  ["all", "All"],
  ["poster", "Poster"],
  ["typography", "Typography"],
  ["illustration", "Illustration"],
  ["textile", "Textile"],
  ["ceramic", "Ceramic"],
  ["furniture", "Furniture"],
  ["architecture", "Architecture"],
  ["photography", "Photography"],
  ["print", "Print"],
  ["pattern", "Pattern"],
];

const LICENSE_LABELS = { cc0: "CC0 Public Domain", pdm: "Public Domain Mark", "cc-by": "CC BY", "cc-by-sa": "CC BY-SA" };

const DISCOVER_COLUMNS = [
  "id", "source", "source_url", "title", "license", "license_url", "attribution", "attribution_json",
  "image_sm_path", "image_md_path", "image_lg_path", "blurhash", "width", "height", "phash",
  "category", "tags", "style", "colors", "source_meta", "published_at", "palette", "tags_ids",
].join(",");

// Client-side ranking scans the newest N rows; move to an RPC once the catalog outgrows this.
const SCAN_LIMIT = 300;
const MAX_FACETS = 4;
const MAX_TERMS = 4;
const COLOR_WHEEL = "conic-gradient(#ff3b30, #ffcc00, #34c759, #32ade6, #5856d6, #ff2d55, #ff3b30)";
const MEMO_TTL_MS = 60_000;
const MEMO_MAX = 24;
const memo = new Map();
let edgeApi = true;

export function createDiscoverState() {
  return {
    items: [], loading: false, loaded: false, done: false, error: "",
    category: "all", q: "", colors: [], tone: null, shape: null, facets: [], similar: null,
    colorOpen: false, picker: { h: 0, s: 0, v: 0 }, openId: null, pool: null,
  };
}

export function discoverHasClientFilters(ds) {
  return !!(ds.colors?.length || ds.tone || ds.shape || ds.similar);
}

export function discoverHasFilters(ds) {
  return !!(ds.q || (ds.category && ds.category !== "all") || ds.facets?.length || discoverHasClientFilters(ds));
}

function restBase(config) {
  return String(config?.supabaseUrl || "").replace(/\/$/, "");
}

export function discoverEnabled(config) {
  return !!restBase(config) && !!config?.supabasePublishableKey;
}

export function discoverMediaUrl(config, path) {
  const clean = String(path || "").replace(/^\/+/, "");
  if (!clean) return "";
  return `${restBase(config)}/storage/v1/object/public/${DISCOVER_MEDIA_BUCKET}/${clean.split("/").map(encodeURIComponent).join("/")}`;
}

export function safeHttpsUrl(value) {
  try {
    const url = new URL(String(value || ""));
    return url.protocol === "https:" ? url.href : "";
  } catch (e) {
    return "";
  }
}

function searchTerms(q) {
  return String(q || "").toLowerCase().replace(/[^\p{L}\p{M}\p{N}\s-]/gu, " ").replace(/\s+/g, " ").trim().slice(0, 60)
    .split(" ").filter(Boolean).slice(0, MAX_TERMS);
}

function quoted(value) {
  return `"${String(value).replace(/[\\"]/g, m => "\\" + m)}"`;
}

export function normalizeFacet(facet) {
  const key = String(facet?.key || "");
  const value = String(facet?.value || "").trim().slice(0, 120);
  if (!DISCOVER_FACET_KEYS[key] || !value) return null;
  return { key, value };
}

function facetCondition(facet) {
  const field = facet.key === "artist" ? "attribution_json->>artist" : `source_meta->>${facet.key}`;
  if (facet.key === "medium") return `${field}.ilike.${quoted(`*${facet.value}*`)}`;
  return `${field}.eq.${quoted(facet.value)}`;
}

export function discoverQueryString({ category = "all", q = "", facets = [], after = null, limit = DISCOVER_PAGE_SIZE } = {}) {
  const params = new URLSearchParams();
  params.set("select", DISCOVER_COLUMNS);
  params.set("status", "eq.published");
  if (category && category !== "all") params.set("category", `eq.${category}`);
  const conditions = [];
  searchTerms(q).forEach(term => {
    // Thai words search their English variants; the library is tagged in English.
    const groups = hasThai(term) ? thaiConcepts(term) : [];
    if (groups.length) {
      groups.slice(0, MAX_TERMS).forEach(variants => {
        const likes = variants.map(v => `search_text.ilike.${quoted(`*${v}*`)}`).join(",");
        conditions.push(`or(${likes},tags.ov.{${variants.map(quoted).join(",")}})`);
      });
      return;
    }
    const like = quoted(`*${term}*`);
    conditions.push(`or(search_text.ilike.${like},tags.cs.{${quoted(term)}})`);
  });
  (facets || []).map(normalizeFacet).filter(Boolean).slice(0, MAX_FACETS).forEach(f => conditions.push(facetCondition(f)));
  if (after && after.published_at && after.id) {
    conditions.push(`or(published_at.lt."${after.published_at}",and(published_at.eq."${after.published_at}",id.lt.${after.id}))`);
  }
  if (conditions.length) params.set("and", `(${conditions.join(",")})`);
  params.set("order", "published_at.desc,id.desc");
  params.set("limit", String(limit));
  return params.toString();
}

async function readRows(response) {
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch (e) {
    data = null;
  }
  if (!response.ok) throw new Error(data?.message || "Discover is unavailable right now.");
  return Array.isArray(data) ? data : [];
}

/** Prefers the CDN-cached `/api/discover`; falls back to PostgREST where that route is absent. */
async function fetchRows(config, query) {
  if (edgeApi) {
    try {
      const response = await fetch(`/api/discover?${query}`, { headers: { accept: "application/json" } });
      if (response.ok || (response.status >= 400 && response.status < 500 && response.status !== 404)) return await readRows(response);
      if (response.status === 404) edgeApi = false;
    } catch (e) {}
  }
  const key = String(config.supabasePublishableKey || "");
  return readRows(await fetch(`${restBase(config)}/rest/v1/discover_items?${query}`, {
    headers: { apikey: key, authorization: `Bearer ${key}`, accept: "application/json" },
  }));
}

async function restGet(config, query) {
  const hit = memo.get(query);
  if (hit && Date.now() - hit.at < MEMO_TTL_MS) return hit.rows;
  const rows = await fetchRows(config, query);
  if (memo.size >= MEMO_MAX) memo.delete(memo.keys().next().value);
  memo.set(query, { rows, at: Date.now() });
  return rows;
}

/** Colors, tone, shape and similarity are ranked here over a scan of server-filtered rows. */
export function applyClientFilters(rows, opts) {
  const colors = (opts.colors || []).map(normalizeHex).filter(Boolean).slice(0, MAX_SEARCH_COLORS);
  let list = rows;
  if (opts.shape) list = list.filter(row => matchesShape(opts.shape, row));
  if (opts.tone) list = list.filter(row => paletteTones(row.colors).has(opts.tone));
  if (colors.length) {
    list = list
      .map(row => ({ row, score: scoreColorSet(colors, row.colors) }))
      .filter(entry => entry.score >= COLOR_MATCH_MIN)
      .sort((a, b) => b.score - a.score)
      .map(entry => entry.row);
  }
  if (opts.similar?.ref) list = rankSimilar(opts.similar.ref, list);
  return list;
}

export async function fetchDiscoverPool(config) {
  if (!discoverEnabled(config)) return [];
  return restGet(config, discoverQueryString({ limit: SCAN_LIMIT }));
}

// ---------------------------------------------------------------- phase 10: anonymous learning signals (Discover only)
const SID_KEY = "aplus-vault-sid";
let lastSearchEventId = null;

/** Random per-TAB id in sessionStorage: not a cookie, not the user id, rotates with the tab. */
export function discoverSessionId() {
  try {
    let sid = sessionStorage.getItem(SID_KEY);
    if (!sid) {
      const alphabet = "abcdefghijkmnpqrstuvwxyz23456789";
      const bytes = crypto.getRandomValues(new Uint8Array(16));
      sid = "s-" + Array.from(bytes, b => alphabet[b % alphabet.length]).join("");
      sessionStorage.setItem(SID_KEY, sid);
    }
    return sid;
  } catch {
    return null;
  }
}

const optedOutOfSignals = () => navigator.doNotTrack === "1" || navigator.globalPrivacyControl === true;

export async function sendDiscoverSignal(payload, { fetchImpl = globalThis.fetch } = {}) {
  try {
    if (optedOutOfSignals() || !fetchImpl) return null;
    const sid = discoverSessionId();
    if (!sid) return null;
    const res = await fetchImpl("/api/signal", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ sid, ...payload }), keepalive: true });
    return res.status === 200 ? await res.json().catch(() => null) : null;
  } catch {
    return null;
  }
}

/** Open / save of a Discover image, tied to the search that showed it (position = index in the results). */
export function signalItem(type, itemId, position = null, tagIds = null) {
  return sendDiscoverSignal({ type, itemId, tagIds, position, searchEventId: lastSearchEventId });
}

async function reportSearch(q, rows, body) {
  const res = await sendDiscoverSignal({ type: "search", q, count: body.total ?? rows.length, relaxed: body.relaxed === true });
  lastSearchEventId = res && Number.isInteger(res.id) ? res.id : null;
  sendDiscoverSignal({ type: "views", ids: rows.slice(0, 30).map(r => r.id), searchEventId: lastSearchEventId });
}

/** Engine search (phase 06): sentence parser + ranking on the server. Null on any problem so the caller falls back to keywords. */
export async function fetchEngineSearch(q, { fetchImpl = globalThis.fetch } = {}) {
  try {
    const res = await fetchImpl(`/api/search?q=${encodeURIComponent(String(q).slice(0, 600))}&limit=60`, { headers: { accept: "application/json" } });
    if (!res.ok) return null;
    const body = await res.json();
    if (!body || !body.success || !Array.isArray(body.items)) return null;
    reportSearch(String(q), body.items, body);
    return { rows: body.items, chips: Array.isArray(body.chips) ? body.chips : [] };
  } catch {
    return null;
  }
}

const SEEN_KEY = "aplus-vault-discover-seen";
const SEEN_DAYS = 14;

function readSeen() {
  try {
    const raw = JSON.parse(localStorage.getItem(SEEN_KEY) || "{}");
    const cutoff = Date.now() - SEEN_DAYS * 86400000;
    return Object.fromEntries(Object.entries(raw).filter(([, ts]) => Number(ts) > cutoff));
  } catch {
    return {};
  }
}

/** Remember what this visitor already saw (local only) so the daily feed shows other things first next time. */
export function markDiscoverSeen(ids) {
  try {
    const seen = readSeen();
    const now = Date.now();
    for (const id of ids || []) if (/^[0-9a-f-]{36}$/i.test(String(id))) seen[String(id).slice(0, 8)] = now;
    const keys = Object.keys(seen);
    if (keys.length > 300) keys.sort((a, b) => seen[a] - seen[b]).slice(0, keys.length - 300).forEach(k => delete seen[k]);
    localStorage.setItem(SEEN_KEY, JSON.stringify(seen));
  } catch { /* private mode: no demotion, nothing breaks */ }
}

/** Daily rotated feed from the server. Null on any problem so the caller falls back to newest-first. */
export async function fetchFeed({ category = "all", offset = 0, limit = DISCOVER_PAGE_SIZE, fetchImpl = globalThis.fetch } = {}) {
  try {
    const seen = offset === 0 ? Object.keys(readSeen()).slice(0, 120) : [];
    const params = new URLSearchParams({ offset: String(offset), limit: String(limit) });
    if (category && category !== "all") params.set("category", category);
    if (seen.length) params.set("s", seen.join(","));
    const res = await fetchImpl(`/api/feed?${params}`, { headers: { accept: "application/json" } });
    if (!res.ok) return null;
    const body = await res.json();
    if (!body || !body.success || !Array.isArray(body.items)) return null;
    return { rows: body.items, nextOffset: body.nextOffset, seenPrefixes: seen };
  } catch {
    return null;
  }
}

export async function fetchDiscoverPage(config, opts = {}) {
  if (!discoverEnabled(config)) throw new Error("Discover is not configured.");
  if (!opts.q && !opts.similar && !discoverHasClientFilters(opts) && !(opts.facets || []).length) {
    const offset = Number(opts.loaded) || 0;
    const feed = await fetchFeed({ category: opts.category, offset });
    if (feed && feed.rows.length) {
      if (offset === 0) markDiscoverSeen(feed.rows.slice(0, 24).map(r => r.id));
      return { rows: feed.rows, done: feed.nextOffset == null, chips: [] };
    }
  }
  if (opts.q && String(opts.q).trim().length >= 2 && !opts.similar && !opts.after) {
    const eng = await fetchEngineSearch(opts.q);
    if (eng && eng.rows.length) {
      let rows = eng.rows;
      if (opts.category && opts.category !== "all") rows = rows.filter(r => r.category === opts.category);
      if (discoverHasClientFilters(opts)) rows = applyClientFilters(rows, opts);
      return { rows, done: true, chips: eng.chips };
    }
  }
  if (discoverHasClientFilters(opts)) {
    const rows = await restGet(config, discoverQueryString(Object.assign({}, opts, { after: null, limit: SCAN_LIMIT })));
    return { rows: applyClientFilters(rows, opts), done: true, chips: [] };
  }
  const limit = opts.limit || DISCOVER_PAGE_SIZE;
  const rows = await restGet(config, discoverQueryString(Object.assign({}, opts, { limit })));
  return { rows, done: rows.length < limit, chips: [] };
}

export async function fetchDiscoverItem(config, id) {
  if (!discoverEnabled(config) || !/^[0-9a-f-]{36}$/i.test(String(id || ""))) return null;
  const params = new URLSearchParams({ select: DISCOVER_COLUMNS, status: "eq.published", id: `eq.${id}`, limit: "1" });
  const rows = await restGet(config, params.toString());
  return rows[0] || null;
}

const BLURHASH_CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz#$%*+,-.:;=?@[]^_{|}~";

function decode83(str) {
  let value = 0;
  for (const ch of str) {
    const digit = BLURHASH_CHARS.indexOf(ch);
    if (digit < 0) throw new Error("bad blurhash");
    value = value * 83 + digit;
  }
  return value;
}

function sRGBToLinear(value) {
  const v = value / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

function linearTosRGB(value) {
  const v = Math.max(0, Math.min(1, value));
  return v <= 0.0031308 ? Math.round(v * 12.92 * 255 + 0.5) : Math.round((1.055 * Math.pow(v, 1 / 2.4) - 0.055) * 255 + 0.5);
}

function signPow(value, exp) {
  return Math.sign(value) * Math.pow(Math.abs(value), exp);
}

export function decodeBlurhash(hash, width, height) {
  if (!hash || hash.length < 6) throw new Error("bad blurhash");
  const sizeFlag = decode83(hash[0]);
  const numY = Math.floor(sizeFlag / 9) + 1;
  const numX = (sizeFlag % 9) + 1;
  if (hash.length !== 4 + 2 * numX * numY) throw new Error("bad blurhash");
  const maxValue = (decode83(hash[1]) + 1) / 166;
  const colors = new Array(numX * numY);
  for (let i = 0; i < colors.length; i++) {
    if (i === 0) {
      const value = decode83(hash.substring(2, 6));
      colors[i] = [sRGBToLinear(value >> 16), sRGBToLinear((value >> 8) & 255), sRGBToLinear(value & 255)];
    } else {
      const value = decode83(hash.substring(4 + i * 2, 6 + i * 2));
      const q = [Math.floor(value / 361), Math.floor(value / 19) % 19, value % 19];
      colors[i] = q.map(v => signPow((v - 9) / 9, 2) * maxValue);
    }
  }
  const pixels = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0, g = 0, b = 0;
      for (let j = 0; j < numY; j++) {
        for (let i = 0; i < numX; i++) {
          const basis = Math.cos((Math.PI * x * i) / width) * Math.cos((Math.PI * y * j) / height);
          const color = colors[i + j * numX];
          r += color[0] * basis;
          g += color[1] * basis;
          b += color[2] * basis;
        }
      }
      const idx = 4 * (x + y * width);
      pixels[idx] = linearTosRGB(r);
      pixels[idx + 1] = linearTosRGB(g);
      pixels[idx + 2] = linearTosRGB(b);
      pixels[idx + 3] = 255;
    }
  }
  return pixels;
}

const blurCache = new Map();

export function blurhashDataUrl(hash) {
  if (!hash || typeof document === "undefined") return "";
  if (blurCache.has(hash)) return blurCache.get(hash);
  let url = "";
  try {
    const size = 24;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    const image = ctx.createImageData(size, size);
    image.data.set(decodeBlurhash(hash, size, size));
    ctx.putImageData(image, 0, 0);
    url = canvas.toDataURL("image/png");
  } catch (e) {
    url = "";
  }
  blurCache.set(hash, url);
  return url;
}

function attributionInfo(item) {
  const json = item && typeof item.attribution_json === "object" && item.attribution_json ? item.attribution_json : {};
  return {
    artist: String(json.artist || "").trim(),
    date: String(json.date || "").trim(),
    institution: String(json.institution || "").trim(),
    institutionUrl: safeHttpsUrl(json.institution_url),
    creditLine: String(json.credit_line || "").trim(),
  };
}

/** One-line terms shown next to the license badge. CC BY / BY-SA make the credit a condition, not a courtesy. */
export function discoverLicenseNote(license) {
  const key = String(license || "").toLowerCase();
  if (key === "cc-by") return "Free to use with credit (required).";
  if (key === "cc-by-sa") return "Free to use with credit (required); adaptations must use the same license.";
  return "Free to use.";
}

export function discoverLicenseLabel(license) {
  return LICENSE_LABELS[String(license || "").toLowerCase()] || String(license || "").toUpperCase();
}

function categoryLabel(category) {
  const hit = DISCOVER_CATEGORIES.find(c => c[0] === category);
  return hit ? hit[1] : String(category || "");
}

function aspect(item) {
  const w = Number(item.width) || 4;
  const h = Number(item.height) || 5;
  return `${w} / ${h}`;
}

function aspectRatio(item) {
  const w = Number(item.width) || 4;
  const h = Number(item.height) || 5;
  return Math.round((w / h) * 1000) / 1000;
}

const SHAPE_ICON_RECTS = {
  landscape: [3, 6, 18, 12],
  portrait: [6, 3, 12, 18],
  square: [4.5, 4.5, 15, 15],
  wide: [1.5, 8, 21, 8],
};

function shapeIcon(value) {
  const [x, y, w, h] = SHAPE_ICON_RECTS[value] || SHAPE_ICON_RECTS.square;
  return `<svg viewBox='0 0 24 24' width='22' height='22' aria-hidden='true'><rect x='${x}' y='${y}' width='${w}' height='${h}' rx='2' fill='none' stroke='currentColor' stroke-width='1.6'/></svg>`;
}

function shapeChipGroup(active) {
  return `<div class='discover-filter-group'><span class='discover-filter-label'>Shape</span><div class='discover-filter-chips discover-shape-chips'>${DISCOVER_SHAPES.map(([value, text]) => `<button type='button' class='discover-filter-chip discover-shape-chip${active === value ? " is-active" : ""}' data-discover-shape='${escA(value)}' aria-pressed='${active === value}'>${shapeIcon(value)}<span>${esc(text)}</span></button>`).join("")}</div></div>`;
}

function chipGroup(label, attr, options, active) {
  return `<div class='discover-filter-group'><span class='discover-filter-label'>${label}</span><div class='discover-filter-chips'>${options.map(([value, text]) => `<button type='button' class='discover-filter-chip${active === value ? " is-active" : ""}' ${attr}='${escA(value)}' aria-pressed='${active === value}'>${esc(text)}</button>`).join("")}</div></div>`;
}

export function discoverColorPanelMarkup(ds) {
  const p = ds.picker;
  const preview = hsvToHex(p.h, p.s, p.v);
  const colors = ds.colors || [];
  const full = colors.length >= MAX_SEARCH_COLORS;
  const picked = colors.length
    ? `<div class='discover-color-picked'>${colors.map((hex, i) => `<button type='button' class='discover-color-chip' data-discover-color-remove='${i}' aria-label='${escA("Remove color " + hex)}' title='Remove'><span style='background:${escA(hex)}'></span>${esc(hex)}<b aria-hidden='true'>&times;</b></button>`).join("")}</div>`
    : `<p class='discover-color-tip'>Pick up to ${MAX_SEARCH_COLORS} colors. Images must contain all of them.</p>`;
  return `<div class='discover-color-panel' data-discover-color-panel role='dialog' aria-label='Color, tone and shape'><div class='discover-filter-group'><span class='discover-filter-label'>Colors</span>${picked}</div><div class='discover-color-sv' data-discover-color-sv role='slider' tabindex='0' aria-label='Saturation and brightness' aria-valuemin='0' aria-valuemax='100' aria-valuenow='${Math.round(p.s)}' style='background-color:hsl(${Math.round(p.h)} 100% 50%)'><span class='discover-color-thumb' data-discover-color-thumb style='left:${p.s}%;top:${100 - p.v}%;background:${preview}'></span></div><input class='discover-color-hue' data-discover-color-hue type='range' min='0' max='360' value='${Math.round(p.h)}' aria-label='Hue'><div class='discover-color-row'><span class='discover-color-preview' data-discover-color-preview style='background:${preview}'></span><input class='discover-color-hex' data-discover-color-hex value='${escA(preview)}' aria-label='Hex color' spellcheck='false' maxlength='7'><button type='button' class='discover-color-apply' data-discover-color-apply${full ? " disabled" : ""}>${full ? "Max 3" : "Add color"}</button></div>${chipGroup("Tone", "data-discover-tone", DISCOVER_TONES, ds.tone)}${shapeChipGroup(ds.shape)}${colors.length || ds.tone || ds.shape ? `<button type='button' class='discover-color-clear' data-discover-color-clear>Clear colors, tone &amp; shape</button>` : ""}</div>`;
}

function searchSwatch(ds) {
  const colors = ds.colors || [];
  if (!colors.length) return COLOR_WHEEL;
  if (colors.length === 1) return colors[0];
  const step = 100 / colors.length;
  return `conic-gradient(${colors.map((c, i) => `${c} ${i * step}% ${(i + 1) * step}%`).join(", ")})`;
}

export function discoverSearchMarkup(ds) {
  const active = !!((ds.colors || []).length || ds.tone || ds.shape);
  const imageIcon = `<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' aria-hidden='true'><rect x='3' y='5' width='18' height='14' rx='2'/><circle cx='9' cy='10' r='1.6'/><path d='m21 16-5-5-9 8'/></svg>`;
  return `<form class='discover-top-search' data-discover-search role='search'><span class='discover-top-search-icon' aria-hidden='true'><svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round'><circle cx='11' cy='11' r='7'/><path d='m16 16 4 4'/></svg></span><input name='q' type='search' value='${escA(ds.q)}' placeholder='Search title, material, culture, place…' aria-label='Search Discover' maxlength='60' autocomplete='off'><label class='discover-image-button${ds.similar && !ds.similar.id ? " is-active" : ""}' title='Find similar by image (stays on your device)'><input type='file' accept='image/*' data-discover-image hidden><span class='sr-only'>Find similar by image</span>${imageIcon}</label><div class='discover-color-wrap'><button type='button' class='discover-color-button${active ? " is-active" : ""}' data-discover-color-toggle aria-label='Color, tone and shape' aria-expanded='${ds.colorOpen}' aria-pressed='${active}'><span style='background:${escA(searchSwatch(ds))}'></span></button>${ds.colorOpen ? discoverColorPanelMarkup(ds) : ""}</div></form>`;
}

function shapeLabel(value) {
  return (DISCOVER_SHAPES.find(s => s[0] === value) || [, value])[1];
}

function toneLabel(value) {
  return (DISCOVER_TONES.find(s => s[0] === value) || [, value])[1];
}

export function discoverActiveFiltersMarkup(ds) {
  if (!discoverHasFilters(ds)) return "";
  const chip = (unset, body, label) => `<button type='button' class='discover-active-chip' data-discover-unset='${escA(unset)}' aria-label='${escA("Remove " + label)}'>${body}<b aria-hidden='true'>&times;</b></button>`;
  const chips = [];
  if (ds.similar) chips.push(chip("similar", `${ds.similar.thumb ? `<img src='${escA(ds.similar.thumb)}' alt=''>` : ""}<span>Similar to <strong>${esc(ds.similar.title || "image")}</strong></span>`, "similar search"));
  if (ds.q) chips.push(chip("q", `<span>“${esc(ds.q)}”</span>`, "search text"));
  // Understanding chips: display-only, what the engine read from the sentence (no labels, no feedback buttons).
  (ds.chips || []).forEach(c => chips.push(`<span class='discover-understood kind-${escA(c.kind)}'>${c.kind === "color" ? `<i style='background:${escA(c.label)}'></i>` : ""}${c.kind === "exclude" ? "<s>" : ""}${esc(c.label)}${c.kind === "exclude" ? "</s>" : ""}</span>`));
  if (ds.category && ds.category !== "all") chips.push(chip("category", `<span>${esc(categoryLabel(ds.category))}</span>`, "category"));
  (ds.facets || []).forEach((f, i) => chips.push(chip(`facet:${i}`, `<span>${esc(DISCOVER_FACET_KEYS[f.key] || f.key)}: <strong>${esc(f.value)}</strong></span>`, f.value)));
  (ds.colors || []).forEach((hex, i) => chips.push(chip(`color:${i}`, `<i style='background:${escA(hex)}'></i><span>${esc(hex)}</span>`, "color " + hex)));
  if (ds.tone) chips.push(chip("tone", `<span>Tone: <strong>${esc(toneLabel(ds.tone))}</strong></span>`, "tone"));
  if (ds.shape) chips.push(chip("shape", `<span>Shape: <strong>${esc(shapeLabel(ds.shape))}</strong></span>`, "shape"));
  const count = ds.loaded && !ds.loading && ds.done ? `<span class='discover-active-count'>${ds.items.length} ${ds.items.length === 1 ? "result" : "results"}</span>` : "";
  return `<div class='discover-active' aria-label='Active filters'>${chips.join("")}<button type='button' class='discover-active-clear' data-discover-clear-all>Clear all</button>${count}</div>`;
}

let keepTargetLabel = "My Vault";

/** Label of the collection that the card "+ Keep" button saves into. */
export function setDiscoverKeepTargetLabel(label) {
  keepTargetLabel = String(label || "My Vault").slice(0, 40);
}

export function discoverKeepTargetMenuMarkup(options, currentId, creating) {
  const row = (id, name, depth) => `<button type='button' role='option' class='discover-target-option${id === currentId ? " is-current" : ""}' data-discover-target='${escA(id)}' style='--depth:${depth ? 1 : 0}' aria-selected='${id === currentId}'><span>${esc(name)}</span>${id === currentId ? "<i aria-hidden='true'>✓</i>" : ""}</button>`;
  const foot = creating
    ? `<form class='discover-target-new-form' data-discover-target-new-form><input name='name' type='text' placeholder='Collection name' maxlength='60' autocomplete='off' required aria-label='New collection name'><button type='submit'>Create</button></form>`
    : `<button type='button' class='discover-target-new' data-discover-target-new>+ New collection</button>`;
  return `<div class='discover-target-menu' role='listbox' aria-label='Save to'><p>Save to</p>${row("", "My Vault", 0)}${options.map(o => row(o.id, o.name, o.depth)).join("")}${foot}</div>`;
}

export function discoverCardMarkup(item, config, kept) {
  const info = attributionInfo(item);
  const sm = discoverMediaUrl(config, item.image_sm_path);
  const md = discoverMediaUrl(config, item.image_md_path);
  const blur = blurhashDataUrl(item.blurhash);
  const style = `aspect-ratio:${aspect(item)};${blur ? `background-image:url(${blur})` : ""}`;
  return `<article class='discover-card' style='${escA(style)}'><button type='button' class='discover-card-open' data-discover-open='${escA(item.id)}' aria-label='${escA("Open " + (item.title || "artwork"))}'><img src='${escA(md)}' srcset='${escA(sm)} 400w, ${escA(md)} 800w' sizes='(max-width: 560px) 50vw, (max-width: 1100px) 33vw, 20vw' alt='${escA(item.title || "")}' loading='lazy' decoding='async'><span class='discover-card-caption'><span class='discover-card-title'>${esc(item.title || "Untitled")}</span><span class='discover-card-credit'>${esc(info.institution || info.artist)}</span></span></button><button type='button' class='discover-target' data-discover-target-toggle aria-haspopup='listbox' title='Choose where + Keep saves'><span class='discover-target-label'>${esc(keepTargetLabel)}</span><svg viewBox='0 0 24 24' width='14' height='14' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' aria-hidden='true'><path d='m6 9 6 6 6-6'/></svg></button><button type='button' class='discover-keep${kept ? " is-kept" : ""}' data-discover-keep='${escA(item.id)}' title='${kept ? "In your Vault. Add to a collection" : "Keep in your Vault"}'>${kept ? "Kept" : "+ Keep"}</button></article>`;
}

function emptyMessage(ds) {
  if (ds.similar) return "No similar images yet. Try another image.";
  if ((ds.colors || []).length > 1) return "No image has all of these colors. Remove one to widen the search.";
  if ((ds.colors || []).length) return "No images close to this color yet. Try another shade.";
  if (discoverHasFilters(ds)) return "No matches yet. Remove a filter or try another word.";
  return "Discover is being curated. Check back soon.";
}

export function discoverGridMarkup(ds, config, keptIds) {
  return discoverActiveFiltersMarkup(ds) + discoverResultsMarkup(ds, config, keptIds);
}

let guestMode = false;
const GUEST_FREE_ITEMS = 20;

/** Guests see the first screens of results; the rest is blurred behind a log-in prompt. */
export function setDiscoverGuest(value) {
  guestMode = !!value;
}

function gateMarkup() {
  const th = /^th/i.test(navigator.language || "");
  return `<div class='discover-gate'><div class='discover-gate-card'>${th ? "<span class='discover-gate-eyebrow'>ดูต่อ</span><h2>ยังมีอีกเยอะ</h2><p>เข้าสู่ระบบเพื่อดูภาพทั้งหมดใน Discover และเก็บสิ่งที่ถูกใจไว้ใน Vault ส่วนตัวของคุณ</p><button type='button' class='discover-gate-cta' data-auth-open>เข้าสู่ระบบ / สมัคร</button><small>ใช้ฟรีช่วง alpha</small>" : `<span class='discover-gate-eyebrow'>Keep exploring</span><h2>There’s so much more.</h2><p>Log in to see everything in Discover — and keep what moves you in your own private Vault.</p><button type='button' class='discover-gate-cta' data-auth-open>Log in or sign up</button><small>Free while in alpha · เข้าสู่ระบบเพื่อดูต่อ</small>`}</div><span class='discover-gate-wordmark' aria-hidden='true'>A+ Vault</span></div>`;
}

function discoverResultsMarkup(ds, config, keptIds) {
  if (!ds.items.length) {
    if (ds.loading || !ds.loaded) return `<div class='discover-empty'><p>${ds.similar ? "Finding similar images…" : "Loading Discover…"}</p></div>`;
    if (ds.error) return `<div class='discover-empty'><p>${esc(ds.error)}</p><button type='button' class='ghost-button' data-discover-retry>Try again</button></div>`;
    return `<div class='discover-empty'><p>${emptyMessage(ds)}</p>${discoverHasFilters(ds) ? `<button type='button' class='ghost-button' data-discover-clear-all>Clear all filters</button>` : ""}</div>`;
  }
  const gated = guestMode && ds.items.length > GUEST_FREE_ITEMS;
  const cardHtml = item => discoverCardMarkup(item, config, keptIds.has(item.id));
  if (gated) {
    const free = ds.items.slice(0, GUEST_FREE_ITEMS).map(cardHtml).join("");
    const locked = ds.items.slice(GUEST_FREE_ITEMS).map(item => cardHtml(item).replace("<article class='discover-card'", "<article class='discover-card is-gated' inert aria-hidden='true'")).join("");
    return `<div class='discover-grid'>${free}</div><div class='discover-grid-wrap'><div class='discover-grid'>${locked}</div>${gateMarkup()}</div>`;
  }
  const cards = ds.items.map(cardHtml).join("");
  const footer = ds.done
    ? `<p class='discover-end'>You've reached the end.</p>`
    : `<div class='discover-more' data-discover-sentinel><button type='button' class='ghost-button' data-discover-more${ds.loading ? " disabled" : ""}>${ds.loading ? "Loading…" : "Load more"}</button></div>`;
  return `<div class='discover-grid'>${cards}</div>${ds.error ? `<p class='discover-inline-error'>${esc(ds.error)}</p>` : ""}${footer}`;
}

export function discoverCreditText(item) {
  return String(item?.attribution || "").trim();
}

function metaText(meta, key) {
  const value = meta[key];
  return typeof value === "string" ? value.trim() : "";
}

function sameText(a, b) {
  return Boolean(a) && a.toLowerCase() === String(b || "").toLowerCase();
}

export function discoverObjectRows(item) {
  const info = attributionInfo(item);
  const meta = item && typeof item.source_meta === "object" && item.source_meta ? item.source_meta : {};
  const role = metaText(meta, "artist_role");
  const maker = info.artist || metaText(meta, "artist_display");
  const era = [metaText(meta, "period"), metaText(meta, "dynasty"), metaText(meta, "reign")].filter(Boolean).join(" · ");
  return [
    [role || "Artist / maker", maker, info.artist ? "artist" : ""],
    ["Artist details", info.artist ? metaText(meta, "artist_bio") : ""],
    ["Culture", metaText(meta, "culture"), "culture"],
    ["Period", era, era && era === metaText(meta, "period") ? "period" : ""],
    ["Place", metaText(meta, "geography"), "geography"],
    ["Object type", metaText(meta, "object_name"), "object_name"],
    ["Classification", sameText(metaText(meta, "classification"), metaText(meta, "object_name")) ? "" : metaText(meta, "classification"), "classification"],
    ["Medium", metaText(meta, "medium"), "medium"],
    ["Dimensions", metaText(meta, "dimensions")],
  ].filter(([, value]) => value);
}

/** label is trusted markup; hint is escaped. */
function foldMarkup(cls, label, hint, body) {
  return `<details class='discover-fold ${cls}'><summary><span class='section-label'>${label}</span>${hint ? `<span class='discover-fold-hint'>${esc(hint)}</span>` : ""}<svg class='discover-fold-chevron' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' aria-hidden='true'><path d='m6 9 6 6 6-6'/></svg></summary><div class='discover-fold-body'>${body}</div></details>`;
}

function detailNavMarkup(nav) {
  if (!nav || nav.total < 2) return "";
  const arrow = (dir, label, path, enabled) =>
    `<button type='button' class='discover-detail-nav is-${dir}' data-discover-step='${dir === "prev" ? -1 : 1}' aria-label='${label}'${enabled ? "" : " disabled"}><svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round' aria-hidden='true'><path d='${path}'/></svg></button>`;
  return arrow("prev", "Previous image", "m15 6-6 6 6 6", nav.hasPrev) + arrow("next", "Next image", "m9 6 6 6-6 6", nav.hasNext);
}

export function discoverDetailMarkup(item, config, kept, nav, view = {}) {
  if (!item) return "";
  const info = attributionInfo(item);
  const facetButton = (key, value, text) => `<button type='button' class='discover-facet-link' data-discover-facet='${escA(key)}' data-value='${escA(value)}' title='${escA("Find more: " + value)}'>${esc(text)}</button>`;
  const objectRows = discoverObjectRows(item).map(([label, value, facet]) => {
    let dd = esc(value);
    if (facet === "medium") {
      const materials = materialsFrom(value);
      if (materials.length === 1 && sameText(materials[0], value)) dd = facetButton("medium", materials[0], value);
      else if (materials.length) dd += `<span class='discover-materials'>${materials.map(m => facetButton("medium", m, m)).join("")}</span>`;
    } else if (facet) dd = facetButton(facet, value, value);
    return `<div><dt>${esc(label)}</dt><dd>${dd}</dd></div>`;
  }).join("");
  const lg = discoverMediaUrl(config, item.image_lg_path);
  const md = discoverMediaUrl(config, item.image_md_path);
  const blur = blurhashDataUrl(item.blurhash);
  const sourceUrl = safeHttpsUrl(item.source_url);
  const licenseUrl = safeHttpsUrl(item.license_url);
  const byline = [info.artist, info.date].filter(Boolean).join(" · ");
  const tags = (item.tags || []).slice(0, 10).map(t => `<button type='button' class='tag discover-tag' data-discover-tag='${escA(t)}' title='${escA("Search “" + t + "”")}'>${esc(t)}</button>`).join("");
  const colors = (item.colors || []).slice(0, 6).map(normalizeHex).filter(Boolean).map(c => `<button type='button' class='discover-swatch' data-discover-swatch='${escA(c)}' style='background:${escA(c)}' title='${escA("Search color " + c)}' aria-label='${escA("Search color " + c)}'></button>`).join("");
  const palette = paletteList(item);
  const dominant = dominantSwatch(palette);
  const ambient = dominant ? ambientColor(dominant.hex) : "";
  const keyTags = tagChipsMarkup(item.tags_ids, view.labelOf, { pinned: view.pinned || [], excluded: view.excluded || [], limit: 6 });
  const licenseLabel = discoverLicenseLabel(item.license);
  const meta = item && typeof item.source_meta === "object" && item.source_meta ? item.source_meta : {};
  const institution = info.institution ? (info.institutionUrl ? `<a href='${escA(info.institutionUrl)}' target='_blank' rel='noopener noreferrer'>${esc(info.institution)}</a>` : esc(info.institution)) : 'the institution';
  const details = foldMarkup('discover-info', 'Details &amp; credit', [metaText(meta, 'object_name'), licenseLabel].filter(Boolean).join(' · '), `${objectRows ? `<dl>${objectRows}</dl>` : ''}<div class='discover-credit'><p class='discover-license'><span class='discover-license-badge'>${licenseUrl ? `<a href='${escA(licenseUrl)}' target='_blank' rel='noopener noreferrer license'>${esc(licenseLabel)}</a>` : esc(licenseLabel)}</span><span>${esc(discoverLicenseNote(item.license))} Please credit ${institution}.</span></p><p class='discover-credit-text'>${esc(discoverCreditText(item))}</p></div>`);
  return `<div class='discover-detail-backdrop' data-discover-close role='presentation'${ambient ? ` style='--ambient:${escA(ambient)}'` : ""}><div class='discover-detail-frame' style='--ar:${escA(String(aspectRatio(item)))}'>${trailMarkup(view.trail)}${detailNavMarkup(nav)}<section class='discover-detail${view.bw ? " viewer-bw" : ""}${view.grid ? " viewer-grid" : ""}' role='dialog' aria-modal='true' aria-label='${escA(item.title || "Artwork")}' data-discover-dialog><button type='button' class='discover-detail-close' data-discover-close aria-label='Close'>&times;</button><div class='discover-detail-media' style='aspect-ratio:${escA(aspect(item))};${blur ? escA(`background-image:url(${blur})`) : ""}'><img src='${escA(md)}' srcset='${escA(md)} 800w, ${escA(lg)} 1600w' sizes='(max-width: 860px) 100vw, 60vw' alt='${escA(item.title || "")}' decoding='async'><span class='viewer-thirds' aria-hidden='true'></span></div><div class='discover-detail-info'><button type='button' class='viewer-sheet-handle' data-viewer-sheet aria-expanded='false' aria-label='Show more details'><span aria-hidden='true'></span></button><h2>${esc(item.title || "Untitled")}</h2>${byline ? `<p class='discover-detail-byline'>${esc(byline)}</p>` : ""}${tags ? `<div class='tag-row discover-tags'>${tags}</div>` : ""}${paletteStripMarkup(palette)}${palette.length ? viewerToolsMarkup({ bw: view.bw, grid: view.grid }) : ""}${keyTags}<div class='discover-detail-actions'><button type='button' class='primary-button' data-discover-keep='${escA(item.id)}'>${kept ? "Kept · Add to collection" : "+ Keep in Vault"}</button>${sourceUrl ? `<a class='ghost-button discover-source-btn' href='${escA(sourceUrl)}' target='_blank' rel='noopener noreferrer' title='View at source' aria-label='View at source (opens in new tab)'><svg viewBox='0 0 24 24' width='18' height='18' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' aria-hidden='true'><path d='M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1'/><path d='M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1'/></svg></a>` : ""}${discoverReportButtonMarkup(item.id)}</div><div class='discover-detail-bottom'><section class='discover-similar' aria-label='Similar images'><div class='discover-similar-head'>${continueTabsMarkup(view.mode || "similar")}<button type='button' class='discover-similar-all' data-discover-similar='${escA(item.id)}'>See all</button></div><div class='discover-similar-grid' data-discover-similar-host><span class='discover-similar-loading'>Finding similar images…</span></div></section>${details}</div></div></section></div></div>`;
}

export function discoverSimilarStripMarkup(items, config) {
  if (!items.length) return `<span class='discover-similar-loading'>No close matches yet.</span>`;
  return items.slice(0, 24).map(item => {
    const blur = blurhashDataUrl(item.blurhash);
    return `<button type='button' class='discover-similar-item' data-discover-open='${escA(item.id)}' title='${escA(item.title || "Untitled")}' style='${escA(blur ? `background-image:url(${blur})` : "")}'><img src='${escA(discoverMediaUrl(config, item.image_sm_path))}' alt='${escA(item.title || "")}' loading='lazy' decoding='async'></button>`;
  }).join("");
}

export function discoverSaveDialogMarkup(opts) {
  const icons = opts.icons || {};
  const saved = `<small class='discover-save-added'>Saved</small>`;
  const cols = opts.collections.length
    ? opts.collections.map(c => `<button type='button' class='discover-save-option${c.added ? " is-added" : ""}' data-discover-save-to='${escA(c.id)}' style='--depth:${c.depth ? 1 : 0}'><span class='discover-save-icon'>${icons.collection || ""}</span><span class='discover-save-name'>${esc(c.name)}</span>${c.added ? saved : ""}</button>`).join("")
    : `<p class='discover-save-empty'>No collections yet. Create one below.</p>`;
  const footer = opts.creating
    ? `<form class='discover-save-form' data-discover-save-form><input name='name' type='text' placeholder='Collection name' aria-label='Collection name' maxlength='60' autocomplete='off' required><button type='submit' class='primary-button'>Create &amp; save</button></form>`
    : `<button type='button' class='discover-save-new' data-discover-save-new><span class='discover-save-icon'>${icons.plus || "+"}</span><span>New collection</span></button>`;
  return `<div class='discover-save-backdrop' data-discover-save-dismiss role='presentation'><section class='discover-save' role='dialog' aria-modal='true' aria-labelledby='discover-save-title' data-discover-save-dialog><header class='discover-save-head'>${opts.thumb ? `<img src='${escA(opts.thumb)}' alt='' decoding='async'>` : ""}<div><h2 id='discover-save-title'>Save to</h2><p>${esc(opts.title || "Untitled")}</p></div><button type='button' class='discover-save-close' data-discover-save-dismiss aria-label='Close'>&times;</button></header><div class='discover-save-list'><button type='button' class='discover-save-option is-vault${opts.inVault ? " is-added" : ""}' data-discover-save-to=''><span class='discover-save-icon'>${icons.vault || ""}</span><span class='discover-save-name'>My Vault<small>Main library only</small></span>${opts.inVault ? saved : ""}</button><p class='discover-save-label'>Collections</p>${cols}</div><footer class='discover-save-foot'>${footer}</footer></section></div>`;
}

export function discoverToVaultItem(item, config, newId) {
  const info = attributionInfo(item);
  const lg = discoverMediaUrl(config, item.image_lg_path);
  const md = discoverMediaUrl(config, item.image_md_path);
  const sm = discoverMediaUrl(config, item.image_sm_path);
  const credit = discoverCreditText(item);
  return {
    id: newId,
    type: "image",
    title: String(item.title || "Untitled").slice(0, 160),
    note: "",
    sourceUrl: safeHttpsUrl(item.source_url),
    assetUrl: lg,
    previewUrl: md,
    thumbnailUrl: sm,
    collectionIds: ["all"],
    projectIds: [],
    status: "ready",
    createdAt: Date.now(),
    captureContext: {
      method: "discover",
      destination: "Vault Library",
      discoverItemId: item.id,
      source: item.source,
      license: item.license,
      licenseUrl: safeHttpsUrl(item.license_url),
      attribution: credit,
      attributionJson: item.attribution_json || {},
      visualCategory: item.category || "",
      usageNote: `${discoverLicenseLabel(item.license)} — credit: ${info.institution || credit}`.slice(0, 300),
    },
    analysis: {
      tags: Array.isArray(item.tags) ? item.tags.slice(0, 16) : [],
      colors: Array.isArray(item.colors) ? item.colors.slice(0, 8) : [],
      style: item.style || "",
      category: item.category || "",
      summary: credit,
    },
  };
}

export function readPendingAction() {
  try {
    const raw = sessionStorage.getItem(DISCOVER_PENDING_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

export function writePendingAction(action) {
  try {
    if (action) sessionStorage.setItem(DISCOVER_PENDING_KEY, JSON.stringify(action));
    else sessionStorage.removeItem(DISCOVER_PENDING_KEY);
  } catch (e) {}
}

const FLAG_ICON = `<svg viewBox='0 0 24 24' width='18' height='18' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round' aria-hidden='true'><path d='M5 21V4'/><path d='M5 4h11l-2 4 2 4H5'/></svg>`;

export const DISCOVER_REPORT_REASONS = [
  { id: "copyright", label: "I own the rights to this work", hint: "Request removal of your copyrighted image" },
  { id: "credit", label: "Wrong credit or information", hint: "Title, artist, date or source is incorrect" },
  { id: "offensive", label: "Offensive or sensitive content", hint: "Nudity, violence, hate or harmful imagery" },
  { id: "broken", label: "Broken or low-quality image", hint: "Doesn't load, cropped, blurry or wrong image" },
  { id: "duplicate", label: "Duplicate", hint: "Same image appears more than once" },
  { id: "other", label: "Something else", hint: "Tell us below" },
];

export function discoverReportButtonMarkup(id) {
  return `<button type='button' class='ghost-button discover-report-btn' data-discover-report='${escA(id)}' title='Report this image' aria-label='Report this image'>${FLAG_ICON}</button>`;
}

export function discoverReportDialogMarkup(item, config, opts = {}) {
  const thumb = discoverMediaUrl(config, item.image_sm_path);
  const reasons = DISCOVER_REPORT_REASONS.map((r, i) => `<label class='discover-report-reason'><input type='radio' name='reason' value='${escA(r.id)}'${i ? "" : " required"}><span><strong>${esc(r.label)}</strong><small>${esc(r.hint)}</small></span></label>`).join("");
  const body = opts.sent
    ? `<div class='discover-report-done'><span class='discover-report-done-icon'>${FLAG_ICON}</span><h3>Thanks for letting us know</h3><p>We'll review this image. Anything that breaks our rules or infringes copyright is removed.</p><button type='button' class='primary-button' data-discover-report-dismiss>Done</button></div>`
    : `<form class='discover-report-form' data-discover-report-form data-item='${escA(item.id)}'><fieldset><legend>What's the issue?</legend>${reasons}</fieldset><label class='discover-report-field'><span>Details <small>(optional)</small></span><textarea name='details' rows='3' maxlength='2000' placeholder='Add anything that helps us review, e.g. the correct credit or a link to your original work'></textarea></label><label class='discover-report-field'><span>Email <small data-discover-report-email-hint>(optional, so we can follow up)</small></span><input type='email' name='email' maxlength='200' autocomplete='email' value='${escA(opts.email || "")}' placeholder='you@example.com'></label>${opts.error ? `<p class='discover-report-error' role='alert'>${esc(opts.error)}</p>` : ""}<p class='discover-report-note'>Copyright owners: see our <a href='./legal.html#copyright' target='_blank' rel='noopener'>copyright policy</a>.</p><div class='discover-report-actions'><button type='button' class='ghost-button' data-discover-report-dismiss>Cancel</button><button type='submit' class='primary-button'${opts.busy ? " disabled" : ""}>${opts.busy ? "Sending…" : "Send report"}</button></div></form>`;
  return `<div class='discover-report-backdrop' data-discover-report-dismiss role='presentation'><section class='discover-report' role='dialog' aria-modal='true' aria-labelledby='discover-report-title' data-discover-report-dialog><header class='discover-report-head'>${thumb ? `<img src='${escA(thumb)}' alt='' decoding='async'>` : ""}<div><h2 id='discover-report-title'>Report this image</h2><p>${esc(item.title || "Untitled")}</p></div><button type='button' class='discover-save-close' data-discover-report-dismiss aria-label='Close'>&times;</button></header>${body}</section></div>`;
}

/** Inserts into `discover_reports` (anon insert-only RLS). Throws a user-facing message on failure. */
export async function submitDiscoverReport(config, { itemId, reason, details, email, accessToken }) {
  const key = String(config.supabasePublishableKey || "");
  if (!key || !itemId || !DISCOVER_REPORT_REASONS.some(r => r.id === reason)) throw new Error("Choose what's wrong with this image.");
  const mail = String(email || "").trim();
  if (reason === "copyright" && !mail) throw new Error("Add your email so we can follow up on a copyright claim.");
  if (mail && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mail)) throw new Error("That email doesn't look right.");
  const response = await fetch(`${restBase(config)}/rest/v1/discover_reports`, {
    method: "POST",
    headers: { apikey: key, authorization: `Bearer ${accessToken || key}`, "content-type": "application/json", prefer: "return=minimal" },
    body: JSON.stringify({ item_id: itemId, reason, details: String(details || "").trim().slice(0, 2000), email: mail || null }),
  });
  if (!response.ok) throw new Error("Couldn't send the report. Please try again.");
}
