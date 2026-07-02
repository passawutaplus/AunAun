/** Visual similarity scoring — color / style / shape / pattern (no AI embeddings). */

export type SimilarAspect = "color" | "style" | "shape" | "pattern";

export const SIMILAR_ASPECTS: { key: SimilarAspect; label: string; hint: string }[] = [
  { key: "color", label: "สี", hint: "โทนสีและพาเลตใกล้เคียง" },
  { key: "style", label: "สไตล์", hint: "หมวด เครื่องมือ และคีย์เวิร์ดสไตล์" },
  { key: "shape", label: "รูปทรง", hint: "สัดส่วนภาพและความซับซ้อนของเส้น" },
  { key: "pattern", label: "รูปแบบ", hint: "ลาย พื้นผิว และความหลากหลายของสี" },
];

export const DEFAULT_SIMILAR_ASPECTS: SimilarAspect[] = ["color", "style", "shape", "pattern"];

export type ImageFeatures = {
  palette: { h: number; s: number; l: number; weight: number }[];
  aspectRatio: number;
  brightness: number;
  contrast: number;
  edgeDensity: number;
  colorVariance: number;
};

export type ProjectMeta = {
  id: string;
  title: string;
  category: string;
  owner_id: string;
  tags: string[];
  tools: string[];
  description: string;
  image_url: string;
};

const STYLE_BUCKETS: Record<string, string[]> = {
  minimal: ["minimal", "clean", "simple", "มินิมอล", "เรียบ"],
  bold: ["bold", "vibrant", "neon", "สด", "จัด"],
  retro: ["retro", "vintage", "y2k", "วินเทจ"],
  three_d: ["3d", "render", "cgi", "blender", "cinema", "octane"],
  flat: ["flat", "vector", "illustration", "เวกเตอร์"],
  photo: ["photo", "photography", "lightroom", "ถ่ายภาพ"],
  abstract: ["abstract", "เชิงนามธรรม", "experimental"],
  dark: ["dark", "moody", "มืด", "lowkey"],
  pastel: ["pastel", "soft", "พาสเทล", "อ่อน"],
};

const PATTERN_BUCKETS: Record<string, string[]> = {
  geometric: ["geometric", "grid", "ทรงเรขา", "isometric"],
  organic: ["organic", "fluid", "wave", "โค้ง"],
  texture: ["texture", "grain", "noise", "พื้นผิว"],
  gradient: ["gradient", "ไล่สี", "blend"],
  pattern: ["pattern", "repeat", "ลาย", "seamless"],
};

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[\s,./|#()[\]{}:;'"!?+\-]+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2);
}

function bucketTokens(text: string, buckets: Record<string, string[]>): Set<string> {
  const hay = text.toLowerCase();
  const out = new Set<string>();
  for (const [bucket, keys] of Object.entries(buckets)) {
    if (keys.some((k) => hay.includes(k))) out.add(bucket);
  }
  return out;
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (!a.size && !b.size) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter += 1;
  const union = a.size + b.size - inter;
  return union ? inter / union : 0;
}

function hueDistance(a: number, b: number): number {
  const d = Math.abs(a - b);
  return Math.min(d, 360 - d) / 180;
}

export function metaText(p: Pick<ProjectMeta, "title" | "category" | "description" | "tags" | "tools">): string {
  return [p.title, p.category, p.description, ...(p.tags ?? []), ...(p.tools ?? [])].filter(Boolean).join(" ");
}

export function styleTokens(p: Pick<ProjectMeta, "title" | "category" | "description" | "tags" | "tools">): Set<string> {
  const text = metaText(p);
  const tokens = new Set(tokenize(text));
  for (const t of bucketTokens(text, STYLE_BUCKETS)) tokens.add(`style:${t}`);
  if (p.category) tokens.add(`cat:${p.category.toLowerCase()}`);
  for (const tool of p.tools ?? []) tokens.add(`tool:${tool.toLowerCase()}`);
  return tokens;
}

export function patternTokens(p: Pick<ProjectMeta, "title" | "description" | "tags">): Set<string> {
  const text = [p.title, p.description, ...(p.tags ?? [])].join(" ");
  const tokens = new Set(tokenize(text));
  for (const t of bucketTokens(text, PATTERN_BUCKETS)) tokens.add(`pat:${t}`);
  return tokens;
}

function scoreColor(a: ImageFeatures | null, b: ImageFeatures | null): number {
  if (!a?.palette.length || !b?.palette.length) return 0;
  let score = 0;
  let weight = 0;
  for (const pa of a.palette.slice(0, 4)) {
    let best = 0;
    for (const pb of b.palette.slice(0, 4)) {
      const hue = 1 - hueDistance(pa.h, pb.h);
      const sat = 1 - Math.min(1, Math.abs(pa.s - pb.s));
      const light = 1 - Math.min(1, Math.abs(pa.l - pb.l));
      best = Math.max(best, hue * 0.55 + sat * 0.25 + light * 0.2);
    }
    score += best * pa.weight;
    weight += pa.weight;
  }
  return weight ? score / weight : 0;
}

function scoreShape(a: ImageFeatures | null, b: ImageFeatures | null): number {
  if (!a || !b) return 0;
  const ratio = 1 - Math.min(1, Math.abs(Math.log(a.aspectRatio + 0.01) - Math.log(b.aspectRatio + 0.01)) / 2);
  const edge = 1 - Math.min(1, Math.abs(a.edgeDensity - b.edgeDensity));
  const bright = 1 - Math.min(1, Math.abs(a.brightness - b.brightness) / 255);
  return ratio * 0.45 + edge * 0.35 + bright * 0.2;
}

function scorePattern(
  srcMeta: ProjectMeta,
  candMeta: ProjectMeta,
  srcImg: ImageFeatures | null,
  candImg: ImageFeatures | null,
): number {
  const tokenScore = jaccard(patternTokens(srcMeta), patternTokens(candMeta));
  const varScore =
    srcImg && candImg
      ? 1 - Math.min(1, Math.abs(srcImg.colorVariance - candImg.colorVariance) / 80)
      : 0;
  return tokenScore * 0.65 + varScore * 0.35;
}

function scoreStyle(src: ProjectMeta, cand: ProjectMeta): number {
  const tokenScore = jaccard(styleTokens(src), styleTokens(cand));
  const cat = src.category && cand.category && src.category === cand.category ? 0.25 : 0;
  const tagOverlap = jaccard(new Set(src.tags.map((t) => t.toLowerCase())), new Set(cand.tags.map((t) => t.toLowerCase())));
  const toolOverlap = jaccard(new Set(src.tools.map((t) => t.toLowerCase())), new Set(cand.tools.map((t) => t.toLowerCase())));
  return Math.min(1, tokenScore * 0.45 + cat + tagOverlap * 0.2 + toolOverlap * 0.1);
}

export function scoreVisualSimilarity(
  src: ProjectMeta,
  cand: ProjectMeta,
  srcImg: ImageFeatures | null,
  candImg: ImageFeatures | null,
  aspects: SimilarAspect[],
): number {
  const active = aspects.length ? aspects : DEFAULT_SIMILAR_ASPECTS;
  const weights: Record<SimilarAspect, number> = { color: 0, style: 0, shape: 0, pattern: 0 };
  for (const a of active) weights[a] = 1;
  const totalW = active.length || 1;

  const color = scoreColor(srcImg, candImg);
  const style = scoreStyle(src, cand);
  const shape = scoreShape(srcImg, candImg);
  const pattern = scorePattern(src, cand, srcImg, candImg);

  return (
    (weights.color * color + weights.style * style + weights.shape * shape + weights.pattern * pattern) / totalW
  );
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l: l * 100 };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return { h: h * 360, s: s * 100, l: l * 100 };
}

export async function extractImageFeatures(url: string): Promise<ImageFeatures | null> {
  if (!url || typeof document === "undefined") return null;

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.decoding = "async";

    const finish = (value: ImageFeatures | null) => {
      clearTimeout(timer);
      resolve(value);
    };

    const timer = setTimeout(() => finish(null), 8000);

    img.onload = () => {
      try {
        const size = 56;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) {
          finish(null);
          return;
        }
        ctx.drawImage(img, 0, 0, size, size);
        const { data, width, height } = ctx.getImageData(0, 0, size, size);

        const buckets = new Map<number, { h: number; s: number; l: number; count: number }>();
        let brightness = 0;
        let brightSq = 0;
        let edgeSum = 0;
        const hues: number[] = [];

        for (let i = 0; i < data.length; i += 4) {
          const a = data[i + 3];
          if (a < 20) continue;
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const lum = 0.299 * r + 0.587 * g + 0.114 * b;
          brightness += lum;
          brightSq += lum * lum;
          const hsl = rgbToHsl(r, g, b);
          if (hsl.s > 8 && hsl.l > 8 && hsl.l < 92) hues.push(hsl.h);
          const bucket = Math.round(hsl.h / 30);
          const prev = buckets.get(bucket) ?? { h: 0, s: 0, l: 0, count: 0 };
          prev.h += hsl.h;
          prev.s += hsl.s;
          prev.l += hsl.l;
          prev.count += 1;
          buckets.set(bucket, prev);
        }

        const pixelCount = data.length / 4;
        brightness /= Math.max(1, pixelCount);
        const variance = Math.sqrt(Math.max(0, brightSq / Math.max(1, pixelCount) - brightness * brightness));

        for (let y = 1; y < height - 1; y++) {
          for (let x = 1; x < width - 1; x++) {
            const idx = (y * width + x) * 4;
            const idxR = idx + 4;
            const idxD = idx + width * 4;
            const lum =
              0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
            const lumR =
              0.299 * data[idxR] + 0.587 * data[idxR + 1] + 0.114 * data[idxR + 2];
            const lumD =
              0.299 * data[idxD] + 0.587 * data[idxD + 1] + 0.114 * data[idxD + 2];
            edgeSum += Math.abs(lum - lumR) + Math.abs(lum - lumD);
          }
        }

        const palette = Array.from(buckets.values())
          .sort((a, b) => b.count - a.count)
          .slice(0, 5)
          .map((b) => ({
            h: b.h / b.count,
            s: b.s / b.count,
            l: b.l / b.count,
            weight: b.count / Math.max(1, pixelCount),
          }));

        let hueVar = 0;
        if (hues.length > 1) {
          const mean = hues.reduce((s, h) => s + h, 0) / hues.length;
          hueVar = Math.sqrt(hues.reduce((s, h) => s + (h - mean) ** 2, 0) / hues.length);
        }

        finish({
          palette,
          aspectRatio: img.naturalWidth / Math.max(1, img.naturalHeight),
          brightness,
          contrast: variance,
          edgeDensity: edgeSum / Math.max(1, (width - 2) * (height - 2)),
          colorVariance: hueVar,
        });
      } catch {
        finish(null);
      }
    };

    img.onerror = () => finish(null);
    img.src = url;
  });
}

export async function extractFeaturesForUrls(
  urls: string[],
): Promise<Map<string, ImageFeatures | null>> {
  const map = new Map<string, ImageFeatures | null>();
  const unique = Array.from(new Set(urls.filter(Boolean))).slice(0, 40);
  await Promise.all(
    unique.map(async (url) => {
      map.set(url, await extractImageFeatures(url));
    }),
  );
  return map;
}
