export const COLOR_MATCH_MIN = 0.62;
export const MAX_SEARCH_COLORS = 3;
export const SIMILAR_MIN_SCORE = 0.32;

export const DISCOVER_TONES = [
  ["light", "Light"],
  ["dark", "Dark"],
  ["warm", "Warm"],
  ["cool", "Cool"],
  ["muted", "Muted"],
  ["vivid", "Vivid"],
];

export const DISCOVER_SHAPES = [
  ["landscape", "Landscape"],
  ["portrait", "Portrait"],
  ["square", "Square"],
  ["wide", "Panorama"],
];

export const DISCOVER_FACET_KEYS = {
  culture: "Culture",
  geography: "Place",
  object_name: "Object type",
  classification: "Classification",
  period: "Period",
  medium: "Material",
  artist: "Artist",
};

const MATERIALS = [
  "paper", "silk", "cotton", "linen", "wool", "satin", "velvet", "canvas", "parchment", "vellum",
  "wood", "bamboo", "lacquer", "porcelain", "stoneware", "earthenware", "ceramic", "terracotta", "glass",
  "bronze", "silver", "gold", "iron", "steel", "brass", "copper", "pewter", "ivory", "leather", "marble", "stone",
  "oil", "ink", "watercolor", "gouache", "tempera", "pastel", "charcoal", "graphite",
  "lithograph", "woodblock", "woodcut", "etching", "engraving", "screenprint", "gelatin silver", "albumen",
];

export function normalizeHex(raw) {
  let hex = String(raw || "").trim().toLowerCase();
  if (!hex) return null;
  if (!hex.startsWith("#")) hex = `#${hex}`;
  if (/^#[0-9a-f]{3}$/.test(hex)) hex = `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`;
  return /^#[0-9a-f]{6}$/.test(hex) ? hex : null;
}

function hexToRgb(hex) {
  const value = normalizeHex(hex);
  if (!value) return null;
  return { r: parseInt(value.slice(1, 3), 16), g: parseInt(value.slice(3, 5), 16), b: parseInt(value.slice(5, 7), 16) };
}

function rgbToHsl(r, g, b) {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn), d = max - min;
  const l = (max + min) / 2;
  let h = 0, s = 0;
  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) * 60;
    else if (max === gn) h = ((bn - rn) / d + 2) * 60;
    else h = ((rn - gn) / d + 4) * 60;
  }
  return { h, s: s * 100, l: l * 100, c: d };
}

function hexToHsl(hex) {
  const rgb = hexToRgb(hex);
  return rgb ? rgbToHsl(rgb.r, rgb.g, rgb.b) : null;
}

export function hexToHsv(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  const rn = rgb.r / 255, gn = rgb.g / 255, bn = rgb.b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn), d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) * 60;
    else if (max === gn) h = ((bn - rn) / d + 2) * 60;
    else h = ((rn - gn) / d + 4) * 60;
  }
  return { h, s: max === 0 ? 0 : (d / max) * 100, v: max * 100 };
}

export function hsvToHex(h, s, v) {
  const sat = Math.min(100, Math.max(0, s)) / 100;
  const val = Math.min(100, Math.max(0, v)) / 100;
  const c = val * sat;
  const hh = (((h % 360) + 360) % 360) / 60;
  const x = c * (1 - Math.abs((hh % 2) - 1));
  let rgb = [0, 0, 0];
  if (hh < 1) rgb = [c, x, 0];
  else if (hh < 2) rgb = [x, c, 0];
  else if (hh < 3) rgb = [0, c, x];
  else if (hh < 4) rgb = [0, x, c];
  else if (hh < 5) rgb = [x, 0, c];
  else rgb = [c, 0, x];
  const m = val - c;
  return "#" + rgb.map(n => Math.round((n + m) * 255).toString(16).padStart(2, "0")).join("");
}

function pairScore(query, stop) {
  const d = Math.abs(query.h - stop.h) % 360;
  const hue = 1 - (d > 180 ? 360 - d : d) / 180;
  const sat = 1 - Math.min(1, Math.abs(query.s - stop.s) / 100);
  const light = 1 - Math.min(1, Math.abs(query.l - stop.l) / 100);
  if (query.s < 14 || stop.s < 14) {
    if (Math.abs(query.s - stop.s) > 28 || Math.abs(query.l - stop.l) > 22) return null;
    return light * 0.8 + sat * 0.2;
  }
  if (hue < 0.86 || Math.abs(query.l - stop.l) > 30 || Math.abs(query.s - stop.s) > 32) return null;
  return hue * 0.62 + sat * 0.2 + light * 0.18;
}

/** Best match of one query color against an image palette (dominant colors weigh more). */
export function scoreColors(hex, colors) {
  const query = hexToHsl(hex);
  if (!query || !Array.isArray(colors) || !colors.length) return 0;
  let best = 0;
  colors.forEach((color, index) => {
    const stop = hexToHsl(color);
    if (!stop) return;
    const pair = pairScore(query, stop);
    if (pair == null) return;
    const weight = Math.max(0.1, 0.5 / (index + 1));
    best = Math.max(best, pair * (0.78 + 0.22 * Math.min(1, weight * 4)));
  });
  return best;
}

/** Every query color must appear in the palette; 0 when any is missing. */
export function scoreColorSet(hexes, colors) {
  if (!hexes.length) return 1;
  let total = 0;
  for (const hex of hexes) {
    const score = scoreColors(hex, colors);
    if (score < COLOR_MATCH_MIN) return 0;
    total += score;
  }
  return total / hexes.length;
}

export function paletteTones(colors) {
  const stops = (Array.isArray(colors) ? colors : []).map(hexToHsl).filter(Boolean);
  const tones = new Set();
  if (!stops.length) return tones;
  let wSum = 0, light = 0, warm = 0, cool = 0, maxChroma = 0;
  stops.forEach((stop, index) => {
    const w = 1 / (index + 1);
    wSum += w;
    light += stop.l * w;
    maxChroma = Math.max(maxChroma, stop.c);
    if (stop.c < 0.08) return;
    if (stop.h < 75 || stop.h >= 330) warm += w * stop.c;
    else if (stop.h >= 150 && stop.h < 270) cool += w * stop.c;
  });
  light /= wSum;
  if (light >= 70) tones.add("light");
  if (light <= 35) tones.add("dark");
  if (maxChroma < 0.18) tones.add("muted");
  if (stops.some(stop => stop.c >= 0.45)) tones.add("vivid");
  if (warm > 0 && warm > cool * 1.2) tones.add("warm");
  if (cool > 0 && cool > warm * 1.2) tones.add("cool");
  return tones;
}

export function imageShape(width, height) {
  const w = Number(width) || 0, h = Number(height) || 0;
  if (!w || !h) return "";
  const ratio = w / h;
  if (ratio >= 1.9) return "wide";
  if (ratio >= 1.12) return "landscape";
  if (ratio <= 0.89) return "portrait";
  return "square";
}

export function matchesShape(shape, item) {
  const actual = imageShape(item?.width, item?.height);
  return shape === "landscape" ? actual === "landscape" || actual === "wide" : actual === shape;
}

export function materialsFrom(medium) {
  const text = String(medium || "").toLowerCase();
  if (!text) return [];
  return MATERIALS
    .map(word => ({ word, at: text.search(new RegExp(`\\b${word}s?\\b`)) }))
    .filter(hit => hit.at >= 0)
    .sort((a, b) => a.at - b.at)
    .slice(0, 5)
    .map(hit => hit.word);
}

function hamming(a, b) {
  if (!a || !b || a.length !== b.length) return null;
  let d = 0;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) d++;
  return d;
}

function paletteSimilarity(a, b) {
  const one = (from, to) => {
    const stops = from.slice(0, 3);
    return stops.length ? stops.reduce((sum, hex) => sum + scoreColors(hex, to), 0) / stops.length : 0;
  };
  if (!a.length || !b.length) return 0;
  return (one(a, b) + one(b, a)) / 2;
}

function metaOf(item) {
  return item && typeof item.source_meta === "object" && item.source_meta ? item.source_meta : {};
}

function lower(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

/** Reference for similarity: an existing item, or an uploaded image analysed in the browser. */
export function similarRef(item) {
  const meta = metaOf(item);
  return {
    id: item.id,
    phash: typeof item.phash === "string" ? item.phash : "",
    colors: Array.isArray(item.colors) ? item.colors : [],
    ratio: (Number(item.width) || 1) / (Number(item.height) || 1),
    hasMeta: true,
    category: item.category || "",
    tags: new Set((item.tags || []).map(lower).filter(Boolean)),
    objectName: lower(meta.object_name),
    culture: lower(meta.culture),
    classification: lower(meta.classification),
    artist: lower(item.attribution_json?.artist),
  };
}

function metaSimilarity(ref, item) {
  const meta = metaOf(item);
  const tags = new Set((item.tags || []).map(lower).filter(Boolean));
  let shared = 0;
  tags.forEach(t => { if (ref.tags.has(t)) shared++; });
  const union = ref.tags.size + tags.size - shared;
  let score = union ? (shared / union) * 0.4 : 0;
  if (ref.category && ref.category === item.category) score += 0.2;
  if (ref.objectName && ref.objectName === lower(meta.object_name)) score += 0.2;
  if (ref.culture && ref.culture === lower(meta.culture)) score += 0.15;
  if (ref.classification && ref.classification === lower(meta.classification)) score += 0.1;
  if (ref.artist && ref.artist === lower(item.attribution_json?.artist)) score += 0.2;
  return Math.min(1, score);
}

export function similarityScore(ref, item) {
  const d = hamming(ref.phash, typeof item.phash === "string" ? item.phash : "");
  const visual = d == null ? 0 : Math.max(0, 1 - d / 28);
  const palette = paletteSimilarity(ref.colors, Array.isArray(item.colors) ? item.colors : []);
  const ratio = (Number(item.width) || 1) / (Number(item.height) || 1);
  const shape = 1 - Math.min(1, Math.abs(Math.log(ref.ratio / ratio)) / Math.LN2);
  if (ref.hasMeta) return metaSimilarity(ref, item) * 0.4 + palette * 0.3 + visual * 0.15 + shape * 0.15;
  return palette * 0.55 + visual * 0.25 + shape * 0.2;
}

export function rankSimilar(ref, rows, limit = 60) {
  return rows
    .filter(row => row.id !== ref.id)
    .map(row => ({ row, score: similarityScore(ref, row) }))
    .filter(entry => entry.score >= SIMILAR_MIN_SCORE)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(entry => entry.row);
}

const PHASH_SIZE = 32;
const PHASH_LOW = 8;
let cosTable = null;

/** Same DCT hash as the seeder (seeder/src/seeder/phash.ts) so uploads compare against stored hashes. */
function phashFromGray(pixels) {
  if (!cosTable) {
    cosTable = Array.from({ length: PHASH_LOW }, (_, u) =>
      Array.from({ length: PHASH_SIZE }, (_, x) => Math.cos(((2 * x + 1) * u * Math.PI) / (2 * PHASH_SIZE))));
  }
  const coeffs = [];
  for (let u = 0; u < PHASH_LOW; u++) {
    for (let v = 0; v < PHASH_LOW; v++) {
      let sum = 0;
      for (let y = 0; y < PHASH_SIZE; y++) {
        const cy = cosTable[u][y];
        const row = y * PHASH_SIZE;
        for (let x = 0; x < PHASH_SIZE; x++) sum += pixels[row + x] * cy * cosTable[v][x];
      }
      coeffs.push(sum);
    }
  }
  const median = coeffs.slice(1).sort((a, b) => a - b)[Math.floor((coeffs.length - 1) / 2)];
  return coeffs.map(c => (c > median ? "1" : "0")).join("");
}

function toHex(r, g, b) {
  return "#" + [r, g, b].map(n => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0")).join("");
}

/** Port of seeder/scripts/palette.ts: dominant colors first, then saturated accents. */
function paletteFromRgba(data, total) {
  const buckets = new Map();
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 128) continue;
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
    const bucket = buckets.get(key) || { r: 0, g: 0, b: 0, n: 0 };
    bucket.r += r; bucket.g += g; bucket.b += b; bucket.n += 1;
    buckets.set(key, bucket);
  }
  const colors = [...buckets.values()].map(c => ({ r: c.r / c.n, g: c.g / c.n, b: c.b / c.n, n: c.n })).sort((a, b) => b.n - a.n);
  const chroma = c => (Math.max(c.r, c.g, c.b) - Math.min(c.r, c.g, c.b)) / 255;
  const hsl = c => rgbToHsl(c.r, c.g, c.b);
  const picked = [];
  for (const c of colors) {
    if (picked.length >= 3) break;
    if (picked.every(p => Math.hypot(p.r - c.r, p.g - c.g, p.b - c.b) >= 48)) picked.push(c);
  }
  const hues = new Map();
  for (const c of colors) {
    const { h, s, l } = hsl(c);
    if (s < 22 || l < 12 || l > 88 || chroma(c) < 0.1) continue;
    const bin = Math.floor(h / 30) % 12;
    const acc = hues.get(bin) || { r: 0, g: 0, b: 0, n: 0 };
    acc.r += c.r * c.n; acc.g += c.g * c.n; acc.b += c.b * c.n; acc.n += c.n;
    hues.set(bin, acc);
  }
  const accents = [...hues.values()]
    .filter(c => c.n / total >= 0.01)
    .map(c => ({ r: c.r / c.n, g: c.g / c.n, b: c.b / c.n, n: c.n }))
    .sort((a, b) => b.n - a.n);
  for (const c of accents) {
    if (picked.length >= 5) break;
    const fresh = picked.every(p => {
      if (chroma(p) < 0.1) return true;
      const gap = Math.abs(hsl(p).h - hsl(c).h);
      return Math.min(gap, 360 - gap) >= 30;
    });
    if (fresh) picked.push(c);
  }
  return picked.map(c => toHex(c.r, c.g, c.b));
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("This image could not be read.")); };
    img.src = url;
  });
}

/** Runs entirely in the browser; the uploaded file never leaves the device. */
export async function analyzeImageFile(file) {
  if (!file || !/^image\//.test(file.type)) throw new Error("Choose an image file.");
  if (file.size > 25 * 1024 * 1024) throw new Error("Image is too large (max 25 MB).");
  const img = await loadImage(file);
  const w = img.naturalWidth, h = img.naturalHeight;
  if (!w || !h) throw new Error("This image could not be read.");
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true });

  canvas.width = PHASH_SIZE; canvas.height = PHASH_SIZE;
  ctx.drawImage(img, 0, 0, PHASH_SIZE, PHASH_SIZE);
  const rgba = ctx.getImageData(0, 0, PHASH_SIZE, PHASH_SIZE).data;
  const gray = new Uint8Array(PHASH_SIZE * PHASH_SIZE);
  for (let i = 0; i < gray.length; i++) gray[i] = Math.round(rgba[i * 4] * 0.2126 + rgba[i * 4 + 1] * 0.7152 + rgba[i * 4 + 2] * 0.0722);

  const scale = Math.min(1, 96 / Math.max(w, h));
  const pw = Math.max(1, Math.round(w * scale)), ph = Math.max(1, Math.round(h * scale));
  canvas.width = pw; canvas.height = ph;
  ctx.drawImage(img, 0, 0, pw, ph);
  const colors = paletteFromRgba(ctx.getImageData(0, 0, pw, ph).data, pw * ph);

  const ts = Math.min(1, 160 / Math.max(w, h));
  canvas.width = Math.max(1, Math.round(w * ts)); canvas.height = Math.max(1, Math.round(h * ts));
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const thumb = canvas.toDataURL("image/jpeg", 0.8);

  return {
    title: String(file.name || "Your image").slice(0, 60),
    thumb,
    ref: { id: null, phash: phashFromGray(gray), colors, ratio: w / h, hasMeta: false },
  };
}
