import { describe, expect, it } from "vitest";
import {
  SITE_NAME,
  SITE_TAGLINE,
  absoluteUrl,
  buildTitle,
  canonicalPath,
  isThinProfile,
  shouldNoindexSearchParams,
  truncateDescription,
} from "@/lib/seo";
import {
  breadcrumbJsonLd,
  jobPostingJsonLd,
  organizationJsonLd,
  websiteJsonLd,
} from "@/lib/seoSchemas";

describe("seo helpers", () => {
  describe("buildTitle", () => {
    it("returns site name and tagline when no page title", () => {
      expect(buildTitle()).toBe(`${SITE_NAME} — ${SITE_TAGLINE}`);
    });

    it("appends site name for page titles", () => {
      expect(buildTitle("งานจ้างดีไซน์")).toBe("งานจ้างดีไซน์ | Aplus1");
      expect(buildTitle("Jobs")).toBe("Jobs | Aplus1");
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

  describe("canonicalPath", () => {
    it("strips query and hash", () => {
      expect(canonicalPath("/jobs?sort=new#x")).toBe("/jobs");
      expect(canonicalPath("/project/abc?utm=1")).toBe("/project/abc");
    });
  });

  describe("shouldNoindexSearchParams", () => {
    it("flags filter/search params", () => {
      expect(shouldNoindexSearchParams("q=logo")).toBe(true);
      expect(shouldNoindexSearchParams("with=Figma")).toBe(true);
      expect(shouldNoindexSearchParams("mode=designers")).toBe(false);
    });
  });

  describe("isThinProfile", () => {
    it("marks empty profiles as thin", () => {
      expect(isThinProfile({ bio: "", projectCount: 0 })).toBe(true);
      expect(isThinProfile({ bio: "x".repeat(50), projectCount: 0 })).toBe(false);
      expect(isThinProfile({ bio: "", projectCount: 2 })).toBe(false);
    });
  });
});

describe("seoSchemas", () => {
  it("builds website and organization", () => {
    expect(websiteJsonLd()["@type"]).toBe("WebSite");
    expect(organizationJsonLd()["@type"]).toBe("Organization");
  });

  it("builds job posting with remote support", () => {
    const ld = jobPostingJsonLd({
      id: "11111111-1111-1111-1111-111111111111",
      title: "Designer",
      description: "ทำแบรนด์",
      employment_type: "freelance",
      location_type: "remote",
      status: "open",
      created_at: "2026-01-01T00:00:00Z",
    });
    expect(ld["@type"]).toBe("JobPosting");
    expect(ld.jobLocationType).toBe("TELECOMMUTE");
  });

  it("builds breadcrumb list", () => {
    const ld = breadcrumbJsonLd([
      { name: "หน้าแรก", path: "/" },
      { name: "งาน", path: "/jobs" },
    ]);
    expect(ld["@type"]).toBe("BreadcrumbList");
    expect((ld.itemListElement as unknown[]).length).toBe(2);
  });
});
