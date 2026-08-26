import { describe, expect, it } from "vitest";
import { evaluateQualityFromStats, laplacianVariance, type KycQualityDocKind } from "@/lib/kycImageQuality";

function makeStats(w: number, h: number, pattern: "sharp" | "blur" | "dark" | "glareFlat" | "selfieCard" | "brightDoc") {
  const gray = new Float32Array(w * h);
  let sum = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let v = 120;
      if (pattern === "sharp") {
        v = (x + y) % 8 < 4 ? 40 : 200;
      } else if (pattern === "selfieCard") {
        v = x > w * 0.55 ? ((x + y) % 6 < 3 ? 40 : 210) : 125 + ((x + y) % 18 < 2 ? 28 : 0);
      } else if (pattern === "blur") {
        v = 120 + Math.sin(x / 40) * 8;
      } else if (pattern === "dark") {
        v = 30;
      } else if (pattern === "brightDoc") {
        v = 232;
        if (y > h * 0.42 && (y % 6 === 0 || (x + y) % 11 === 0)) v = 48;
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
    expect(r.checks.find((c) => c.id === "clear")?.pass).toBe(false);
  });

  it("evaluates selfie-with-card even when the face is off-center", async () => {
    const { evaluateSelfieQuality } = await import("@/lib/kycImageQuality");
    const stats = makeStats(160, 90, "selfieCard");
    const r = evaluateSelfieQuality(
      stats,
      { centerRatio: 0.2, edgeRatio: 0.22, skinClusters: 40 },
      null,
    );
    expect(r.checks.map((c) => c.id)).toEqual(["face_centered", "face_lighting", "face_sharp", "face_alone"]);
    expect(r.passed).toBe(true);
    expect(r.checks.every((c) => c.pass)).toBe(true);
  });

  it("rejects a selfie that has no card-like side", async () => {
    const { evaluateSelfieQuality } = await import("@/lib/kycImageQuality");
    const stats = makeStats(120, 160, "blur");
    const r = evaluateSelfieQuality(stats, { centerRatio: 0.2, edgeRatio: 0.1, skinClusters: 3 }, null);
    expect(r.checks.find((c) => c.id === "face_alone")?.pass).toBe(false);
  });

  it("passes a 4:3 phone photo of a sharp ID even if image corners are plain", () => {
    const stats = makeStats(160, 120, "sharp");
    const r = evaluateQualityFromStats(stats, 0.01, "id_card");
    expect(r.checks).toHaveLength(4);
    expect(r.checks.map((c) => c.id)).toEqual(["real_card", "four_corners", "clear", "not_blurry"]);
    expect(r.checks.map((c) => c.label)).toEqual([
      "บัตรจริงหรือไม่",
      "เห็นบัตรเต็มใบ",
      "รูปชัด แสงพอหรือไม่",
      "ไม่เบลอ ไม่สะท้อนแสง",
    ]);
    expect(r.passed).toBe(true);
  });

  it("passes a bright portrait digital bank-book screenshot that would fail ID rules", () => {
    const stats = makeStats(90, 100, "brightDoc");
    expect(evaluateQualityFromStats(stats, 0.33, "id_card").passed).toBe(false);
    const r = evaluateQualityFromStats(stats, 0.33, "bank_book");
    expect(r.passed).toBe(true);
    expect(r.checks).toHaveLength(4);
  });

  it("rejects a dark blank bank-book image", () => {
    const stats = makeStats(90, 100, "dark");
    const r = evaluateQualityFromStats(stats, 0.01, "bank_book");
    expect(r.passed).toBe(false);
  });
});
