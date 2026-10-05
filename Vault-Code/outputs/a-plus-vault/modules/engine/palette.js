/**
 * Layer A (free, code): palette, hue families and image metrics from raw pixels.
 * Pure: takes { data: RGBA bytes, width, height } (callers downscale to ~128 px) and engine config thresholds.
 * Everything here is conf 1, src "code". mood.tone / mood.hue are never asked from AI.
 */

// ---------------------------------------------------------------- colour maths
const srgbToLinear = c => { const v = c / 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };

export function rgbToLab(r, g, b) {
  const R = srgbToLinear(r), G = srgbToLinear(g), B = srgbToLinear(b);
  const X = (R * 0.4124564 + G * 0.3575761 + B * 0.1804375) / 0.95047;
  const Y = R * 0.2126729 + G * 0.7151522 + B * 0.072175;
  const Z = (R * 0.0193339 + G * 0.119192 + B * 0.9503041) / 1.08883;
  const f = t => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const fx = f(X), fy = f(Y), fz = f(Z);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

export function rgbToHsl(r, g, b) {
  const R = r / 255, G = g / 255, B = b / 255;
  const max = Math.max(R, G, B), min = Math.min(R, G, B), d = max - min;
  const l = (max + min) / 2;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  let h = 0;
  if (d !== 0) {
    if (max === R) h = ((G - B) / d) % 6;
    else if (max === G) h = (B - R) / d + 2;
    else h = (R - G) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s, l };
}

export const toHex = (r, g, b) => "#" + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");
export function hexToRgb(hex) {
  const m = String(hex).replace("#", "");
  const v = m.length === 3 ? m.split("").map(c => c + c).join("") : m;
  return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)];
}
export const deltaE = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const chromaOf = lab => Math.hypot(lab[1], lab[2]);

// ---------------------------------------------------------------- hue family (dictionary ids of group mood.hue)
/** Maps one colour to a mood.hue id (the 15 basic families; fancier names stay with AI/user). */
export function hueFamilyId(r, g, b, cfg = {}) {
  const lab = rgbToLab(r, g, b);
  const { h, s, l } = rgbToHsl(r, g, b);
  const neutralChroma = cfg.COLOR_NEUTRAL_CHROMA ?? 12;
  if (l < 0.12) return "mood.black";
  if (chromaOf(lab) < neutralChroma * 0.8 || s < 0.1) {
    if (l > 0.95) return "mood.white";
    if (l > 0.88) return "mood.off_white";
    if (l < 0.2) return "mood.black";
    return "mood.grey";
  }
  if (h < 15 || h >= 345) return l > 0.78 ? "mood.pink" : l < 0.3 ? "mood.brown" : "mood.red";
  if (h < 40) return l < 0.42 ? "mood.brown" : l > 0.82 ? "mood.beige" : "mood.orange";
  if (h < 68) return l < 0.35 ? "mood.brown" : l > 0.85 && s < 0.5 ? "mood.beige" : "mood.yellow";
  if (h < 160) return "mood.green";
  if (h < 195) return "mood.teal";
  if (h < 250) return l < 0.28 ? "mood.navy" : "mood.blue";
  if (h < 300) return "mood.purple";
  return "mood.pink";
}

// ---------------------------------------------------------------- k-means palette in Lab
function samplePixels(img, maxSamples = 4096) {
  const { data, width, height } = img;
  const total = width * height;
  const step = Math.max(1, Math.floor(total / maxSamples));
  const out = [];
  for (let i = 0; i < total; i += step) {
    const o = i * 4;
    if (data[o + 3] < 128) continue; // ignore transparent pixels
    out.push([data[o], data[o + 1], data[o + 2]]);
  }
  return out;
}

/** Deterministic k-means in Lab (farthest-point init). Returns [{ hex, pct, lab, hue }] sorted by coverage. */
export function extractPalette(img, k = 5, cfg = {}) {
  const px = samplePixels(img);
  if (!px.length) return [];
  const labs = px.map(p => rgbToLab(p[0], p[1], p[2]));
  const centers = [labs[0].slice()];
  while (centers.length < Math.min(k, labs.length)) {
    let best = -1, bestD = -1;
    for (let i = 0; i < labs.length; i++) {
      const d = Math.min(...centers.map(c => deltaE(labs[i], c)));
      if (d > bestD) { bestD = d; best = i; }
    }
    if (bestD < 2) break; // everything left is nearly identical to a centre
    centers.push(labs[best].slice());
  }
  const assign = new Array(labs.length).fill(0);
  for (let iter = 0; iter < 12; iter++) {
    let moved = false;
    for (let i = 0; i < labs.length; i++) {
      let bi = 0, bd = Infinity;
      for (let c = 0; c < centers.length; c++) {
        const d = deltaE(labs[i], centers[c]);
        if (d < bd) { bd = d; bi = c; }
      }
      if (assign[i] !== bi) { assign[i] = bi; moved = true; }
    }
    const sums = centers.map(() => [0, 0, 0, 0]);
    labs.forEach((l, i) => { const s = sums[assign[i]]; s[0] += l[0]; s[1] += l[1]; s[2] += l[2]; s[3]++; });
    sums.forEach((s, c) => { if (s[3]) centers[c] = [s[0] / s[3], s[1] / s[3], s[2] / s[3]]; });
    if (!moved) break;
  }
  // Representative RGB = mean RGB of the cluster members (avoids Lab->RGB gamut issues).
  const acc = centers.map(() => [0, 0, 0, 0]);
  px.forEach((p, i) => { const a = acc[assign[i]]; a[0] += p[0]; a[1] += p[1]; a[2] += p[2]; a[3]++; });
  return acc
    .map((a, c) => (a[3] ? { n: a[3], rgb: [a[0] / a[3], a[1] / a[3], a[2] / a[3]], lab: centers[c] } : null))
    .filter(Boolean)
    .sort((x, y) => y.n - x.n)
    .map(e => ({
      hex: toHex(...e.rgb),
      pct: Math.round((e.n / px.length) * 1000) / 1000,
      lab: e.lab.map(v => Math.round(v * 10) / 10),
      hue: hueFamilyId(e.rgb[0], e.rgb[1], e.rgb[2], cfg),
    }));
}

// ---------------------------------------------------------------- metrics
export function resolutionTier(width, height) {
  const edge = Math.max(width, height);
  return edge >= 3000 ? "xl" : edge >= 1600 ? "l" : edge >= 1000 ? "m" : "s";
}

/** Numeric image statistics. `srcW/srcH` are the ORIGINAL dimensions (the pixels are a downscaled copy). */
export function computeMetrics(img, cfg = {}, srcW = img.width, srcH = img.height) {
  const { data, width, height } = img;
  const neutralChroma = cfg.COLOR_NEUTRAL_CHROMA ?? 12;
  const n = width * height;
  const L = new Float32Array(n);
  let sumL = 0, sumS = 0, chromatic = 0, neutral = 0, white = 0, warm = 0, cool = 0, counted = 0;
  for (let i = 0; i < n; i++) {
    const o = i * 4;
    if (data[o + 3] < 128) { L[i] = 100; continue; }
    const lab = rgbToLab(data[o], data[o + 1], data[o + 2]);
    L[i] = lab[0];
    sumL += lab[0];
    counted++;
    const c = chromaOf(lab);
    if (c < neutralChroma) {
      neutral++;
      if (lab[0] > 92) white++;
    } else {
      chromatic++;
      const { h, s } = rgbToHsl(data[o], data[o + 1], data[o + 2]);
      sumS += s;
      if (h < 70 || h >= 330) warm++; else if (h >= 160 && h < 270) cool++;
    }
  }
  const meanL = counted ? sumL / counted : 0;
  let varL = 0;
  for (let i = 0; i < n; i++) varL += (L[i] - meanL) ** 2;
  const stdL = Math.sqrt(varL / Math.max(1, n));
  // Detail density = mean absolute gradient of L (cheap edge measure) and Laplacian variance for blur.
  let grad = 0, lapSum = 0, lapSq = 0, lapN = 0;
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x;
      grad += Math.abs(L[i + 1] - L[i - 1]) + Math.abs(L[i + width] - L[i - width]);
      const lap = 4 * L[i] - L[i - 1] - L[i + 1] - L[i - width] - L[i + width];
      lapSum += lap; lapSq += lap * lap; lapN++;
    }
  }
  const lapVar = lapN ? lapSq / lapN - (lapSum / lapN) ** 2 : 0;
  const r = v => Math.round(v * 1000) / 1000;
  return {
    mean_lightness: r(meanL / 100),
    contrast: r(stdL / 50),
    saturation: r(chromatic ? sumS / chromatic : 0),
    neutral_ratio: r(counted ? neutral / counted : 0),
    whitespace_ratio: r(counted ? white / counted : 0),
    warm_ratio: r(chromatic ? warm / chromatic : 0),
    cool_ratio: r(chromatic ? cool / chromatic : 0),
    chromatic_ratio: r(counted ? chromatic / counted : 0),
    detail_density: r(grad / Math.max(1, n) / 100),
    laplacian_var: r(lapVar),
    std_lightness: r(stdL),
    high_key: meanL > 75,
    low_key: meanL < 30,
    aspect: r(srcW / Math.max(1, srcH)),
    resolution_tier: resolutionTier(srcW, srcH),
  };
}

/** Free gate: a (nearly) uniform image carries no information. Flat-colour design is NOT blank (it has edges/two colours). */
export function isBlankImage(metrics, cfg = {}) {
  return metrics.std_lightness < (cfg.BLANK_MAX_STDDEV ?? 2) && metrics.detail_density < 0.01;
}

// ---------------------------------------------------------------- colour harmony + derived tags
function hueGaps(hues) {
  const sorted = [...hues].sort((a, b) => a - b);
  return sorted.map((h, i) => (i === sorted.length - 1 ? sorted[0] + 360 - h : sorted[i + 1] - h));
}

/** Rough harmony of the chromatic colours (>= COLOR_MIN_COVERAGE): analogous | complementary | triadic | null. */
export function paletteHarmony(palette, cfg = {}) {
  const minCov = cfg.COLOR_MIN_COVERAGE ?? 0.08;
  const hues = palette
    .filter(p => p.pct >= minCov)
    .map(p => ({ ...rgbToHsl(...hexToRgb(p.hex)) }))
    .filter(c => c.s >= 0.25 && c.l > 0.12 && c.l < 0.95)
    .map(c => c.h);
  if (hues.length < 2) return null;
  const span = 360 - Math.max(...hueGaps(hues));
  if (span <= (cfg.COLOR_HUE_FAMILY_DEG ?? 30) * 1.5) return "analogous";
  const near = (a, b, target) => { const d = Math.abs(a - b) % 360; return Math.abs(Math.min(d, 360 - d) - target) < 25; };
  if (hues.length >= 3 && hues.some(a => hues.some(b => near(a, b, 120)) && hues.some(c => near(a, c, 120) && c !== a))) return "triadic";
  if (hues.some(a => hues.some(b => near(a, b, 180)))) return "complementary";
  return null;
}

/**
 * Thresholded colour tags for groups with layer A. Returns [{ id, facet, conf:1, src:"code" }].
 * hue: palette colours covering >= COLOR_MIN_COVERAGE (group max 6); tone: at most 3 strongest rules (group max 3).
 */
export function deriveColorTags(palette, metrics, cfg = {}) {
  const minCov = cfg.COLOR_MIN_COVERAGE ?? 0.08;
  const tags = [];
  const seen = new Set();
  for (const p of palette) {
    if (p.pct < minCov || seen.has(p.hue)) continue;
    seen.add(p.hue);
    tags.push({ id: p.hue, facet: "mood.hue", conf: 1, src: "code" });
    if (seen.size >= 6) break;
  }
  const m = metrics;
  const tone = [];
  const add = (id, strength) => tone.push({ id, strength });
  if (m.chromatic_ratio < 0.03) add(m.mean_lightness > 0.15 && m.mean_lightness < 0.85 && m.std_lightness > 8 ? "mood.black_and_white" : "mood.neutral_palette", 1);
  else if (m.neutral_ratio >= 0.8) add("mood.neutral_palette", 0.9);
  if (m.neutral_ratio >= 0.65 && m.neutral_ratio < 0.97 && palette.some(p => p.pct >= 0.04 && p.pct <= 0.35 && p.hue !== "mood.grey" && !["mood.white", "mood.off_white", "mood.black", "mood.beige"].includes(p.hue))) add("mood.neutral_with_accent", 0.8);
  if (m.chromatic_ratio >= 0.2) {
    if (m.warm_ratio >= 0.75) add("mood.warm_palette", 0.85);
    if (m.cool_ratio >= 0.75) add("mood.cool_palette", 0.85);
    if (m.saturation >= 0.7 && m.mean_lightness > 0.3 && m.mean_lightness < 0.85) add("mood.vivid_palette", 0.8);
    if (m.saturation <= 0.4 && m.saturation >= 0.12) add("mood.muted_palette", 0.6);
    if (m.saturation <= 0.55 && m.mean_lightness >= 0.75) add("mood.pastel_palette", 0.8);
  }
  if (m.mean_lightness < 0.28) add("mood.dark_palette", 0.9);
  if (m.mean_lightness > 0.78) add("mood.light_palette", 0.9);
  if (m.contrast >= 0.62) add("mood.high_contrast", 0.7);
  if (m.contrast <= 0.15 && m.chromatic_ratio + m.neutral_ratio > 0.9) add("mood.low_contrast", 0.7);
  const harmony = paletteHarmony(palette, cfg);
  if (harmony) add("mood." + harmony, 0.5);
  tone.sort((a, b) => b.strength - a.strength);
  for (const t of tone.slice(0, 3)) tags.push({ id: t.id, facet: "mood.tone", conf: 1, src: "code" });
  return tags;
}

/** One-call convenience: palette + metrics + derived tags. */
export function analyzePixels(img, cfg = {}, srcSize = {}) {
  const palette = extractPalette(img, 5, cfg);
  const metrics = computeMetrics(img, cfg, srcSize.width ?? img.width, srcSize.height ?? img.height);
  return { palette, metrics, tags: deriveColorTags(palette, metrics, cfg), blank: isBlankImage(metrics, cfg) };
}
