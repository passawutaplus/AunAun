import { describe, expect, it } from "vitest";
import { evaluateQualityFromStats, laplacianVariance, type KycQualityDocKind } from "@/lib/kycImageQuality";

function makeStats(w: number, h: number, pattern: "sharp" | "blur" | "dark" | "glareFlat") {
  const gray = new Float32Array(w * h);
  let sum = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let v = 120;
      if (pattern === "sharp") {
        v = (x + y) % 8 < 4 ? 40 : 200;
      } else if (pattern === "blur") {
        v = 120 + Math.sin(x / 40) * 8;
      } else if (pattern === "dark") {
        v = 30;
      } else {
        v = 250;
      }
      gray[y * w + x] = v;
      sum += v;
    }
  }
  const mean = sum / gray.length;
  let varSum = 0;
  for (let i = 0; i < gray.length; i++) {
    const d = gray[i]! - mean;
    varSum += d * d;
  }
  return {
    width: w,
    height: h,
    gray,
    mean,
    std: Math.sqrt(varSum / gray.length),
  };
}

describe("kycImageQuality", () => {
  it("laplacian is higher for sharp patterns", () => {
    const sharp = makeStats(80, 50, "sharp");
    const blur = makeStats(80, 50, "blur");
    expect(laplacianVariance(sharp.gray, 80, 50)).toBeGreaterThan(laplacianVariance(blur.gray, 80, 50));
  });

  it("rejects dark flat images for id_card", () => {
    const stats = makeStats(160, 100, "dark");
    const r = evaluateQualityFromStats(stats, 0.01, "id_card" satisfies KycQualityDocKind);
    expect(r.passed).toBe(false);
    expect(r.message).toBe("กรุณาถ่ายใหม่");
    expect(r.checks.find((c) => c.id === "lighting")?.pass).toBe(false);
  });

  it("evaluates selfie face checks", async () => {
    const { evaluateSelfieQuality } = await import("@/lib/kycImageQuality");
    const stats = makeStats(120, 160, "sharp");
    const r = evaluateSelfieQuality(
      stats,
      { centerRatio: 0.25, edgeRatio: 0.05, skinClusters: 3 },
      { count: 1, centered: true },
    );
    expect(r.checks.map((c) => c.id)).toEqual(["face_centered", "face_lighting", "face_sharp", "face_alone"]);
    expect(r.checks.every((c) => c.pass)).toBe(true);
  });

  it("passes a reasonably sharp id-like image", () => {
    const stats = makeStats(160, 100, "sharp");
    const r = evaluateQualityFromStats(stats, 0.01, "id_card");
    expect(r.checks.find((c) => c.id === "not_blurry")?.pass).toBe(true);
    expect(r.checks.find((c) => c.id === "no_glare")?.pass).toBe(true);
  });
});
