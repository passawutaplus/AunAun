import { hexToRgb, rgbToHex, type RGB } from "./colorVariations";

export interface HSL {
  h: number;
  s: number;
  l: number;
}

export function rgbToHsl({ r, g, b }: RGB): HSL {
  const R = r / 255,
    G = g / 255,
    B = b / 255;
  const max = Math.max(R, G, B),
    min = Math.min(R, G, B);
  let h = 0,
    s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case R:
        h = (G - B) / d + (G < B ? 6 : 0);
        break;
      case G:
        h = (B - R) / d + 2;
        break;
      case B:
        h = (R - G) / d + 4;
        break;
    }
    h *= 60;
  }
  return { h, s: s * 100, l: l * 100 };
}

export function hslToRgb({ h, s, l }: HSL): RGB {
  const S = s / 100,
    L = l / 100;
  const c = (1 - Math.abs(2 * L - 1)) * S;
  const hp = (((h % 360) + 360) % 360) / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r = 0,
    g = 0,
    b = 0;
  if (hp < 1) {
    r = c;
    g = x;
  } else if (hp < 2) {
    r = x;
    g = c;
  } else if (hp < 3) {
    g = c;
    b = x;
  } else if (hp < 4) {
    g = x;
    b = c;
  } else if (hp < 5) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }
  const m = L - c / 2;
  return { r: (r + m) * 255, g: (g + m) * 255, b: (b + m) * 255 };
}

export function hexToHsl(hex: string): HSL | null {
  const rgb = hexToRgb(hex);
  return rgb ? rgbToHsl(rgb) : null;
}

export function hslToHex(hsl: HSL): string {
  return rgbToHex(hslToRgb(hsl));
}

function mix(a: RGB, b: RGB, t: number): RGB {
  const k = Math.max(0, Math.min(1, t));
  return { r: a.r + (b.r - a.r) * k, g: a.g + (b.g - a.g) * k, b: a.b + (b.b - a.b) * k };
}

export interface MixState {
  hue: number;
  tint: number;
  shade: number;
  tone: number;
}

/** Compose hex from hue (0..360) + tone/tint/shade (0..100). */
export function composeMix(m: MixState): string {
  let rgb = hslToRgb({ h: m.hue, s: 100, l: 50 });
  rgb = mix(rgb, { r: 128, g: 128, b: 128 }, m.tone / 100);
  rgb = mix(rgb, { r: 255, g: 255, b: 255 }, m.tint / 100);
  rgb = mix(rgb, { r: 0, g: 0, b: 0 }, m.shade / 100);
  return rgbToHex(rgb);
}

/** Best-effort inverse: derive hue from hex; reset tint/shade/tone to 0. */
export function deriveMixFromHex(hex: string): MixState {
  const hsl = hexToHsl(hex);
  return { hue: hsl ? hsl.h : 0, tint: 0, shade: 0, tone: 0 };
}

export type RandomMode = "pastel" | "vibrant" | "dark" | "surprise";

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

export function randomizePalette(mode: RandomMode, count = 3): string[] {
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    const h = rand(0, 360);
    let s = 70,
      l = 50;
    if (mode === "pastel") {
      s = rand(40, 60);
      l = rand(75, 85);
    } else if (mode === "vibrant") {
      s = rand(80, 100);
      l = rand(45, 60);
    } else if (mode === "dark") {
      s = rand(30, 50);
      l = rand(15, 30);
    } else {
      s = rand(20, 100);
      l = rand(20, 85);
    }
    out.push(hslToHex({ h, s, l }));
  }
  return out;
}
