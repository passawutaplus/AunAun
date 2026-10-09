/** Match a picked color against cover palettes. Palettes are measured from pixels, never guessed from the URL. */

import { rgbToHsl } from "@/lib/imagePalette";

export type PaletteStop = { h: number; s: number; l: number; weight: number };

/** Chromatic hues farther than ~36° are not "nearby". */
export const COLOR_MATCH_MIN = 0.62;

const listeners = new Set<() => void>();
const cache = new Map<string, PaletteStop[] | null>();
const inflight = new Map<string, Promise<PaletteStop[] | null>>();
const queue = new Set<string>();
let pumping = false;

export function subscribeSearchPalettes(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function emitPalettes() {
  for (const listener of listeners) listener();
}

/** `undefined` = not measured yet. `null` = image could not be read. */
export function peekSearchPalette(url: string): PaletteStop[] | null | undefined {
  if (!cache.has(url)) return undefined;
  return cache.get(url) ?? null;
}

export function normalizeColorQuery(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let hex = raw.trim().toLowerCase();
  if (!hex) return null;
  if (!hex.startsWith("#")) hex = `#${hex}`;
  if (/^#[0-9a-f]{3}$/.test(hex)) {
    hex = `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`;
  }
  return /^#[0-9a-f]{6}$/.test(hex) ? hex : null;
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const normalized = normalizeColorQuery(hex);
  if (!normalized) return null;
  return {
    r: Number.parseInt(normalized.slice(1, 3), 16),
    g: Number.parseInt(normalized.slice(3, 5), 16),
    b: Number.parseInt(normalized.slice(5, 7), 16),
  };
}

export function hexToHsl(hex: string): { h: number; s: number; l: number } | null {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  return rgbToHsl(rgb.r, rgb.g, rgb.b);
}

export function hsvToRgb(h: number, s: number, v: number): { r: number; g: number; b: number } {
  const sat = clamp(s, 0, 100) / 100;
  const val = clamp(v, 0, 100) / 100;
  const c = val * sat;
  const hh = (((h % 360) + 360) % 360) / 60;
  const x = c * (1 - Math.abs((hh % 2) - 1));
  let r = 0;
  let g = 0;
  let b = 0;
  if (hh < 1) [r, g, b] = [c, x, 0];
  else if (hh < 2) [r, g, b] = [x, c, 0];
  else if (hh < 3) [r, g, b] = [0, c, x];
  else if (hh < 4) [r, g, b] = [0, x, c];
  else if (hh < 5) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const m = val - c;
  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  };
}

export function rgbToHsv(r: number, g: number, b: number): { h: number; s: number; v: number } {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    switch (max) {
      case rn:
        h = (gn - bn) / d + (gn < bn ? 6 : 0);
        break;
      case gn:
        h = (bn - rn) / d + 2;
        break;
      default:
        h = (rn - gn) / d + 4;
    }
    h *= 60;
  }
  return { h, s: max === 0 ? 0 : (d / max) * 100, v: max * 100 };
}

export function hsvToHex(h: number, s: number, v: number): string {
  const { r, g, b } = hsvToRgb(h, s, v);
  return `#${toByte(r)}${toByte(g)}${toByte(b)}`;
}

export function hexToHsv(hex: string): { h: number; s: number; v: number } | null {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  return rgbToHsv(rgb.r, rgb.g, rgb.b);
}

function hueCloseness(a: number, b: number): number {
  const d = Math.abs(a - b) % 360;
  const dist = d > 180 ? 360 - d : d;
  return 1 - dist / 180;
}

function pairScore(
  query: { h: number; s: number; l: number },
  stop: PaletteStop,
): number | null {
  const hue = hueCloseness(query.h, stop.h);
  const sat = 1 - Math.min(1, Math.abs(query.s - stop.s) / 100);
  const light = 1 - Math.min(1, Math.abs(query.l - stop.l) / 100);
  const queryNeutral = query.s < 14;
  const stopNeutral = stop.s < 14;
  if (queryNeutral || stopNeutral) {
    if (Math.abs(query.s - stop.s) > 28) return null;
    if (Math.abs(query.l - stop.l) > 22) return null;
    return light * 0.8 + sat * 0.2;
  }
  if (hue < 0.8) return null;
  return hue * 0.62 + sat * 0.2 + light * 0.18;
}

export function scorePaletteAgainstColor(hex: string, palette: PaletteStop[]): number {
  const query = hexToHsl(hex);
  if (!query || palette.length === 0) return 0;
  let best = 0;
  for (const stop of palette) {
    const pair = pairScore(query, stop);
    if (pair == null) continue;
    const presence = 0.78 + 0.22 * Math.min(1, stop.weight * 4);
    best = Math.max(best, pair * presence);
  }
  return best;
}

export function warmSearchPalettes(urls: string[]): void {
  for (const url of urls) {
    if (!url || cache.has(url) || inflight.has(url)) continue;
    queue.add(url);
  }
  if (pumping) return;
  pumping = true;
  void pump();
}

async function pump() {
  try {
    while (queue.size > 0) {
      const batch = Array.from(queue).slice(0, 4);
      for (const url of batch) queue.delete(url);
      await Promise.all(batch.map((url) => extractSearchPalette(url)));
      emitPalettes();
    }
  } finally {
    pumping = false;
    if (queue.size > 0) {
      pumping = true;
      void pump();
    }
  }
}

export function extractSearchPalette(url: string): Promise<PaletteStop[] | null> {
  if (!url) return Promise.resolve(null);
  if (cache.has(url)) return Promise.resolve(cache.get(url) ?? null);
  const pending = inflight.get(url);
  if (pending) return pending;
  const task = readPalette(url)
    .then((palette) => {
      cache.set(url, palette);
      return palette;
    })
    .catch(() => {
      cache.set(url, null);
      return null;
    })
    .finally(() => {
      inflight.delete(url);
    });
  inflight.set(url, task);
  return task;
}

function readPalette(url: string): Promise<PaletteStop[] | null> {
  if (typeof document === "undefined") return Promise.resolve(null);
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.decoding = "async";
    const finish = (value: PaletteStop[] | null) => {
      window.clearTimeout(timer);
      resolve(value);
    };
    const timer = window.setTimeout(() => finish(null), 8000);
    img.onerror = () => finish(null);
    img.onload = () => {
      try {
        const size = 48;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) {
          finish(null);
          return;
        }
        ctx.drawImage(img, 0, 0, size, size);
        const { data } = ctx.getImageData(0, 0, size, size);
        const buckets = new Map<number, { h: number; s: number; l: number; count: number }>();
        let opaque = 0;
        for (let i = 0; i < data.length; i += 4) {
          if (data[i + 3]! < 40) continue;
          opaque += 1;
          const hsl = rgbToHsl(data[i]!, data[i + 1]!, data[i + 2]!);
          const id = hsl.s < 12 ? 1000 + Math.round(hsl.l / 8) : Math.round(hsl.h / 12);
          const prev = buckets.get(id) ?? { h: 0, s: 0, l: 0, count: 0 };
          prev.h += hsl.h;
          prev.s += hsl.s;
          prev.l += hsl.l;
          prev.count += 1;
          buckets.set(id, prev);
        }
        if (opaque < 8) {
          finish(null);
          return;
        }
        const palette = Array.from(buckets.values())
          .sort((a, b) => b.count - a.count)
          .slice(0, 5)
          .map((bucket) => ({
            h: bucket.h / bucket.count,
            s: bucket.s / bucket.count,
            l: bucket.l / bucket.count,
            weight: bucket.count / opaque,
          }));
        finish(palette.length ? palette : null);
      } catch {
        finish(null);
      }
    };
    img.src = url;
  });
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function toByte(n: number): string {
  return clamp(Math.round(n), 0, 255).toString(16).padStart(2, "0");
}
