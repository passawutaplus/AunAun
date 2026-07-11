import { describe, expect, it } from "vitest";
import {
  ASPECT_BASE_WEIGHTS,
  aspectWeights,
  blendSemanticVisual,
  dedupeSimilarResults,
  hammingHex,
  isNearDuplicateHash,
  normalizeImageUrl,
  scoreVisualSimilarity,
  type ImageFeatures,
  type ProjectMeta,
  type ScoredSimilar,
} from "@/lib/visualSimilarity";

const baseMeta = (over: Partial<ProjectMeta> = {}): ProjectMeta => ({
  id: "p1",
  title: "Dashboard สุขภาพ",
  category: "WEB/UI",
  owner_id: "u1",
  tags: ["dashboard", "ui"],
  tools: ["Figma"],
  description: "community health dashboard",
  image_url: "https://cdn.example.com/a.jpg",
  ...over,
});

const feats = (over: Partial<ImageFeatures> = {}): ImageFeatures => ({
  palette: [
    { h: 30, s: 40, l: 50, weight: 0.4 },
    { h: 200, s: 30, l: 60, weight: 0.2 },
  ],
  aspectRatio: 1.5,
  brightness: 140,
  contrast: 40,
  edgeDensity: 20,
  colorVariance: 35,
  dHash: "0123456789abcdef",
  ...over,
});

describe("normalizeImageUrl", () => {
  it("strips resize query params", () => {
    const a = normalizeImageUrl("https://cdn.example.com/x.jpg?w=400&q=80");
    const b = normalizeImageUrl("https://CDN.example.com/x.jpg?width=800");
    expect(a).toBe(b);
  });
});

describe("hamming / near-duplicate", () => {
  it("counts zero distance for identical hashes", () => {
    expect(hammingHex("aaaaaaaaaaaaaaaa", "aaaaaaaaaaaaaaaa")).toBe(0);
    expect(isNearDuplicateHash("aaaaaaaaaaaaaaaa", "aaaaaaaaaaaaaaaa")).toBe(true);
  });

  it("rejects distant hashes", () => {
    expect(isNearDuplicateHash("0000000000000000", "ffffffffffffffff")).toBe(false);
  });
});

describe("aspectWeights", () => {
  it("gives style more weight than color when all active", () => {
    const w = aspectWeights(["color", "style", "shape", "pattern"]);
    expect(w.style).toBeGreaterThan(w.color);
    expect(w.style + w.color + w.shape + w.pattern).toBeCloseTo(1, 5);
  });

  it("uses base weights table", () => {
    expect(ASPECT_BASE_WEIGHTS.style).toBeGreaterThan(ASPECT_BASE_WEIGHTS.pattern);
  });
});

describe("scoreVisualSimilarity", () => {
  it("scores near-identical images high with perceptual boost", () => {
    const src = baseMeta();
    const cand = baseMeta({ id: "p2", owner_id: "u2", image_url: "https://cdn.example.com/b.jpg" });
    const img = feats({ dHash: "0123456789abcdef" });
    const score = scoreVisualSimilarity(src, cand, img, img, ["color", "style", "shape", "pattern"]);
    expect(score).toBeGreaterThan(0.85);
  });

  it("scores unrelated meta+features lower", () => {
    const src = baseMeta();
    const cand = baseMeta({
      id: "p2",
      owner_id: "u2",
      title: "Neon poster",
      category: "Graphic / Branding",
      tags: ["poster", "neon"],
      tools: ["Illustrator"],
      description: "club flyer",
      image_url: "https://cdn.example.com/c.jpg",
    });
    const a = feats({ dHash: "0123456789abcdef" });
    const b = feats({
      palette: [{ h: 280, s: 90, l: 40, weight: 0.8 }],
      aspectRatio: 0.6,
      brightness: 40,
      contrast: 90,
      edgeDensity: 80,
      colorVariance: 90,
      dHash: "fedcba9876543210",
    });
    const score = scoreVisualSimilarity(src, cand, a, b, ["color", "style", "shape", "pattern"]);
    expect(score).toBeLessThan(0.55);
  });
});

describe("blendSemanticVisual", () => {
  it("leans semantic when only style is selected", () => {
    const out = blendSemanticVisual(0.2, 0.9, ["style"]);
    expect(out).toBeCloseTo(0.2 * 0.35 + 0.9 * 0.65, 5);
  });

  it("stays visual-first for color-only", () => {
    const out = blendSemanticVisual(0.8, 0.1, ["color"]);
    expect(out).toBeCloseTo(0.8 * 0.85 + 0.1 * 0.15, 5);
  });

  it("returns visual when semantic missing", () => {
    expect(blendSemanticVisual(0.44, null, ["style"])).toBe(0.44);
  });
});

describe("dedupeSimilarResults", () => {
  it("keeps one per project and drops duplicate urls / near-hashes", () => {
    const items: ScoredSimilar[] = [
      {
        project_id: "a",
        title: "A",
        category: "WEB/UI",
        owner_id: "u1",
        image_url: "https://cdn.example.com/x.jpg?w=200",
        similarity: 0.9,
        dHash: "aaaaaaaaaaaaaaaa",
      },
      {
        project_id: "dup-url",
        title: "Same asset",
        category: "WEB/UI",
        owner_id: "u9",
        image_url: "https://cdn.example.com/x.jpg?w=800",
        similarity: 0.8,
        dHash: "bbbbbbbbbbbbbbbb",
      },
      {
        project_id: "a",
        title: "A2",
        category: "WEB/UI",
        owner_id: "u1",
        image_url: "https://cdn.example.com/y.jpg",
        similarity: 0.85,
        dHash: "cccccccccccccccc",
      },
      {
        project_id: "b",
        title: "B",
        category: "WEB/UI",
        owner_id: "u2",
        image_url: "https://cdn.example.com/unique-b.jpg",
        similarity: 0.82,
        dHash: "dddddddddddddddd",
      },
      {
        project_id: "c",
        title: "C",
        category: "WEB/UI",
        owner_id: "u3",
        image_url: "https://cdn.example.com/z.jpg",
        similarity: 0.7,
        dHash: "aaaaaaaaaaaaaaaa", // near-dup of first
      },
    ];
    const out = dedupeSimilarResults(items, 10);
    expect(out.map((x) => x.project_id)).toEqual(["a", "b"]);
  });

  it("soft-penalizes repeated owners", () => {
    const items: ScoredSimilar[] = [
      {
        project_id: "a",
        title: "A",
        category: "WEB/UI",
        owner_id: "u1",
        image_url: "https://cdn.example.com/1.jpg",
        similarity: 0.9,
        dHash: "1111111111111111",
      },
      {
        project_id: "b",
        title: "B",
        category: "WEB/UI",
        owner_id: "u1",
        image_url: "https://cdn.example.com/2.jpg",
        similarity: 0.88,
        dHash: "2222222222222222",
      },
      {
        project_id: "c",
        title: "C",
        category: "WEB/UI",
        owner_id: "u2",
        image_url: "https://cdn.example.com/3.jpg",
        similarity: 0.86,
        dHash: "3333333333333333",
      },
    ];
    const out = dedupeSimilarResults(items, 10);
    expect(out[0].project_id).toBe("a");
    // u1 second hit penalized below u2
    expect(out[1].project_id).toBe("c");
    expect(out[2].project_id).toBe("b");
    expect(out[2].similarity).toBeLessThan(0.88);
  });
});
