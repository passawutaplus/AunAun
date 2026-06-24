import { normalizeHex } from "./colorUtils";

export interface RGB {
  r: number;
  g: number;
  b: number;
}
export interface LAB {
  L: number;
  a: number;
  b: number;
}

export function hexToRgb(hex: string): RGB | null {
  const n = normalizeHex(hex);
  if (!n) return null;
  return {
    r: parseInt(n.slice(1, 3), 16),
    g: parseInt(n.slice(3, 5), 16),
    b: parseInt(n.slice(5, 7), 16),
  };
}

export function rgbToHex({ r, g, b }: RGB): string {
  const c = (v: number) =>
    Math.max(0, Math.min(255, Math.round(v)))
      .toString(16)
      .padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`.toUpperCase();
}

function mix(a: RGB, b: RGB, t: number): RGB {
  return {
    r: a.r + (b.r - a.r) * t,
    g: a.g + (b.g - a.g) * t,
    b: a.b + (b.b - a.b) * t,
  };
}

/** Generate `count` swatches from base → target. `maxRatio` (0..1) caps the furthest mix. */
function ramp(base: RGB, target: RGB, count: number, maxRatio = 1): string[] {
  const out: string[] = [];
  const cap = Math.max(0, Math.min(1, maxRatio));
  for (let i = 1; i <= count; i++) {
    out.push(rgbToHex(mix(base, target, (i / count) * cap)));
  }
  return out;
}

export function tints(hex: string, count = 10, maxRatio = 1): string[] {
  const rgb = hexToRgb(hex);
  if (!rgb) return [];
  return ramp(rgb, { r: 255, g: 255, b: 255 }, count, maxRatio);
}

export function shades(hex: string, count = 10, maxRatio = 1): string[] {
  const rgb = hexToRgb(hex);
  if (!rgb) return [];
  return ramp(rgb, { r: 0, g: 0, b: 0 }, count, maxRatio);
}

/** Tones blend toward neutral mid-gray (128,128,128). */
export function tones(hex: string, count = 10, maxRatio = 1): string[] {
  const rgb = hexToRgb(hex);
  if (!rgb) return [];
  return ramp(rgb, { r: 128, g: 128, b: 128 }, count, maxRatio);
}

// ===== sRGB → CIELAB (D65) =====
function srgbToLinear(v: number): number {
  const x = v / 255;
  return x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
}

export function rgbToLab(rgb: RGB): LAB {
  const r = srgbToLinear(rgb.r);
  const g = srgbToLinear(rgb.g);
  const b = srgbToLinear(rgb.b);
  // sRGB → XYZ (D65)
  const X = (r * 0.4124564 + g * 0.3575761 + b * 0.1804375) / 0.95047;
  const Y = r * 0.2126729 + g * 0.7151522 + b * 0.072175;
  const Z = (r * 0.0193339 + g * 0.119192 + b * 0.9503041) / 1.08883;
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const fx = f(X),
    fy = f(Y),
    fz = f(Z);
  return { L: 116 * fy - 16, a: 500 * (fx - fy), b: 200 * (fy - fz) };
}

export function deltaE(a: LAB, b: LAB): number {
  const dL = a.L - b.L;
  const da = a.a - b.a;
  const db = a.b - b.b;
  return Math.sqrt(dL * dL + da * da + db * db);
}

export function hexToLab(hex: string): LAB | null {
  const rgb = hexToRgb(hex);
  return rgb ? rgbToLab(rgb) : null;
}

// ===== WCAG 2.1 contrast =====
export function relativeLuminance(rgb: RGB): number {
  const r = srgbToLinear(rgb.r);
  const g = srgbToLinear(rgb.g);
  const b = srgbToLinear(rgb.b);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: RGB, b: RGB): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

export function hexContrast(hexA: string, hexB: string): number {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  if (!a || !b) return 1;
  return contrastRatio(a, b);
}

export interface WcagStatus {
  ratio: number;
  aaNormal: boolean;
  aaLarge: boolean;
  aaaNormal: boolean;
  aaaLarge: boolean;
}

export function wcagStatus(ratio: number): WcagStatus {
  return {
    ratio,
    aaNormal: ratio >= 4.5,
    aaLarge: ratio >= 3,
    aaaNormal: ratio >= 7,
    aaaLarge: ratio >= 4.5,
  };
}

// ===== Shade / Tint / Tone single-value mixers (t in 0..1) =====
function mixHex(hex: string, target: RGB, t: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  return rgbToHex(mix(rgb, target, Math.max(0, Math.min(1, t))));
}

export function applyShade(hex: string, t: number): string {
  return mixHex(hex, { r: 0, g: 0, b: 0 }, t);
}
export function applyTint(hex: string, t: number): string {
  return mixHex(hex, { r: 255, g: 255, b: 255 }, t);
}
export function applyTone(hex: string, t: number): string {
  return mixHex(hex, { r: 128, g: 128, b: 128 }, t);
}
