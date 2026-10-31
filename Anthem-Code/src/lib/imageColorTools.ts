/** Pixel-level colour helpers for the large image view (palette share, colour isolate). */

type Rgb = [number, number, number];

const cache = new Map<string, Promise<ImageData | null>>();

/** Decode `src` into pixels at most `maxSide` px on the long edge. Null when the host blocks reading pixels. */
function loadPixels(src: string, maxSide: number): Promise<ImageData | null> {
  const key = `${maxSide}|${src}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const job = (async () => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = src;
    try {
      await img.decode();
    } catch {
      return null;
    }
    const k = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.max(1, Math.round(img.naturalWidth * k));
    const h = Math.max(1, Math.round(img.naturalHeight * k));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, w, h);
    try {
      return ctx.getImageData(0, 0, w, h);
    } catch {
      return null;
    }
  })();
  cache.set(key, job);
  if (cache.size > 12) cache.delete(cache.keys().next().value as string);
  return job;
}

function hexToRgb(hex: string): Rgb {
  const h = hex.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as Rgb;
}

const dist2 = (a: Rgb, r: number, g: number, b: number) => (a[0] - r) ** 2 + (a[1] - g) ** 2 + (a[2] - b) ** 2;

/**
 * Share of the image each palette colour covers (every pixel goes to its nearest swatch).
 * Returns hex → whole percent; empty when pixels can't be read.
 */
export async function palettePercentages(src: string, palette: string[]): Promise<Record<string, number>> {
  if (!palette.length) return {};
  const data = await loadPixels(src, 96);
  if (!data) return {};
  const rgbs = palette.map(hexToRgb);
  const counts = new Array(palette.length).fill(0);
  let total = 0;
  const px = data.data;
  for (let i = 0; i < px.length; i += 4) {
    if (px[i + 3] < 128) continue;
    let best = 0;
    let bestD = Infinity;
    for (let c = 0; c < rgbs.length; c++) {
      const d = dist2(rgbs[c], px[i], px[i + 1], px[i + 2]);
      if (d < bestD) {
        bestD = d;
        best = c;
      }
    }
    counts[best]++;
    total++;
  }
  if (!total) return {};
  return Object.fromEntries(palette.map((hex, i) => [hex, Math.round((counts[i] / total) * 100)]));
}

/**
 * Keep only pixels close to `hex` in colour; everything else turns grey.
 * Returns an object URL (caller revokes it) or null when pixels can't be read.
 */
export async function isolateColorUrl(src: string, hex: string, tolerance = 60): Promise<string | null> {
  const data = await loadPixels(src, 1600);
  if (!data) return null;
  const out = new ImageData(new Uint8ClampedArray(data.data), data.width, data.height);
  const target = hexToRgb(hex);
  const limit = tolerance ** 2;
  const soft = (tolerance * 1.5) ** 2;
  const px = out.data;
  for (let i = 0; i < px.length; i += 4) {
    const [r, g, b] = [px[i], px[i + 1], px[i + 2]];
    const d = dist2(target, r, g, b);
    if (d <= limit) continue;
    const grey = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    // Short fade between "kept" and "grey" so edges don't look cut out.
    const t = d >= soft ? 1 : (d - limit) / (soft - limit);
    px[i] = r + (grey - r) * t;
    px[i + 1] = g + (grey - g) * t;
    px[i + 2] = b + (grey - b) * t;
  }
  const canvas = document.createElement("canvas");
  canvas.width = out.width;
  canvas.height = out.height;
  canvas.getContext("2d")?.putImageData(out, 0, 0);
  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/webp", 0.92));
  return blob ? URL.createObjectURL(blob) : null;
}
