import { describe, expect, it } from "vitest";
import {
  normalizeSlug,
  portfolioCompleteness,
  portfolioPublicUrl,
  slugFromDisplayName,
  validateSlug,
} from "@/lib/portfolioSchema";
import type { PortfolioPage } from "@/lib/portfolioSchema";

const emptyPage = (): Pick<
  PortfolioPage,
  "hero" | "about" | "skills" | "experience" | "featuredWork" | "resume"
> => ({
  hero: {
    displayName: "",
    headline: "",
    avatarUrl: "",
    location: "",
    availability: "available",
    email: "",
    phone: "",
    lineId: "",
  },
  about: { bio: "" },
  skills: { tags: [], services: [] },
  experience: [],
  featuredWork: [],
  resume: { fileUrl: "", fileName: "", label: "ดาวน์โหลด CV" },
});

describe("portfolioSchema", () => {
  describe("validateSlug", () => {
    it("accepts valid slugs", () => {
      expect(validateSlug("somchai-design")).toEqual({ ok: true, slug: "somchai-design" });
      expect(validateSlug("  A-B-9  ")).toEqual({ ok: true, slug: "a-b-9" });
    });

    it("rejects too short slugs", () => {
      const r = validateSlug("ab");
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.reason).toMatch(/3 ตัวอักษร/);
    });

    it("rejects reserved slugs", () => {
      const r = validateSlug("dashboard");
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.reason).toMatch(/สงวน/);
    });

    it("normalizes invalid characters", () => {
      const r = validateSlug("hello_world");
      expect(r).toEqual({ ok: true, slug: "hello-world" });
    });
  });

  describe("normalizeSlug", () => {
    it("lowercases and replaces spaces", () => {
      expect(normalizeSlug("Hello World")).toBe("hello-world");
    });
  });

  describe("slugFromDisplayName", () => {
    it("generates slug from name", () => {
      const slug = slugFromDisplayName("Somchai Design");
      expect(slug.length).toBeGreaterThanOrEqual(3);
      expect(validateSlug(slug).ok).toBe(true);
    });
  });

  describe("portfolioPublicUrl", () => {
    it("builds /p/slug path", () => {
      expect(portfolioPublicUrl("my-portfolio")).toContain("/p/my-portfolio");
    });
  });

  describe("portfolioCompleteness", () => {
    it("returns 0 for empty page", () => {
      expect(portfolioCompleteness(emptyPage())).toBe(0);
    });

    it("increases with filled sections", () => {
      const page = emptyPage();
      page.hero.displayName = "Test";
      page.hero.headline = "Designer";
      expect(portfolioCompleteness(page)).toBeGreaterThan(0);
    });

    it("returns 100 when all checks pass", () => {
      const page = emptyPage();
      page.hero.displayName = "Test";
      page.hero.headline = "Designer";
      page.hero.avatarUrl = "https://example.com/a.jpg";
      page.about.bio = "Bio";
      page.skills.tags = ["UI"];
      page.experience = [
        {
          id: "1",
          role: "Designer",
          company: "Co",
          period: "2020",
          highlights: [],
          sortOrder: 0,
        },
      ];
      page.featuredWork = [
        {
          id: "1",
          title: "Work",
          description: "",
          coverUrl: "",
          url: "",
          sortOrder: 0,
        },
      ];
      page.resume.fileUrl = "https://example.com/cv.pdf";
      expect(portfolioCompleteness(page)).toBe(100);
    });
  });
});
