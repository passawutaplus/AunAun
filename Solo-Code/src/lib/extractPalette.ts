import { rgbToHex, type RGB } from "./colorVariations";

interface Pixel {
  r: number;
  g: number;
  b: number;
}

function getRange(pixels: Pixel[]): { channel: "r" | "g" | "b"; range: number } {
  let rMin = 255,
    rMax = 0,
    gMin = 255,
    gMax = 0,
    bMin = 255,
    bMax = 0;
  for (const p of pixels) {
    if (p.r < rMin) rMin = p.r;
    if (p.r > rMax) rMax = p.r;
    if (p.g < gMin) gMin = p.g;
    if (p.g > gMax) gMax = p.g;
    if (p.b < bMin) bMin = p.b;
    if (p.b > bMax) bMax = p.b;
  }
  const rR = rMax - rMin,
    gR = gMax - gMin,
    bR = bMax - bMin;
  if (rR >= gR && rR >= bR) return { channel: "r", range: rR };
  if (gR >= bR) return { channel: "g", range: gR };
  return { channel: "b", range: bR };
}

function average(pixels: Pixel[]): RGB {
  let r = 0,
    g = 0,
    b = 0;
  for (const p of pixels) {
    r += p.r;
    g += p.g;
    b += p.b;
  }
  const n = pixels.length || 1;
  return { r: r / n, g: g / n, b: b / n };
}

function medianCut(pixels: Pixel[], depth: number): RGB[] {
  if (depth === 0 || pixels.length === 0) return [average(pixels)];
  const { channel } = getRange(pixels);
  const sorted = [...pixels].sort((a, b) => a[channel] - b[channel]);
  const mid = Math.floor(sorted.length / 2);
  return [
    ...medianCut(sorted.slice(0, mid), depth - 1),
    ...medianCut(sorted.slice(mid), depth - 1),
  ];
}

/** Extract `count` dominant colors via median-cut quantization. */
export async function extractPaletteFromImage(file: File, count = 6): Promise<string[]> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("โหลดรูปไม่สำเร็จ"));
      i.src = url;
    });
    const max = 200;
    const scale = Math.min(1, max / Math.max(img.width, img.height));
    const w = Math.max(1, Math.round(img.width * scale));
    const h = Math.max(1, Math.round(img.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("ไม่สามารถใช้ canvas");
    ctx.drawImage(img, 0, 0, w, h);
    const data = ctx.getImageData(0, 0, w, h).data;
    const pixels: Pixel[] = [];
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] < 128) continue;
      pixels.push({ r: data[i], g: data[i + 1], b: data[i + 2] });
    }
    if (pixels.length === 0) return [];
    const depth = Math.ceil(Math.log2(count));
    const buckets = medianCut(pixels, depth).slice(0, count);
    return buckets.map(rgbToHex);
  } finally {
    URL.revokeObjectURL(url);
  }
}
