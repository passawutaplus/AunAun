// Centralized color utilities for Smart Brief & Color Lab
import { colord, extend } from "colord";
import cmykPlugin from "colord/plugins/cmyk";
import namesPlugin from "colord/plugins/names";
import a11yPlugin from "colord/plugins/a11y";
import { findNearestPantone, type PantoneEntry } from "@/data/pantoneMap";

extend([cmykPlugin, namesPlugin, a11yPlugin]);

export interface ColorBreakdown {
  hex: string;
  rgb: { r: number; g: number; b: number; css: string };
  hsl: { h: number; s: number; l: number; css: string };
  cmyk: { c: number; m: number; y: number; k: number; css: string };
  pantone: PantoneEntry;
  name?: string;
  contrastWhite: number;
  contrastBlack: number;
  wcag: {
    onWhite: { aa: boolean; aaa: boolean; aaLarge: boolean };
    onBlack: { aa: boolean; aaa: boolean; aaLarge: boolean };
  };
}

const HEX_RE = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;

/** Validate any hex-like string (with/without #, 3 or 6 chars). */
export function isValidHex(input: unknown): input is string {
  return typeof input === "string" && HEX_RE.test(input.trim());
}

/** Normalize to canonical `#RRGGBB` uppercase, or null if invalid. */
export function normalizeHex(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const v = input.trim();
  if (!HEX_RE.test(v)) return null;
  const hex = v.startsWith("#") ? v.slice(1) : v;
  const full =
    hex.length === 3
      ? hex
          .split("")
          .map((c) => c + c)
          .join("")
      : hex;
  return "#" + full.toUpperCase();
}

/** Normalize an array of hex strings — drops invalid + dedupes. */
export function normalizeHexArray(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const v of input) {
    const n = normalizeHex(v);
    if (n && !seen.has(n)) {
      seen.add(n);
      out.push(n);
    }
  }
  return out;
}

/** Rich color breakdown for Color Lab tables. */
export function getColorBreakdown(hex: string): ColorBreakdown | null {
  const n = normalizeHex(hex);
  if (!n) return null;
  const c = colord(n);
  const rgb = c.toRgb();
  const hsl = c.toHsl();
  const cmyk = c.toCmyk();
  const pantone = findNearestPantone(n);
  const onWhite = c.contrast("#ffffff");
  const onBlack = c.contrast("#000000");
  return {
    hex: n,
    rgb: { r: rgb.r, g: rgb.g, b: rgb.b, css: `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})` },
    hsl: {
      h: Math.round(hsl.h),
      s: Math.round(hsl.s),
      l: Math.round(hsl.l),
      css: `hsl(${Math.round(hsl.h)}, ${Math.round(hsl.s)}%, ${Math.round(hsl.l)}%)`,
    },
    cmyk: {
      c: cmyk.c,
      m: cmyk.m,
      y: cmyk.y,
      k: cmyk.k,
      css: `cmyk(${cmyk.c}%, ${cmyk.m}%, ${cmyk.y}%, ${cmyk.k}%)`,
    },
    pantone,
    name: c.toName({ closest: true }),
    contrastWhite: Math.round(onWhite * 100) / 100,
    contrastBlack: Math.round(onBlack * 100) / 100,
    wcag: {
      onWhite: {
        aa: onWhite >= 4.5,
        aaa: onWhite >= 7,
        aaLarge: onWhite >= 3,
      },
      onBlack: {
        aa: onBlack >= 4.5,
        aaa: onBlack >= 7,
        aaLarge: onBlack >= 3,
      },
    },
  };
}

/** True when the color is dark enough that white text reads better than black. */
export function preferWhiteText(hex: string): boolean {
  const n = normalizeHex(hex);
  if (!n) return false;
  return colord(n).isDark();
}

/** Get complementary (opposite hue) hex. */
export function getComplementary(hex: string): string | null {
  const n = normalizeHex(hex);
  if (!n) return null;
  return colord(n).rotate(180).toHex().toUpperCase();
}

/** Curated palette presets grouped by mood for Color Lab picker. */
export const COLOR_PALETTE_GROUPS: Array<{ group: string; colors: string[] }> = [
  {
    group: "Brand / So1o",
    colors: ["#FF6B00", "#0F172A", "#FFFFFF", "#F8FAFC", "#3B82F6", "#10B981"],
  },
  {
    group: "Pastel",
    colors: ["#FFD6E0", "#FFEFCF", "#D6F5D6", "#CFE8FF", "#E5D4FF", "#FFE4C7"],
  },
  {
    group: "Neon",
    colors: ["#FF1493", "#00FF87", "#00E5FF", "#FFFF00", "#FF6EC7", "#7CFC00"],
  },
  {
    group: "Earth Tone",
    colors: ["#8B5E3C", "#C4A484", "#A47551", "#6B8E23", "#4A6741", "#D4A373"],
  },
  {
    group: "Corporate",
    colors: ["#0F172A", "#1E3A8A", "#0E7490", "#475569", "#94A3B8", "#E2E8F0"],
  },
  {
    group: "Sunset",
    colors: ["#FF6B35", "#F7931E", "#E84393", "#6C5CE7", "#FFD166", "#EF476F"],
  },
];
