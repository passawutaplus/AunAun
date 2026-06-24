// Lightweight client-side color extraction from an image URL.
// Samples pixels via canvas, quantizes to N dominant colors using
// a simple bucket-average approach (no external dependency).

function rgbToHex(r: number, g: number, b: number): string {
  const h = (n: number) => n.toString(16).padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}`;
}

export async function extractPalette(url: string, count = 5): Promise<string[]> {
  if (!url) return [];
  try {
    const img = await loadImage(url);
    const canvas = document.createElement("canvas");
    const w = 80;
    const h = Math.max(1, Math.round((img.height / img.width) * w));
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return [];
    ctx.drawImage(img, 0, 0, w, h);
    const { data } = ctx.getImageData(0, 0, w, h);

    // Bucket colors into 5-bit-per-channel space (32 buckets per channel)
    const buckets = new Map<string, { r: number; g: number; b: number; n: number }>();
    for (let i = 0; i < data.length; i += 4) {
      const a = data[i + 3];
      if (a < 200) continue;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      // Skip near-white and near-black extremes to focus on color identity
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      if (lum < 12 || lum > 245) continue;
      const key = `${r >> 4}-${g >> 4}-${b >> 4}`;
      const cur = buckets.get(key);
      if (cur) {
        cur.r += r;
        cur.g += g;
        cur.b += b;
        cur.n += 1;
      } else {
        buckets.set(key, { r, g, b, n: 1 });
      }
    }

    const sorted = Array.from(buckets.values())
      .sort((a, b) => b.n - a.n)
      .slice(0, count * 3); // get more, then dedupe by distance

    const picked: { r: number; g: number; b: number }[] = [];
    for (const c of sorted) {
      const r = Math.round(c.r / c.n);
      const g = Math.round(c.g / c.n);
      const b = Math.round(c.b / c.n);
      const tooClose = picked.some((p) => Math.hypot(p.r - r, p.g - g, p.b - b) < 35);
      if (!tooClose) picked.push({ r, g, b });
      if (picked.length >= count) break;
    }

    return picked.map((p) => rgbToHex(p.r, p.g, p.b));
  } catch {
    return [];
  }
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}
