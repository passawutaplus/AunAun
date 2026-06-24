import { hexToRgb, rgbToHex, type RGB } from "./colorVariations";

export type CvdType = "normal" | "protanopia" | "deuteranopia" | "tritanopia";

// Common simplified Brettel-style transforms applied directly in sRGB space.
// Approximations only — good enough for design preview.
const MATRICES: Record<Exclude<CvdType, "normal">, number[][]> = {
  protanopia: [
    [0.567, 0.433, 0.0],
    [0.558, 0.442, 0.0],
    [0.0, 0.242, 0.758],
  ],
  deuteranopia: [
    [0.625, 0.375, 0.0],
    [0.7, 0.3, 0.0],
    [0.0, 0.3, 0.7],
  ],
  tritanopia: [
    [0.95, 0.05, 0.0],
    [0.0, 0.433, 0.567],
    [0.0, 0.475, 0.525],
  ],
};

export function simulateRgb(rgb: RGB, type: CvdType): RGB {
  if (type === "normal") return rgb;
  const m = MATRICES[type];
  return {
    r: m[0][0] * rgb.r + m[0][1] * rgb.g + m[0][2] * rgb.b,
    g: m[1][0] * rgb.r + m[1][1] * rgb.g + m[1][2] * rgb.b,
    b: m[2][0] * rgb.r + m[2][1] * rgb.g + m[2][2] * rgb.b,
  };
}

export function simulateHex(hex: string, type: CvdType): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  return rgbToHex(simulateRgb(rgb, type));
}

export const CVD_LABELS: Record<CvdType, string> = {
  normal: "ปกติ",
  protanopia: "Protanopia (แดงบอด)",
  deuteranopia: "Deuteranopia (เขียวบอด)",
  tritanopia: "Tritanopia (น้ำเงินบอด)",
};
