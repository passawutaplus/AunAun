import { describe, expect, it } from "vitest";
import { instagramHandle, instagramUrl, mailUrl, websiteLabel, websiteUrl } from "../contactLinks";

describe("contact links", () => {
  it("turns any Instagram form into one profile URL and handle", () => {
    for (const v of ["nok.studio", "@nok.studio", "instagram.com/nok.studio/", "https://www.instagram.com/nok.studio/"]) {
      expect(instagramHandle(v)).toBe("nok.studio");
    }
    expect(instagramUrl("@nok.studio")).toBe("https://www.instagram.com/nok.studio/");
    expect(instagramUrl("  ")).toBe("");
  });

  it("adds https to a bare website and shows it without scheme, www or trailing slash", () => {
    expect(websiteUrl("nok.studio")).toBe("https://nok.studio");
    expect(websiteUrl("http://nok.studio")).toBe("http://nok.studio");
    expect(websiteLabel("https://www.nok.studio/")).toBe("nok.studio");
    expect(websiteLabel(null)).toBe("");
  });

  it("makes a mailto link only for a real address", () => {
    expect(mailUrl(" hi@nok.studio ")).toBe("mailto:hi@nok.studio");
    expect(mailUrl("")).toBe("");
  });
});
