/** Visual similarity scoring — color / style / shape / pattern + perceptual hash. */

export type SimilarAspect = "color" | "style" | "shape" | "pattern";

export const SIMILAR_ASPECTS: { key: SimilarAspect; label: string; hint: string }[] = [
  { key: "color", label: "สี", hint: "โทนสีและพาเลตใกล้เคียง" },
  { key: "style", label: "สไตล์", hint: "หมวด เครื่องมือ และคีย์เวิร์ดสไตล์" },
  { key: "shape", label: "รูปทรง", hint: "สัดส่วนภาพและความซับซ้อนของเส้น" },
  { key: "pattern", label: "รูปแบบ", hint: "ลาย พื้นผิว และความหลากหลายของสี" },
];

export const DEFAULT_SIMILAR_ASPECTS: SimilarAspect[] = ["color", "style", "shape", "pattern"];

/** Aspect weights when multiple are active — style > color so palette alone cannot dominate. */
export const ASPECT_BASE_WEIGHTS: Record<SimilarAspect, number> = {
  style: 1.35,
  color: 0.95,
  shape: 0.9,
  pattern: 0.85,
};

export type ImageFeatures = {
  palette: { h: number; s: number; l: number; weight: number }[];
  aspectRatio: number;
  brightness: number;
  contrast: number;
  edgeDensity: number;
  colorVariance: number;
  /** 64-bit difference hash as hex (16 chars). */
  dHash: string;
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

export type ScoredSimilar = {
  project_id: string;
  title: string;
  category: string;
  owner_id: string;
  image_url: string;
  similarity: number;
  dHash?: string;
};

const STYLE_BUCKETS: Record<string, string[]> = {
  minimal: ["minimal", "clean", "simple", "มินิมอล", "เรียบ"],
  bold: ["bold", "vibrant", "neon", "สด", "จัด"],
  retro: ["retro", "vintage", "y2k", "วินเทจ"],
  three_d: ["3d", "render", "cgi", "blender", "cinema", "octane"],
  flat: ["flat", "vector", "illustration", "เวกเตอร์"],
  photo: ["photo", "photography", "lightroom", "ถ่ายภาพ", "portrait", "office"],
  abstract: ["abstract", "เชิงนามธรรม", "experimental"],
  dark: ["dark", "moody", "มืด", "lowkey"],
  pastel: ["pastel", "soft", "พาสเทล", "อ่อน"],
  ui: ["ui", "ux", "dashboard", "interface", "figma", "web"],
};

const PATTERN_BUCKETS: Record<string, string[]> = {
  geometric: ["geometric", "grid", "ทรงเรขา", "isometric"],
  organic: ["organic", "fluid", "wave", "โค้ง"],
  texture: ["texture", "grain", "noise", "พื้นผิว"],
  gradient: ["gradient", "ไล่สี", "blend"],
  pattern: ["pattern", "repeat", "ลาย", "seamless"],
  palette: ["palette", "swatch", "พาเลต", "color scheme"],
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

/** Strip CDN resize/query noise so the same asset hashes to one key. */
export function normalizeImageUrl(url: string): string {
  const raw = (url ?? "").trim();
  if (!raw) return "";
  try {
    const u = new URL(raw);
    u.hash = "";
    // Drop common transform params; keep path as identity.
    for (const key of [...u.searchParams.keys()]) {
      if (/^(w|h|width|height|quality|q|fit|crop|resize|auto|format|fm|dpr|ixlib)/i.test(key)) {
        u.searchParams.delete(key);
      }
    }
    return u.toString().replace(/\/$/, "").toLowerCase();
  } catch {
    return raw.split("?")[0].replace(/\/$/, "").toLowerCase();
  }
}

export function hammingHex(a: string, b: string): number {
  if (!a || !b || a.length !== b.length) return 64;
  let dist = 0;
  for (let i = 0; i < a.length; i++) {
    const x = parseInt(a[i], 16) ^ parseInt(b[i], 16);
    dist += (x & 1) + ((x >> 1) & 1) + ((x >> 2) & 1) + ((x >> 3) & 1);
  }
  return dist;
}

/** Near-duplicate when Hamming distance ≤ 10 on 64-bit dHash (~84%+ identical). */
export function isNearDuplicateHash(a: string | undefined, b: string | undefined, maxDist = 10): boolean {
  if (!a || !b || a.length !== 16 || b.length !== 16) return false;
  return hammingHex(a, b) <= maxDist;
}

function scoreColor(a: ImageFeatures | null, b: ImageFeatures | null): number {
  if (!a?.palette.length || !b?.palette.length) return 0;
  let score = 0;
  let weight = 0;
  for (const pa of a.palette.slice(0, 5)) {
    let best = 0;
    for (const pb of b.palette.slice(0, 5)) {
      const hue = 1 - hueDistance(pa.h, pb.h);
      const sat = 1 - Math.min(1, Math.abs(pa.s - pb.s) / 100);
      const light = 1 - Math.min(1, Math.abs(pa.l - pb.l) / 100);
      best = Math.max(best, hue * 0.5 + sat * 0.25 + light * 0.25);
    }
    score += best * pa.weight;
    weight += pa.weight;
  }
  const paletteScore = weight ? score / weight : 0;
  const bright =
    a && b ? 1 - Math.min(1, Math.abs(a.brightness - b.brightness) / 255) : 0;
  const contrast =
    a && b ? 1 - Math.min(1, Math.abs(a.contrast - b.contrast) / 80) : 0;
  return paletteScore * 0.75 + bright * 0.15 + contrast * 0.1;
}

function scoreShape(a: ImageFeatures | null, b: ImageFeatures | null): number {
  if (!a || !b) return 0;
  const ratio = 1 - Math.min(1, Math.abs(Math.log(a.aspectRatio + 0.01) - Math.log(b.aspectRatio + 0.01)) / 2);
  const edge = 1 - Math.min(1, Math.abs(a.edgeDensity - b.edgeDensity) / Math.max(a.edgeDensity, b.edgeDensity, 1));
  const bright = 1 - Math.min(1, Math.abs(a.brightness - b.brightness) / 255);
  const contrast = 1 - Math.min(1, Math.abs(a.contrast - b.contrast) / 80);
  return ratio * 0.4 + edge * 0.35 + bright * 0.15 + contrast * 0.1;
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
  const edgeScore =
    srcImg && candImg
      ? 1 - Math.min(1, Math.abs(srcImg.edgeDensity - candImg.edgeDensity) / Math.max(srcImg.edgeDensity, candImg.edgeDensity, 1))
      : 0;
  return tokenScore * 0.5 + varScore * 0.3 + edgeScore * 0.2;
}

function scoreStyle(src: ProjectMeta, cand: ProjectMeta): number {
  const tokenScore = jaccard(styleTokens(src), styleTokens(cand));
  const cat = src.category && cand.category && src.category === cand.category ? 0.3 : 0;
  const tagOverlap = jaccard(
    new Set((src.tags ?? []).map((t) => t.toLowerCase())),
    new Set((cand.tags ?? []).map((t) => t.toLowerCase())),
  );
  const toolOverlap = jaccard(
    new Set((src.tools ?? []).map((t) => t.toLowerCase())),
    new Set((cand.tools ?? []).map((t) => t.toLowerCase())),
  );
  return Math.min(1, tokenScore * 0.4 + cat + tagOverlap * 0.2 + toolOverlap * 0.1);
}

export function aspectWeights(aspects: SimilarAspect[]): Record<SimilarAspect, number> {
  const active = aspects.length ? aspects : DEFAULT_SIMILAR_ASPECTS;
  const weights: Record<SimilarAspect, number> = { color: 0, style: 0, shape: 0, pattern: 0 };
  let total = 0;
  for (const a of active) {
    weights[a] = ASPECT_BASE_WEIGHTS[a];
    total += ASPECT_BASE_WEIGHTS[a];
  }
  if (!total) return weights;
  for (const a of active) weights[a] /= total;
  return weights;
}

/** Perceptual boost when dHash is close — lifts near-identical images toward 90%+. */
function perceptualBoost(src: ImageFeatures | null, cand: ImageFeatures | null): number {
  if (!src?.dHash || !cand?.dHash) return 0;
  const dist = hammingHex(src.dHash, cand.dHash);
  if (dist <= 4) return 0.35;
  if (dist <= 8) return 0.22;
  if (dist <= 12) return 0.12;
  if (dist <= 18) return 0.05;
  return 0;
}

/**
 * Calibrated visual similarity in [0, 1].
 * Near-duplicates get a perceptual boost so scores read closer to human expectation.
 */
export function scoreVisualSimilarity(
  src: ProjectMeta,
  cand: ProjectMeta,
  srcImg: ImageFeatures | null,
  candImg: ImageFeatures | null,
  aspects: SimilarAspect[],
): number {
  const w = aspectWeights(aspects);
  const color = scoreColor(srcImg, candImg);
  const style = scoreStyle(src, cand);
  const shape = scoreShape(srcImg, candImg);
  const pattern = scorePattern(src, cand, srcImg, candImg);

  const base = w.color * color + w.style * style + w.shape * shape + w.pattern * pattern;
  const boost = perceptualBoost(srcImg, candImg);

  // Agreement bonus: when 2+ strong channels agree, lift the score.
  const channels = [color, style, shape, pattern].filter((s) => s >= 0.55);
  const agree = channels.length >= 2 ? 0.06 * (channels.length - 1) : 0;

  return Math.min(1, base + boost + agree);
}

/**
 * Blend semantic (embedding / text) score with visual aspect score.
 * Style-heavy queries lean semantic; color/shape/pattern-only stay visual-first.
 */
export function blendSemanticVisual(
  visual: number,
  semantic: number | null | undefined,
  aspects: SimilarAspect[],
): number {
  if (semantic == null || Number.isNaN(semantic)) return visual;
  const sem = Math.max(0, Math.min(1, semantic));
  const active = aspects.length ? aspects : DEFAULT_SIMILAR_ASPECTS;
  const styleOn = active.includes("style");
  const visualOnly =
    !styleOn && active.every((a) => a === "color" || a === "shape" || a === "pattern");

  if (visualOnly) return visual * 0.85 + sem * 0.15;
  if (styleOn && active.length === 1) return visual * 0.35 + sem * 0.65;
  // Default hybrid when style (+ others) selected
  return visual * 0.55 + sem * 0.45;
}

/**
 * De-dupe by normalized URL, near-duplicate dHash, and one row per project.
 * Soft owner diversity: after first hit from an owner, later ones lose a small score.
 */
export function dedupeSimilarResults(items: ScoredSimilar[], limit = 30): ScoredSimilar[] {
  const sorted = [...items].sort((a, b) => b.similarity - a.similarity);
  const seenUrl = new Set<string>();
  const seenProject = new Set<string>();
  const keptHashes: string[] = [];
  const ownerCount = new Map<string, number>();
  const out: ScoredSimilar[] = [];

  for (const item of sorted) {
    const urlKey = normalizeImageUrl(item.image_url);
    if (!urlKey || seenUrl.has(urlKey)) continue;
    if (seenProject.has(item.project_id)) continue;

    if (item.dHash) {
      const dup = keptHashes.some((h) => isNearDuplicateHash(h, item.dHash));
      if (dup) continue;
    }

    const prior = ownerCount.get(item.owner_id) ?? 0;
    const adjusted =
      prior > 0 ? Math.max(0, item.similarity - 0.04 * prior) : item.similarity;

    seenUrl.add(urlKey);
    seenProject.add(item.project_id);
    if (item.dHash) keptHashes.push(item.dHash);
    ownerCount.set(item.owner_id, prior + 1);
    out.push({ ...item, similarity: adjusted });

    if (out.length >= limit * 2) break;
  }

  return out.sort((a, b) => b.similarity - a.similarity).slice(0, limit);
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

function computeDHash(data: Uint8ClampedArray, width: number, height: number): string {
  // Sample 9x8 luminance grid from whatever canvas size we have.
  const cols = 9;
  const rows = 8;
  const lum: number[] = [];
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const sx = Math.min(width - 1, Math.floor(((x + 0.5) / cols) * width));
      const sy = Math.min(height - 1, Math.floor(((y + 0.5) / rows) * height));
      const idx = (sy * width + sx) * 4;
      lum.push(0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2]);
    }
  }
  let bits = 0n;
  let bit = 0n;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols - 1; x++) {
      const i = y * cols + x;
      if (lum[i] > lum[i + 1]) bits |= 1n << bit;
      bit += 1n;
    }
  }
  return bits.toString(16).padStart(16, "0");
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
        const size = 64;
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
          dHash: computeDHash(data, width, height),
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
  maxUrls = 48,
): Promise<Map<string, ImageFeatures | null>> {
  const map = new Map<string, ImageFeatures | null>();
  const unique = Array.from(new Set(urls.filter(Boolean))).slice(0, maxUrls);
  // Bound concurrency to avoid flooding the browser with image loads.
  const concurrency = 8;
  for (let i = 0; i < unique.length; i += concurrency) {
    const batch = unique.slice(i, i + concurrency);
    await Promise.all(
      batch.map(async (url) => {
        map.set(url, await extractImageFeatures(url));
      }),
    );
  }
  return map;
}
