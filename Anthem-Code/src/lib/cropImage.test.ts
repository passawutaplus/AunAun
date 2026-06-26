import { describe, expect, it } from "vitest";
import { isSquareImageSize } from "./cropImage";

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
