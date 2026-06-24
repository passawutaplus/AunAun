import { describe, expect, it } from "vitest";
import {
  SITE_NAME,
  SITE_TAGLINE,
  absoluteUrl,
  buildTitle,
  truncateDescription,
} from "@/lib/seo";

describe("seo helpers", () => {
  describe("buildTitle", () => {
    it("returns site name and tagline when no page title", () => {
      expect(buildTitle()).toBe(`${SITE_NAME} — ${SITE_TAGLINE}`);
    });

    it("appends site name for page titles", () => {
      expect(buildTitle("งานจ้างดีไซน์")).toBe("งานจ้างดีไซน์ | Pixel100");
      expect(buildTitle("Jobs")).toBe("Jobs | Pixel100");
    });
  });

  describe("truncateDescription", () => {
    it("returns short text unchanged", () => {
      expect(truncateDescription("สั้นๆ")).toBe("สั้นๆ");
    });

    it("truncates at 160 characters with ellipsis", () => {
      const long = "ก".repeat(200);
      const result = truncateDescription(long);
      expect(result.length).toBeLessThanOrEqual(160);
      expect(result.endsWith("…")).toBe(true);
    });

    it("collapses whitespace", () => {
      expect(truncateDescription("hello   world")).toBe("hello world");
    });
  });

  describe("absoluteUrl", () => {
    it("builds absolute URL from window origin in jsdom", () => {
      expect(absoluteUrl("/jobs")).toBe(`${window.location.origin}/jobs`);
    });

    it("normalizes paths without leading slash", () => {
      expect(absoluteUrl("jobs")).toBe(`${window.location.origin}/jobs`);
    });
  });
});
