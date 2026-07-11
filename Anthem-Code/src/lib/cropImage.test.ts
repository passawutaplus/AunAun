import { describe, expect, it } from "vitest";
import { cornerRadiusFromPercent, getCenteredCoverCropArea, isSquareImageSize } from "./cropImage";

describe("isSquareImageSize", () => {
  it("accepts equal dimensions", () => {
    expect(isSquareImageSize(1000, 1000)).toBe(true);
  });

  it("rejects clearly non-square", () => {
    expect(isSquareImageSize(1920, 1080)).toBe(false);
  });

  it("allows tiny aspect drift", () => {
    expect(isSquareImageSize(1000, 1010)).toBe(true);
  });
});

describe("cornerRadiusFromPercent", () => {
  it("maps 0 to square corners", () => {
    expect(cornerRadiusFromPercent(200, 100, 0)).toBe(0);
  });

  it("maps 100 to half of shorter side", () => {
    expect(cornerRadiusFromPercent(200, 100, 100)).toBe(50);
  });

  it("clamps out of range", () => {
    expect(cornerRadiusFromPercent(100, 100, 150)).toBe(50);
    expect(cornerRadiusFromPercent(100, 100, -10)).toBe(0);
  });
});

describe("getCenteredCoverCropArea", () => {
  it("crops sides of a wide image for square", () => {
    const area = getCenteredCoverCropArea(2000, 1000, 1);
    expect(area.width).toBeCloseTo(1000);
    expect(area.height).toBeCloseTo(1000);
    expect(area.x).toBeCloseTo(500);
    expect(area.y).toBeCloseTo(0);
  });

  it("crops top/bottom of a tall image for square", () => {
    const area = getCenteredCoverCropArea(1000, 2000, 1);
    expect(area.width).toBeCloseTo(1000);
    expect(area.height).toBeCloseTo(1000);
    expect(area.x).toBeCloseTo(0);
    expect(area.y).toBeCloseTo(500);
  });
});
