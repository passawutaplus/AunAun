import { describe, expect, it } from "vitest";
import { buildAboutCvModel, type AboutCvModelInput } from "@/lib/aboutCvModel";
import { A4_H, A4_W, layoutAboutCv, wrapText, type PdfMeasure, type PdfOp } from "@/lib/aboutCvPdfLayout";
import type { ExperienceItem } from "@/lib/validators";

// Roughly Sarabun-like: every character is half an em wide.
const measure: PdfMeasure = (text, _font, size) => text.length * size * 0.5;

const job = (i: number): ExperienceItem => ({
  title: `Role ${i}`,
  company: `Company ${i}`,
  period: "",
  periodStart: "2018",
  periodEnd: "2020",
  isCurrent: false,
  employmentType: null,
  description: "",
  highlights: ["Shipped a thing people liked", "Mentored the team and ran weekly critiques for the studio"],
});

const input = (n: number, cv: Record<string, unknown> = {}, avatar?: string): AboutCvModelInput => ({
  profile: {
    role: null,
    location: "Bangkok",
    bio: "I make brands. ".repeat(8),
    website: null,
    line_id: null,
    username: "sam",
    avatar_url: avatar,
    cv: { fullName: "Sam Ple", desiredRole: "Designer", contactEmail: "sam@example.com", ...cv },
  },
  experience: Array.from({ length: n }, (_, i) => job(i + 1)),
  skills: ["Branding", "Layout"],
  profileUrl: "https://samecor.com/sam",
  forceShowApplicationContact: true,
});

type TextOp = Extract<PdfOp, { t: "text" }>;
const texts = (pages: PdfOp[][]) =>
  pages.flatMap((p) => p.filter((o): o is TextOp => o.t === "text").map((o) => o.text));

describe("wrapText", () => {
  it("wraps on spaces and keeps blank lines", () => {
    const lines = wrapText("aaa bbb ccc\n\nddd", 8 * 5, (s) => s.length * 5);
    expect(lines).toEqual(["aaa bbb", "ccc", "", "ddd"]);
  });

  it("breaks an unbreakable word instead of overflowing", () => {
    const lines = wrapText("x".repeat(25), 10 * 5, (s) => s.length * 5);
    expect(lines.every((l) => l.length <= 10)).toBe(true);
    expect(lines.join("")).toBe("x".repeat(25));
  });

  it("never starts a Thai line with a vowel or tone mark", () => {
    const thai = "ผู้อำนวยการฝ่ายสร้างสรรค์งานออกแบบ";
    const lines = wrapText(thai, 60, (s) => s.length * 6);
    expect(lines.join("")).toBe(thai);
    for (const l of lines) expect(/^[ัิ-ฺ็-๎]/.test(l)).toBe(false);
  });
});

describe("layoutAboutCv", () => {
  it("fits a short CV on one page and keeps every op inside the page", () => {
    const model = buildAboutCvModel(input(2));
    const { pages } = layoutAboutCv(model, measure, "orange", false);
    expect(pages).toHaveLength(1);
    for (const op of pages[0]) {
      if (op.t === "line") continue;
      expect(op.x).toBeGreaterThanOrEqual(0);
      expect(op.y).toBeGreaterThanOrEqual(0);
      expect(op.y).toBeLessThanOrEqual(A4_H);
      expect(op.x).toBeLessThanOrEqual(A4_W);
    }
    const all = texts(pages).join(" ");
    expect(all).toContain("Sam Ple");
    expect(all).toContain("Role 1");
    expect(all).toContain("sam@example.com");
  });

  it("emits link annotations for email and profile and a QR", () => {
    const { pages } = layoutAboutCv(buildAboutCvModel(input(1)), measure, "orange", false);
    const urls = pages[0].flatMap((o) => (o.t === "link" ? [o.url] : []));
    expect(urls).toEqual(expect.arrayContaining(["mailto:sam@example.com", "https://samecor.com/sam"]));
    expect(pages[0].some((o) => o.t === "qr")).toBe(true);
  });

  it("only draws the photo when it is wanted and loaded", () => {
    const m = buildAboutCvModel(input(1, { showPhoto: true }, "https://x.example/a.jpg"));
    expect(layoutAboutCv(m, measure, "orange", true).pages[0].some((o) => o.t === "photo")).toBe(true);
    expect(layoutAboutCv(m, measure, "orange", false).pages[0].some((o) => o.t === "photo")).toBe(false);
  });

  it("spills a long CV onto more pages without losing entries", () => {
    const model = buildAboutCvModel(input(14));
    const { pages } = layoutAboutCv(model, measure, "mono", false);
    expect(pages.length).toBeGreaterThan(1);
    const all = texts(pages);
    for (let i = 1; i <= 14; i += 1) expect(all).toContain(`Role ${i}`);
  });

  it("uses the compact density only when it saves a page", () => {
    let compact: ReturnType<typeof layoutAboutCv> | null = null;
    for (let n = 3; n < 14 && !compact; n += 1) {
      const out = layoutAboutCv(buildAboutCvModel(input(n)), measure, "orange", false);
      if (out.scale < 1) compact = out;
    }
    expect(compact).not.toBeNull();
    expect(compact?.pages).toHaveLength(1);
  });

  it("lays out the single-column variant", () => {
    const model = buildAboutCvModel(input(2, { layout: "one" }));
    const { pages } = layoutAboutCv(model, measure, "slate", false);
    expect(pages).toHaveLength(1);
    expect(texts(pages)).toContain("SKILLS");
  });
});
