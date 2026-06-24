import { describe, expect, it } from "vitest";
import { buildPageTitle, buildPublicPageHead, truncateDescription } from "@/lib/seoHead";

describe("seoHead", () => {
  describe("truncateDescription", () => {
    it("trims and collapses whitespace", () => {
      expect(truncateDescription("  hello   world  ")).toBe("hello world");
    });

    it("truncates beyond max length", () => {
      const long = "a".repeat(200);
      expect(truncateDescription(long, 160).length).toBeLessThanOrEqual(160);
    });
  });

  describe("buildPageTitle", () => {
    it("adds brand suffix when missing", () => {
      expect(buildPageTitle("ศูนย์ช่วยเหลือ")).toContain("So1o Freelancer");
    });

    it("skips suffix when title already mentions So1o", () => {
      expect(buildPageTitle("ศูนย์ช่วยเหลือ — So1o Freelancer")).toBe(
        "ศูนย์ช่วยเหลือ — So1o Freelancer",
      );
    });
  });

  describe("buildPublicPageHead", () => {
    it("includes canonical, OG, Twitter, and robots", () => {
      const head = buildPublicPageHead({
        title: "ราคา",
        description: "แพ็ก Free Pro Pro+",
        path: "/pricing",
      });

      const names = head.meta.map((m) =>
        "name" in m ? m.name : "property" in m ? m.property : "title",
      );
      expect(names).toContain("description");
      expect(names).toContain("robots");
      expect(names).toContain("og:title");
      expect(names).toContain("twitter:card");
      expect(head.links?.[0]?.href).toBe("https://solofreelancer.com/pricing");
    });

    it("embeds JSON-LD when provided", () => {
      const head = buildPublicPageHead({
        title: "Help",
        description: "Help center",
        path: "/help",
        jsonLd: { "@type": "WebPage", name: "Help" },
      });
      expect(head.scripts?.[0]?.type).toBe("application/ld+json");
      expect(head.scripts?.[0]?.children).toContain("WebPage");
    });
  });
});
