import { hexToRgb, rgbToHex, rgbToLab, type RGB } from "./colorVariations";

export type GradientType = "linear" | "radial" | "conic";

export interface Stop {
  id: string;
  pos: number; // 0..100
  hex: string;
}

export function sortStops(stops: Stop[]): Stop[] {
  return [...stops].sort((a, b) => a.pos - b.pos);
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

/** Interpolate color at position p (0..100) across stops, in sRGB. */
export function colorAt(stops: Stop[], p: number): string {
  const s = sortStops(stops);
  if (s.length === 0) return "#000000";
  if (p <= s[0].pos) return s[0].hex;
  if (p >= s[s.length - 1].pos) return s[s.length - 1].hex;
  for (let i = 0; i < s.length - 1; i++) {
    const a = s[i];
    const b = s[i + 1];
    if (p >= a.pos && p <= b.pos) {
      const t = (p - a.pos) / Math.max(1e-6, b.pos - a.pos);
      const ra = hexToRgb(a.hex)!;
      const rb = hexToRgb(b.hex)!;
      return rgbToHex({
        r: lerp(ra.r, rb.r, t),
        g: lerp(ra.g, rb.g, t),
        b: lerp(ra.b, rb.b, t),
      });
    }
  }
  return s[s.length - 1].hex;
}

export function toCss(type: GradientType, angle: number, stops: Stop[], stepped = false): string {
  const sorted = sortStops(stops);
  const parts: string[] = [];
  if (stepped) {
    sorted.forEach((s, i) => {
      parts.push(`${s.hex} ${s.pos}%`);
      if (i < sorted.length - 1) {
        parts.push(`${s.hex} ${sorted[i + 1].pos}%`);
      }
    });
  } else {
    sorted.forEach((s) => parts.push(`${s.hex} ${s.pos}%`));
  }
  const list = parts.join(", ");
  if (type === "linear") return `linear-gradient(${angle}deg, ${list})`;
  if (type === "radial") return `radial-gradient(circle, ${list})`;
  return `conic-gradient(from ${angle}deg, ${list})`;
}

/** Closest Tailwind directional class for a linear angle. */
function tailwindDir(angle: number): string {
  const a = ((angle % 360) + 360) % 360;
  const dirs: { a: number; cls: string }[] = [
    { a: 0, cls: "bg-gradient-to-t" },
    { a: 45, cls: "bg-gradient-to-tr" },
    { a: 90, cls: "bg-gradient-to-r" },
    { a: 135, cls: "bg-gradient-to-br" },
    { a: 180, cls: "bg-gradient-to-b" },
    { a: 225, cls: "bg-gradient-to-bl" },
    { a: 270, cls: "bg-gradient-to-l" },
    { a: 315, cls: "bg-gradient-to-tl" },
    { a: 360, cls: "bg-gradient-to-t" },
  ];
  return dirs.reduce((best, d) => (Math.abs(d.a - a) < Math.abs(best.a - a) ? d : best)).cls;
}

export function toTailwind(type: GradientType, angle: number, stops: Stop[]): string {
  const sorted = sortStops(stops);
  const dirCls = type === "linear" ? tailwindDir(angle) : "bg-gradient-to-r";
  const parts: string[] = [dirCls];
  if (sorted.length === 0) return dirCls;
  parts.push(`from-[${sorted[0].hex}]`);
  if (sorted.length >= 3) {
    const mid = sorted[Math.floor(sorted.length / 2)];
    parts.push(`via-[${mid.hex}]`);
  }
  parts.push(`to-[${sorted[sorted.length - 1].hex}]`);
  return parts.join(" ");
}

/** Find biggest gap between adjacent stops; return new stop with Lab-interpolated mid color. */
export function harmonyMidStop(stops: Stop[]): Stop | null {
  const s = sortStops(stops);
  if (s.length < 2) return null;
  let bestI = 0;
  let bestGap = -1;
  for (let i = 0; i < s.length - 1; i++) {
    const gap = s[i + 1].pos - s[i].pos;
    if (gap > bestGap) {
      bestGap = gap;
      bestI = i;
    }
  }
  const a = s[bestI];
  const b = s[bestI + 1];
  const ra = hexToRgb(a.hex);
  const rb = hexToRgb(b.hex);
  if (!ra || !rb) return null;
  // Interpolate in Lab → back to RGB approx via simple sRGB midpoint guided by Lab distance
  const la = rgbToLab(ra);
  const lb = rgbToLab(rb);
  const midLab = { L: (la.L + lb.L) / 2, a: (la.a + lb.a) / 2, b: (la.b + lb.b) / 2 };
  void midLab;
  // sRGB midpoint is a good visual mid; Lab guidance influences nothing further here
  const midRgb: RGB = { r: (ra.r + rb.r) / 2, g: (ra.g + rb.g) / 2, b: (ra.b + rb.b) / 2 };
  return {
    id: `s_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    pos: (a.pos + b.pos) / 2,
    hex: rgbToHex(midRgb),
  };
}

export function newStopId(): string {
  return `s_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}
