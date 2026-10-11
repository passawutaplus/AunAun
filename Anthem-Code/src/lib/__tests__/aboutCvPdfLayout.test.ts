import { describe, expect, it } from "vitest";
import { buildAboutCvModel, CV_FIT_SCALES, type AboutCvModelInput } from "@/lib/aboutCvModel";
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

const TEMPLATES = ["editorial", "index", "grid"] as const;

describe.each(TEMPLATES)("layoutAboutCv — %s", (template) => {
  const make = (n: number, cv: Record<string, unknown> = {}, avatar?: string) =>
    buildAboutCvModel(input(n, { template, ...cv }, avatar));

  it("fits a short CV on one page and keeps every op inside the page", () => {
    const { pages } = layoutAboutCv(make(2), measure, "orange", false);
    expect(pages).toHaveLength(1);
    for (const op of pages[0]) {
      if (op.t === "line" || op.t === "vline") continue;
      expect(op.x).toBeGreaterThanOrEqual(0);
      expect(op.y).toBeGreaterThanOrEqual(0);
      expect(op.y).toBeLessThanOrEqual(A4_H);
      expect(op.x).toBeLessThanOrEqual(A4_W + 1);
    }
    const all = texts(pages).join(" ");
    expect(all).toContain("Sam Ple");
    expect(all).toContain("Role 1");
    expect(all).toContain("sam@example.com");
  });

  it("emits link annotations for email and profile and a QR", () => {
    const { pages } = layoutAboutCv(make(1), measure, "orange", false);
    const urls = pages[0].flatMap((o) => (o.t === "link" ? [o.url] : []));
    expect(urls).toEqual(expect.arrayContaining(["mailto:sam@example.com", "https://samecor.com/sam"]));
    expect(pages[0].some((o) => o.t === "qr")).toBe(true);
  });

  it("only draws the photo when it is wanted and loaded", () => {
    const m = make(1, { showPhoto: true }, "https://x.example/a.jpg");
    expect(layoutAboutCv(m, measure, "orange", true).pages[0].some((o) => o.t === "photo")).toBe(true);
    expect(layoutAboutCv(m, measure, "orange", false).pages[0].some((o) => o.t === "photo")).toBe(false);
  });

  it("spills a long CV onto more pages without losing entries", () => {
    const { pages } = layoutAboutCv(make(14), measure, "mono", false);
    expect(pages.length).toBeGreaterThan(1);
    const all = texts(pages);
    for (let i = 1; i <= 14; i += 1) expect(all.some((t) => new RegExp(`Role ${i}(?: [|]|$)`).test(t))).toBe(true);
  });

  it("auto-fits: shrinks along the ladder only when that saves a page, never below the last step", () => {
    const lowest = CV_FIT_SCALES[CV_FIT_SCALES.length - 1];
    let shrunk = 0;
    for (let n = 2; n < 14; n += 1) {
      const out = layoutAboutCv(make(n), measure, "orange", false);
      expect(CV_FIT_SCALES as readonly number[]).toContain(out.scale);
      expect(out.scale).toBeGreaterThanOrEqual(lowest);
      if (out.scale < 1) {
        shrunk += 1;
        expect(out.pages).toHaveLength(1);
      }
    }
    expect(shrunk).toBeGreaterThan(0);
  });

  it("paginates at full size when even the smallest step overflows", () => {
    expect(layoutAboutCv(make(40), measure, "mono", false).scale).toBe(1);
  });

  it("prints Thai headings and personal details", () => {
    const model = buildAboutCvModel({
      ...input(1, {
        template,
        docLang: "th",
        birthDate: "1995-08-02",
        nationality: "ไทย",
        military: "completed",
        visibility: { birthDate: true, nationality: true, military: true, references: true },
        references: [{ name: "Dani Martinez", role: "CEO", contact: "0812345678" }],
      }),
    });
    const { pages } = layoutAboutCv(model, measure, "orange", false);
    const all = texts(pages).join("\n").toLowerCase();
    expect(all).toContain("สัญชาติ: ไทย");
    expect(all).toContain("บุคคลอ้างอิง");
  });

  it("draws headings with the heading font role", () => {
    const { pages } = layoutAboutCv(make(1), measure, "orange", false);
    const fonts = new Set(pages.flat().flatMap((o) => (o.t === "text" ? [o.font] : [])));
    expect(fonts.has("d")).toBe(true);
    expect(fonts.has("r")).toBe(true);
  });
});
