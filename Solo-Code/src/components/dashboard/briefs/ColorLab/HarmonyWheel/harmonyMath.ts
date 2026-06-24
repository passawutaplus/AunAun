import { colord } from "colord";

export type HarmonyMode =
  | "complementary"
  | "analogous"
  | "triadic"
  | "split"
  | "tetradic"
  | "square";

export const HARMONY_MODES: { id: HarmonyMode; label: string; offsets: number[] }[] = [
  { id: "complementary", label: "Complementary", offsets: [0, 180] },
  { id: "analogous", label: "Analogous", offsets: [-30, 0, 30] },
  { id: "triadic", label: "Triadic", offsets: [0, 120, 240] },
  { id: "split", label: "Split-Complementary", offsets: [0, 150, 210] },
  { id: "tetradic", label: "Tetradic", offsets: [0, 60, 180, 240] },
  { id: "square", label: "Square", offsets: [0, 90, 180, 270] },
];

/** Compute harmony hex array from a base hex + mode. */
export function computeHarmony(baseHex: string, mode: HarmonyMode): string[] {
  const def = HARMONY_MODES.find((m) => m.id === mode);
  if (!def) return [baseHex];
  const c = colord(baseHex);
  const baseHsv = c.toHsv();
  return def.offsets.map((deg) => {
    const h = (((baseHsv.h + deg) % 360) + 360) % 360;
    return colord({ h, s: baseHsv.s, v: baseHsv.v }).toHex().toUpperCase();
  });
}

/** Build a 5-color palette: harmony colors padded with tints/shades of base. */
export function buildPalette5(baseHex: string, mode: HarmonyMode): string[] {
  const harmony = computeHarmony(baseHex, mode);
  const out = [...harmony];
  const c = colord(baseHex);
  const helpers = [
    c.lighten(0.2).toHex().toUpperCase(),
    c.darken(0.2).toHex().toUpperCase(),
    c.desaturate(0.3).toHex().toUpperCase(),
  ];
  let i = 0;
  while (out.length < 5 && i < helpers.length) {
    if (!out.includes(helpers[i])) out.push(helpers[i]);
    i++;
  }
  while (out.length < 5) out.push(baseHex);
  return out.slice(0, 5);
}
