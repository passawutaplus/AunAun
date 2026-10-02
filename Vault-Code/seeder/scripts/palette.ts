import sharp from "sharp";

type Bucket = { r: number; g: number; b: number; n: number };

const MAX_COLORS = 5;
const MAX_DOMINANT = 3;
const MIN_DISTANCE = 48;
const ACCENT_MIN_SHARE = 0.01;
const HUE_BIN = 30;
const MIN_CHROMA = 0.1;

function hex({ r, g, b }: { r: number; g: number; b: number }) {
  const part = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
  return `#${part(r)}${part(g)}${part(b)}`;
}

function saturation({ r, g, b }: { r: number; g: number; b: number }) {
  const max = Math.max(r, g, b) / 255;
  const min = Math.min(r, g, b) / 255;
  const l = (max + min) / 2;
  if (max === min) return { s: 0, l };
  return { s: (max - min) / (1 - Math.abs(2 * l - 1)), l };
}

function chroma({ r, g, b }: { r: number; g: number; b: number }) {
  return (Math.max(r, g, b) - Math.min(r, g, b)) / 255;
}

function hue({ r, g, b }: { r: number; g: number; b: number }) {
  const max = Math.max(r, g, b);
  const d = max - Math.min(r, g, b);
  if (!d) return 0;
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return (h * 60 + 360) % 360;
}

function distance(a: Bucket, b: Bucket) {
  return Math.hypot(a.r - b.r, a.g - b.g, a.b - b.b);
}

/** Dominant colors first, then saturated accents so a small blue glaze still matches a blue search. */
export async function extractPalette(image: Buffer): Promise<string[]> {
  const { data, info } = await sharp(image).resize(96, 96, { fit: "inside" }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const buckets = new Map<number, Bucket>();
  for (let i = 0; i < data.length; i += info.channels) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
    const bucket = buckets.get(key) || { r: 0, g: 0, b: 0, n: 0 };
    bucket.r += r;
    bucket.g += g;
    bucket.b += b;
    bucket.n += 1;
    buckets.set(key, bucket);
  }
  const total = info.width * info.height;
  const colors = [...buckets.values()]
    .map((c) => ({ r: c.r / c.n, g: c.g / c.n, b: c.b / c.n, n: c.n }))
    .sort((a, b) => b.n - a.n);

  const picked: Bucket[] = [];
  const distinct = (c: Bucket) => picked.every((p) => distance(p, c) >= MIN_DISTANCE);
  for (const c of colors) {
    if (picked.length >= MAX_DOMINANT) break;
    if (distinct(c)) picked.push(c);
  }
  const hues = new Map<number, Bucket>();
  for (const c of colors) {
    const { s, l } = saturation(c);
    if (s < 0.22 || l < 0.12 || l > 0.88 || chroma(c) < MIN_CHROMA) continue;
    const bin = Math.floor(hue(c) / HUE_BIN) % (360 / HUE_BIN);
    const acc = hues.get(bin) || { r: 0, g: 0, b: 0, n: 0 };
    acc.r += c.r * c.n;
    acc.g += c.g * c.n;
    acc.b += c.b * c.n;
    acc.n += c.n;
    hues.set(bin, acc);
  }
  const accents = [...hues.values()]
    .filter((c) => c.n / total >= ACCENT_MIN_SHARE)
    .map((c) => ({ r: c.r / c.n, g: c.g / c.n, b: c.b / c.n, n: c.n }))
    .sort((a, b) => b.n - a.n);
  const newHue = (c: Bucket) =>
    picked.every((p) => {
      if (chroma(p) < MIN_CHROMA) return true;
      const gap = Math.abs(hue(p) - hue(c));
      return Math.min(gap, 360 - gap) >= HUE_BIN;
    });
  for (const c of accents) {
    if (picked.length >= MAX_COLORS) break;
    if (newHue(c)) picked.push(c);
  }
  return picked.map(hex);
}
