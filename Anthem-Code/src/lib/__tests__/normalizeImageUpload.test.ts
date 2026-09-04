import { describe, expect, it } from "vitest";
import { isAllowedPortfolioStillImage } from "@/lib/normalizeImageUpload";

function fakeFile(name: string, type: string) {
  return new File(["x"], name, { type });
}

describe("isAllowedPortfolioStillImage", () => {
  it("accepts jpeg and png", () => {
    expect(isAllowedPortfolioStillImage(fakeFile("a.jpg", "image/jpeg"))).toBe(true);
    expect(isAllowedPortfolioStillImage(fakeFile("a.jpeg", "image/jpeg"))).toBe(true);
    expect(isAllowedPortfolioStillImage(fakeFile("a.jpg", "image/jpg"))).toBe(true);
    expect(isAllowedPortfolioStillImage(fakeFile("a.png", "image/png"))).toBe(true);
  });

  it("rejects other image types", () => {
    expect(isAllowedPortfolioStillImage(fakeFile("a.webp", "image/webp"))).toBe(false);
    expect(isAllowedPortfolioStillImage(fakeFile("a.gif", "image/gif"))).toBe(false);
    expect(isAllowedPortfolioStillImage(fakeFile("a.heic", "image/heic"))).toBe(false);
  });

  it("falls back to extension when MIME is empty", () => {
    expect(isAllowedPortfolioStillImage(fakeFile("a.jpg", ""))).toBe(true);
    expect(isAllowedPortfolioStillImage(fakeFile("a.png", ""))).toBe(true);
    expect(isAllowedPortfolioStillImage(fakeFile("a.webp", ""))).toBe(false);
  });
});
