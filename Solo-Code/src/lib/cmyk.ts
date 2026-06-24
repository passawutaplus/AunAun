// HEX → RGB / CMYK helpers (client-side approximation; not press-accurate)
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace("#", "").trim();
  const v =
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h;
  const n = parseInt(v, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export function rgbToCmyk(r: number, g: number, b: number) {
  const rn = r / 255,
    gn = g / 255,
    bn = b / 255;
  const k = 1 - Math.max(rn, gn, bn);
  if (k === 1) return { c: 0, m: 0, y: 0, k: 100 };
  const c = (1 - rn - k) / (1 - k);
  const m = (1 - gn - k) / (1 - k);
  const y = (1 - bn - k) / (1 - k);
  return {
    c: Math.round(c * 100),
    m: Math.round(m * 100),
    y: Math.round(y * 100),
    k: Math.round(k * 100),
  };
}

export function hexToCmykString(hex: string) {
  const { r, g, b } = hexToRgb(hex);
  const { c, m, y, k } = rgbToCmyk(r, g, b);
  return `C${c} M${m} Y${y} K${k}`;
}

export function hexToRgbString(hex: string) {
  const { r, g, b } = hexToRgb(hex);
  return `${r}, ${g}, ${b}`;
}

// Approximate CMYK→RGB round-trip drift (0-100). Higher = bigger shift in print.
// Uses naive CMYK→RGB inverse (no ICC profile) so this is a heuristic only.
export function cmykDriftPercent(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const { c, m, y, k } = rgbToCmyk(r, g, b);
  const cn = c / 100,
    mn = m / 100,
    yn = y / 100,
    kn = k / 100;
  const r2 = Math.round(255 * (1 - cn) * (1 - kn));
  const g2 = Math.round(255 * (1 - mn) * (1 - kn));
  const b2 = Math.round(255 * (1 - yn) * (1 - kn));
  const dr = r - r2,
    dg = g - g2,
    db = b - b2;
  const dist = Math.sqrt(dr * dr + dg * dg + db * db); // 0..~441
  return Math.min(100, Math.round((dist / 441) * 100));
}
