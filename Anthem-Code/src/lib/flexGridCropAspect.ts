/** Aspect presets for Full Grid module image crop. */
export type FlexGridCropAspectKey = "1:1" | "16:9" | "9:16" | "4:3" | "3:4" | "free";

export type FlexGridCropAspectMeta = {
  key: FlexGridCropAspectKey;
  label: string;
  /** null = free-form (no locked ratio). */
  ratio: number | null;
  exportW: number;
  exportH: number;
};

export const FLEX_GRID_CROP_ASPECTS: Record<FlexGridCropAspectKey, FlexGridCropAspectMeta> = {
  "1:1": { key: "1:1", label: "1:1", ratio: 1, exportW: 1080, exportH: 1080 },
  "16:9": { key: "16:9", label: "16:9", ratio: 16 / 9, exportW: 1920, exportH: 1080 },
  "9:16": { key: "9:16", label: "9:16", ratio: 9 / 16, exportW: 1080, exportH: 1920 },
  "4:3": { key: "4:3", label: "4:3", ratio: 4 / 3, exportW: 1600, exportH: 1200 },
  "3:4": { key: "3:4", label: "3:4", ratio: 3 / 4, exportW: 1200, exportH: 1600 },
  free: { key: "free", label: "Free", ratio: null, exportW: 1600, exportH: 1600 },
};

export const FLEX_GRID_CROP_ASPECT_ORDER: FlexGridCropAspectKey[] = [
  "free",
  "1:1",
  "16:9",
  "9:16",
  "4:3",
  "3:4",
];

export const DEFAULT_FLEX_GRID_CROP_ASPECT: FlexGridCropAspectKey = "free";

/** Long-edge export size from a free-form pixel crop. */
export function exportSizeFromCropPixels(
  width: number,
  height: number,
  longEdge = 1600,
): { width: number; height: number } {
  const w = Math.max(1, width);
  const h = Math.max(1, height);
  const r = w / h;
  if (r >= 1) {
    return { width: longEdge, height: Math.max(1, Math.round(longEdge / r)) };
  }
  return { width: Math.max(1, Math.round(longEdge * r)), height: longEdge };
}

/**
 * Fit a crop frame into the container at `scale` (0–1), locked to `ratio`
 * (width/height). Pass an explicit free ratio when aspect is Free.
 */
export function computeCropSize(
  containerW: number,
  containerH: number,
  ratio: number,
  scale: number,
): { width: number; height: number } {
  const pad = 0.92;
  const maxW = Math.max(40, containerW * pad);
  const maxH = Math.max(40, containerH * pad);
  const s = Math.min(1, Math.max(0.25, scale));
  const r = Number.isFinite(ratio) && ratio > 0 ? ratio : 1;

  let w: number;
  let h: number;
  if (maxW / maxH > r) {
    h = maxH;
    w = h * r;
  } else {
    w = maxW;
    h = w / r;
  }
  return { width: Math.round(w * s), height: Math.round(h * s) };
}

/**
 * Resize a flex-grid module box to match a crop aspect, keeping top-left and
 * fitting inside the board / canvas. Prefers keeping current width when possible.
 */
export function sizeModuleToAspect(
  mod: { x: number; y: number; w: number; h: number },
  aspect: number,
  canvasWidth: number,
  boardHeight: number,
): { w: number; h: number } {
  const r = Number.isFinite(aspect) && aspect > 0 ? aspect : 1;
  const maxW = Math.max(40, canvasWidth - mod.x);
  const maxH = Math.max(20, boardHeight - mod.y);

  let w = Math.min(maxW, Math.max(40, mod.w));
  let h = w / r;
  if (h > maxH) {
    h = maxH;
    w = h * r;
  }
  if (w > maxW) {
    w = maxW;
    h = w / r;
  }
  if (h < 20) {
    h = 20;
    w = Math.min(maxW, h * r);
  }
  if (w < 40) {
    w = 40;
    h = Math.min(maxH, w / r);
  }
  return { w: Math.round(w), h: Math.round(h) };
}
