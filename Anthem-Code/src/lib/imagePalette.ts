/** Extract a small dominant-color palette from an image URL (client-only). */

export type PaletteRgb = { r: number; g: number; b: number };

const CACHE_VERSION = "v2";
const cache = new Map<string, string[]>();

function cacheKey(url: string): string {
  return `${CACHE_VERSION}:${url}`;
}

function rgbToCss({ r, g, b }: PaletteRgb): string {
  return `rgb(${r} ${g} ${b})`;
}

export function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l: l * 100 };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  switch (max) {
    case r:
      h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
      break;
    case g:
      h = ((b - r) / d + 2) / 6;
      break;
    default:
      h = ((r - g) / d + 4) / 6;
  }
  return { h: h * 360, s: s * 100, l: l * 100 };
}

/** Deterministic soft fallback when canvas is tainted / fails. */
export function fallbackPaletteFromSeed(seed: string, count = 4): string[] {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  const colors: string[] = [];
  for (let i = 0; i < count; i++) {
    const h = (hash + i * 67) % 360;
    const s = 42 + ((hash >> (i * 3)) % 28);
    const l = 38 + ((hash >> (i * 5)) % 26);
    colors.push(`hsl(${h} ${s}% ${l}%)`);
  }
  return colors;
}

function colorDistanceSq(a: PaletteRgb, b: PaletteRgb): number {
  // Weighted RGB distance (closer to perceived luminance).
  const dr = a.r - b.r;
  const dg = a.g - b.g;
  const db = a.b - b.b;
  return 2 * dr * dr + 4 * dg * dg + 3 * db * db;
}

function hueDistance(a: number, b: number): number {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

type Bucket = { r: number; g: number; b: number; count: number; satSum: number };

function scoreBucket(v: Bucket): number {
  const r = v.r / v.count;
  const g = v.g / v.count;
  const b = v.b / v.count;
  const { s, l } = rgbToHsl(r, g, b);
  const satNorm = s / 100;
  // Prefer mid-lights a bit, but keep dark/light accents viable.
  const lightW = 1 - Math.abs(l - 48) / 90;
  return v.count * (0.42 + 0.58 * satNorm) * (0.55 + 0.45 * Math.max(0.25, lightW));
}

function pickDiverse(ranked: PaletteRgb[], count: number): PaletteRgb[] {
  const picked: PaletteRgb[] = [];
  const minDist = 3200;

  for (const c of ranked) {
    const { h, s } = rgbToHsl(c.r, c.g, c.b);
    const tooClose = picked.some((p) => {
      if (colorDistanceSq(p, c) < minDist) return true;
      const ph = rgbToHsl(p.r, p.g, p.b);
      // Chromatic colors also need hue separation.
      if (s > 18 && ph.s > 18 && hueDistance(h, ph.h) < 18) return true;
      return false;
    });
    if (tooClose) continue;
    picked.push(c);
    if (picked.length >= count) break;
  }

  // Fill remaining with next-best even if slightly closer.
  if (picked.length < count) {
    for (const c of ranked) {
      if (picked.some((p) => colorDistanceSq(p, c) < 900)) continue;
      picked.push(c);
      if (picked.length >= count) break;
    }
  }

  return picked;
}

/**
 * Dominant palette with saturation-weighted ranking + hue/RGB diversity.
 * Returns css `rgb(r g b)` strings.
 */
export async function extractImagePalette(url: string, count = 4): Promise<string[]> {
  if (!url || typeof document === "undefined") return fallbackPaletteFromSeed(url || "x", count);
  const key = cacheKey(url);
  const cached = cache.get(key);
  if (cached) return cached.slice(0, count);

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.decoding = "async";

    const finish = (colors: string[]) => {
      clearTimeout(timer);
      cache.set(key, colors);
      resolve(colors.slice(0, count));
    };

    const timer = window.setTimeout(() => finish(fallbackPaletteFromSeed(url, count)), 8000);

    img.onerror = () => finish(fallbackPaletteFromSeed(url, count));
    img.onload = () => {
      try {
        const size = 72;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) {
          finish(fallbackPaletteFromSeed(url, count));
          return;
        }
        ctx.drawImage(img, 0, 0, size, size);
        const { data } = ctx.getImageData(0, 0, size, size);

        const buckets = new Map<number, Bucket>();
        for (let i = 0; i < data.length; i += 4) {
          if (data[i + 3]! < 40) continue;
          const r = data[i]!;
          const g = data[i + 1]!;
          const b = data[i + 2]!;
          const { s, l } = rgbToHsl(r, g, b);
          // Drop near-invisible noise; keep near-black/white as rare accents only.
          if (l < 3 || l > 97) continue;
          if (s < 4 && (l < 12 || l > 90)) continue;

          // 5-bit quantization (~32 levels) — finer than v1.
          const keyQ = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
          const prev = buckets.get(keyQ) ?? { r: 0, g: 0, b: 0, count: 0, satSum: 0 };
          prev.r += r;
          prev.g += g;
          prev.b += b;
          prev.count += 1;
          prev.satSum += s;
          buckets.set(keyQ, prev);
        }

        const ranked = [...buckets.values()]
          .map((v) => ({
            r: Math.round(v.r / v.count),
            g: Math.round(v.g / v.count),
            b: Math.round(v.b / v.count),
            score: scoreBucket(v),
          }))
          .sort((a, b) => b.score - a.score);

        const candidates: PaletteRgb[] = ranked.map(({ r, g, b }) => ({ r, g, b }));

        // Seed with most vivid chromatic color if dominant is very gray.
        const picked = pickDiverse(candidates, count);
        if (picked.length === 0) {
          finish(fallbackPaletteFromSeed(url, count));
          return;
        }

        // Ensure at least one more saturated accent if all picks are muted.
        const avgSat =
          picked.reduce((sum, c) => sum + rgbToHsl(c.r, c.g, c.b).s, 0) / picked.length;
        if (avgSat < 16) {
          const vivid = candidates.find((c) => {
            const { s } = rgbToHsl(c.r, c.g, c.b);
            return s > 28 && !picked.some((p) => colorDistanceSq(p, c) < 1800);
          });
          if (vivid && picked.length >= 2) {
            picked[picked.length - 1] = vivid;
          }
        }

        while (picked.length < count) {
          const base = picked[picked.length % picked.length]!;
          const { h, s, l } = rgbToHsl(base.r, base.g, base.b);
          const nudge = (picked.length * 23) % 40;
          picked.push({
            r: clampByte(base.r + (nudge % 2 === 0 ? 12 : -10)),
            g: clampByte(base.g + ((h + nudge) % 3) * 4),
            b: clampByte(base.b - 8 + (s > 20 ? 6 : 0)),
          });
          void l;
        }

        finish(picked.map(rgbToCss));
      } catch {
        finish(fallbackPaletteFromSeed(url, count));
      }
    };

    img.src = url;
  });
}

function clampByte(n: number): number {
  return Math.max(0, Math.min(255, Math.round(n)));
}

/** Normalize css color (rgb(...) / hsl(...) / #hex) to #rrggbb. */
export function toHexColor(css: string): string {
  const s = css.trim();
  if (s.startsWith("#") && (s.length === 7 || s.length === 4)) {
    if (s.length === 4) {
      return `#${s[1]}${s[1]}${s[2]}${s[2]}${s[3]}${s[3]}`.toLowerCase();
    }
    return s.toLowerCase();
  }
  const rgb = s.match(/rgb\(\s*([\d.]+)\s*[,\s]\s*([\d.]+)\s*[,\s]\s*([\d.]+)/i);
  if (rgb) {
    const r = clampByte(Number(rgb[1]));
    const g = clampByte(Number(rgb[2]));
    const b = clampByte(Number(rgb[3]));
    return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
  }
  const hsl = s.match(/hsl\(\s*([\d.]+)\s+([\d.]+)%\s+([\d.]+)%/i);
  if (hsl) {
    const h = Number(hsl[1]) / 360;
    const sat = Number(hsl[2]) / 100;
    const l = Number(hsl[3]) / 100;
    const hue2rgb = (p: number, q: number, t: number) => {
      let tt = t;
      if (tt < 0) tt += 1;
      if (tt > 1) tt -= 1;
      if (tt < 1 / 6) return p + (q - p) * 6 * tt;
      if (tt < 1 / 2) return q;
      if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + sat) : l + sat - l * sat;
    const p = 2 * l - q;
    const r = clampByte(hue2rgb(p, q, h + 1 / 3) * 255);
    const g = clampByte(hue2rgb(p, q, h) * 255);
    const b = clampByte(hue2rgb(p, q, h - 1 / 3) * 255);
    return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
  }
  return "#888888";
}

export function hexToRgb(hex: string): PaletteRgb {
  const h = toHexColor(hex).slice(1);
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

export function rgbText(hex: string): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgb(${r}, ${g}, ${b})`;
}

export function cmykText(hex: string): string {
  const { r, g, b } = hexToRgb(hex);
  const rr = r / 255;
  const gg = g / 255;
  const bb = b / 255;
  const k = 1 - Math.max(rr, gg, bb);
  if (k >= 0.999) return "0, 0, 0, 100";
  const c = Math.round(((1 - rr - k) / (1 - k)) * 100);
  const m = Math.round(((1 - gg - k) / (1 - k)) * 100);
  const y = Math.round(((1 - bb - k) / (1 - k)) * 100);
  return `${c}, ${m}, ${y}, ${Math.round(k * 100)}`;
}

const PANTONE_APPROX: [string, string][] = [
  ["PANTONE 1788 C", "#ff4f43"],
  ["PANTONE 485 C", "#da291c"],
  ["PANTONE 021 C", "#fe5000"],
  ["PANTONE 130 C", "#f2a900"],
  ["PANTONE 7406 C", "#f1c400"],
  ["PANTONE 7489 C", "#74aa50"],
  ["PANTONE 7482 C", "#009a44"],
  ["PANTONE 7474 C", "#007681"],
  ["PANTONE 2925 C", "#009cde"],
  ["PANTONE 2728 C", "#0047bb"],
  ["PANTONE 2685 C", "#2e1a47"],
  ["PANTONE 2593 C", "#9b26b6"],
  ["PANTONE 7425 C", "#b83a6b"],
  ["PANTONE Black 6 C", "#151719"],
  ["PANTONE Cool Gray 4 C", "#b8bec4"],
  ["PANTONE Cool Gray 9 C", "#75787b"],
  ["PANTONE Warm Gray 2 C", "#d6c7b7"],
  ["PANTONE 7522 C", "#c56b4e"],
  ["PANTONE 5575 C", "#9aa5a7"],
  ["PANTONE 7499 C", "#f8f6f2"],
];

export function pantoneApprox(hex: string): string {
  const x = hexToRgb(hex);
  let best = PANTONE_APPROX[0]!;
  let bestD = Number.POSITIVE_INFINITY;
  for (const p of PANTONE_APPROX) {
    const y = hexToRgb(p[1]);
    const d = colorDistanceSq(x, y);
    if (d < bestD) {
      bestD = d;
      best = p;
    }
  }
  return best[0];
}

export type HueFamily =
  | "red"
  | "orange"
  | "gold"
  | "green"
  | "teal"
  | "blue"
  | "purple"
  | "magenta"
  | "neutral";

export function hueFamily(hex: string): HueFamily {
  const { r, g, b } = hexToRgb(hex);
  const { h, s } = rgbToHsl(r, g, b);
  if (s < 12) return "neutral";
  if (h < 18 || h >= 345) return "red";
  if (h < 42) return "orange";
  if (h < 72) return "gold";
  if (h < 155) return "green";
  if (h < 185) return "teal";
  if (h < 250) return "blue";
  if (h < 290) return "purple";
  return "magenta";
}

export function colorToneLabel(hex: string): string {
  const { r, g, b } = hexToRgb(hex);
  const { s, l } = rgbToHsl(r, g, b);
  if (s < 12) return l > 70 ? "Light Neutral" : l < 30 ? "Dark Neutral" : "Neutral Tone";
  const family = hueFamily(hex);
  if (family === "green" || family === "teal" || family === "blue") return "Cool Tone";
  if (family === "red" || family === "orange" || family === "gold") return "Warm Tone";
  if (family === "purple" || family === "magenta") return l > 55 ? "Soft Tone" : "Deep Tone";
  return "Neutral Tone";
}
