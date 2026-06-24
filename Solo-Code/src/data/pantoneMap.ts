// Approximate Pantone Coated mapping — for visual reference only.
// Calculation uses Delta-E (CIE76) on LAB to find the nearest entry.
// NOTE: Screen RGB → Pantone is inherently approximate. UI should always
// disclaim "ตรวจสอบกับโรงพิมพ์อีกครั้งก่อนสั่งผลิต".

export interface PantoneEntry {
  code: string; // e.g. "PMS 158 C"
  hex: string; // RGB approximation
  deltaE?: number;
}

// Curated set of common Pantone Coated colors (~80 entries) — covers the key
// brand-color zones. Ordered roughly by hue for readability.
const PANTONE_DATA: Array<{ code: string; hex: string }> = [
  { code: "PMS Black 6 C", hex: "#101820" },
  { code: "PMS Cool Gray 11 C", hex: "#53565A" },
  { code: "PMS Cool Gray 6 C", hex: "#A7A8AA" },
  { code: "PMS Cool Gray 3 C", hex: "#C8C9C7" },
  { code: "PMS Warm Gray 5 C", hex: "#A39382" },
  { code: "PMS White", hex: "#FFFFFF" },
  // Reds
  { code: "PMS 185 C", hex: "#E4002B" },
  { code: "PMS 186 C", hex: "#C8102E" },
  { code: "PMS 199 C", hex: "#D50032" },
  { code: "PMS 200 C", hex: "#BA0C2F" },
  { code: "PMS 201 C", hex: "#9D2235" },
  { code: "PMS 202 C", hex: "#862633" },
  { code: "PMS 1797 C", hex: "#CB333B" },
  { code: "PMS 485 C", hex: "#DA291C" },
  { code: "PMS Red 032 C", hex: "#EF3340" },
  // Pinks / Magentas
  { code: "PMS 219 C", hex: "#DA1884" },
  { code: "PMS 226 C", hex: "#D0006F" },
  { code: "PMS 233 C", hex: "#C6007E" },
  { code: "PMS Rhodamine Red C", hex: "#E10098" },
  { code: "PMS 213 C", hex: "#EC008C" },
  { code: "PMS 1905 C", hex: "#F8B8D0" },
  // Oranges
  { code: "PMS Orange 021 C", hex: "#FE5000" },
  { code: "PMS 165 C", hex: "#FF671F" },
  { code: "PMS 158 C", hex: "#E87722" },
  { code: "PMS 151 C", hex: "#FF8200" },
  { code: "PMS 1505 C", hex: "#FF6900" },
  { code: "PMS 144 C", hex: "#ED8B00" },
  { code: "PMS 138 C", hex: "#D57800" },
  // Yellows
  { code: "PMS Yellow C", hex: "#FEDD00" },
  { code: "PMS 109 C", hex: "#FFD100" },
  { code: "PMS 116 C", hex: "#FFCD00" },
  { code: "PMS 123 C", hex: "#FFC72C" },
  { code: "PMS 7549 C", hex: "#FFB81C" },
  { code: "PMS 1235 C", hex: "#FFB81C" },
  // Greens
  { code: "PMS 802 C", hex: "#44D62C" },
  { code: "PMS 354 C", hex: "#00B140" },
  { code: "PMS 355 C", hex: "#009639" },
  { code: "PMS 356 C", hex: "#007A33" },
  { code: "PMS 348 C", hex: "#00843D" },
  { code: "PMS 363 C", hex: "#43B02A" },
  { code: "PMS 7739 C", hex: "#43B02A" },
  { code: "PMS 575 C", hex: "#74AA50" },
  { code: "PMS 5535 C", hex: "#1F3A28" },
  { code: "PMS 561 C", hex: "#00594C" },
  // Teals / Cyans
  { code: "PMS 320 C", hex: "#009CA6" },
  { code: "PMS 321 C", hex: "#008C95" },
  { code: "PMS 326 C", hex: "#00A39B" },
  { code: "PMS 7466 C", hex: "#00B5BD" },
  { code: "PMS Process Cyan C", hex: "#0085CA" },
  // Blues
  { code: "PMS 299 C", hex: "#00A3E0" },
  { code: "PMS 298 C", hex: "#41B6E6" },
  { code: "PMS 285 C", hex: "#0072CE" },
  { code: "PMS 286 C", hex: "#0033A0" },
  { code: "PMS Reflex Blue C", hex: "#001489" },
  { code: "PMS 287 C", hex: "#003DA5" },
  { code: "PMS 288 C", hex: "#002F6C" },
  { code: "PMS 289 C", hex: "#0C2340" },
  { code: "PMS 2728 C", hex: "#0047BB" },
  { code: "PMS 2935 C", hex: "#0057B8" },
  { code: "PMS 660 C", hex: "#1F6CB6" },
  { code: "PMS 661 C", hex: "#1B438D" },
  // Purples
  { code: "PMS Violet C", hex: "#440099" },
  { code: "PMS 268 C", hex: "#582C83" },
  { code: "PMS 2685 C", hex: "#330072" },
  { code: "PMS 266 C", hex: "#5F259F" },
  { code: "PMS 2592 C", hex: "#9B26B6" },
  { code: "PMS 2603 C", hex: "#6E267B" },
  { code: "PMS 527 C", hex: "#6A1B9A" },
  // Browns / Tans
  { code: "PMS 7595 C", hex: "#8E624A" },
  { code: "PMS 4625 C", hex: "#5C462B" },
  { code: "PMS 4695 C", hex: "#603D20" },
  { code: "PMS 469 C", hex: "#693F23" },
  { code: "PMS 729 C", hex: "#B58150" },
  { code: "PMS 7501 C", hex: "#D9C89E" },
  { code: "PMS 7506 C", hex: "#EBD3A0" },
  // Metallics (approx)
  { code: "PMS 871 C", hex: "#85714D" }, // gold
  { code: "PMS 872 C", hex: "#85754E" }, // gold
  { code: "PMS 877 C", hex: "#8A8D8F" }, // silver
  { code: "PMS 8003 C", hex: "#988F8E" }, // silver
];

// ---- Color science helpers (sRGB → LAB, Delta-E CIE76) ----

function srgbToLinear(v: number): number {
  const x = v / 255;
  return x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
}

function rgbToXyz(r: number, g: number, b: number): [number, number, number] {
  const R = srgbToLinear(r);
  const G = srgbToLinear(g);
  const B = srgbToLinear(b);
  // sRGB D65
  const x = R * 0.4124564 + G * 0.3575761 + B * 0.1804375;
  const y = R * 0.2126729 + G * 0.7151522 + B * 0.072175;
  const z = R * 0.0193339 + G * 0.119192 + B * 0.9503041;
  return [x * 100, y * 100, z * 100];
}

function xyzToLab(x: number, y: number, z: number): [number, number, number] {
  // D65 reference white
  const Xn = 95.047;
  const Yn = 100.0;
  const Zn = 108.883;
  const fx = labF(x / Xn);
  const fy = labF(y / Yn);
  const fz = labF(z / Zn);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

function labF(t: number): number {
  return t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116;
}

function hexToRgb(hex: string): [number, number, number] {
  const v = hex.replace("#", "");
  const r = parseInt(v.slice(0, 2), 16);
  const g = parseInt(v.slice(2, 4), 16);
  const b = parseInt(v.slice(4, 6), 16);
  return [r, g, b];
}

function hexToLab(hex: string): [number, number, number] {
  const [r, g, b] = hexToRgb(hex);
  const [x, y, z] = rgbToXyz(r, g, b);
  return xyzToLab(x, y, z);
}

function deltaE76(a: [number, number, number], b: [number, number, number]): number {
  const dL = a[0] - b[0];
  const da = a[1] - b[1];
  const db = a[2] - b[2];
  return Math.sqrt(dL * dL + da * da + db * db);
}

// Precompute LABs for Pantone entries
const PANTONE_LAB: Array<PantoneEntry & { lab: [number, number, number] }> = PANTONE_DATA.map(
  (e) => ({ ...e, lab: hexToLab(e.hex) }),
);

/** Find nearest Pantone Coated approximation for a hex color. */
export function findNearestPantone(hex: string): PantoneEntry {
  const target = hexToLab(hex);
  let best = PANTONE_LAB[0];
  let bestD = Infinity;
  for (const p of PANTONE_LAB) {
    const d = deltaE76(target, p.lab);
    if (d < bestD) {
      bestD = d;
      best = p;
    }
  }
  return { code: best.code, hex: best.hex, deltaE: Math.round(bestD * 10) / 10 };
}
