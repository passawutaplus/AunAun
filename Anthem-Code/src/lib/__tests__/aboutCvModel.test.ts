import { describe, expect, it } from "vitest";
import { buildAboutCvModel, type AboutCvModelInput } from "@/lib/aboutCvModel";
import type { ExperienceItem } from "@/lib/validators";

const job = (over: Partial<ExperienceItem> = {}): ExperienceItem => ({
  title: "Art Director",
  company: "Studio X",
  period: "",
  periodStart: "2020",
  periodEnd: "",
  isCurrent: true,
  employmentType: "full_time",
  description: "",
  highlights: ["Led brand refresh"],
  ...over,
});

const base = (cv: Record<string, unknown> = {}): AboutCvModelInput => ({
  profile: {
    role: null,
    location: null,
    bio: "bio",
    website: null,
    line_id: "line-profile",
    username: "sam",
    cv: { fullName: "Sam Ple", desiredRole: "Designer", contactEmail: "sam@example.com", ...cv },
  },
  experience: [job()],
  skills: ["Branding"],
  profileUrl: "https://samecor.com/sam",
});

describe("buildAboutCvModel", () => {
  it("hides private contacts unless the owner forces them", () => {
    const hidden = buildAboutCvModel(base());
    expect(hidden.contacts.map((c) => c.kind)).toEqual(["profile"]);
    const forced = buildAboutCvModel({ ...base(), forceShowApplicationContact: true });
    expect(forced.contacts.map((c) => c.kind)).toEqual(["profile", "email", "line"]);
    expect(forced.contacts.find((c) => c.kind === "email")?.href).toBe("mailto:sam@example.com");
  });

  it("points the QR at the profile link and falls back to the portfolio", () => {
    expect(buildAboutCvModel(base()).qrTarget).toBe("https://samecor.com/sam");
    const noProfile = buildAboutCvModel({
      ...base({ portfolioUrl: "https://folio.example" }),
      profileUrl: null,
    });
    expect(noProfile.qrTarget).toBe("https://folio.example/");
  });

  it("drops sections switched off in visibility", () => {
    const m = buildAboutCvModel(base({ visibility: { experience: false } }));
    expect(m.sections.find((s) => s.key === "experience")).toBeUndefined();
  });

  it("builds experience entries with period, employer line and bullets", () => {
    const [exp] = buildAboutCvModel(base()).sections;
    expect(exp.key).toBe("experience");
    expect(exp.entries[0]).toMatchObject({
      title: "Art Director",
      period: "2020 - Present",
      lines: ["Studio X · Full-time"],
      bullets: ["Led brand refresh"],
    });
  });

  it("drops detail lines that repeat the title", () => {
    const m = buildAboutCvModel(base({ certifications: [{ title: "ACME", issuer: "acme", year: "2021" }] }));
    const cert = m.sections.find((s) => s.key === "certification");
    expect(cert?.entries[0].lines).toEqual([]);
  });

  it("only exposes the portrait when the photo switch is on", () => {
    const off = base({ showPhoto: false });
    off.profile.avatar_url = "https://img.example/a.jpg";
    expect(buildAboutCvModel(off).portraitUrl).toBeNull();
    const on = base({ showPhoto: true });
    on.profile.avatar_url = "https://img.example/a.jpg";
    expect(buildAboutCvModel(on).portraitUrl).toBe("https://img.example/a.jpg");
  });
});

describe("buildAboutCvModel — Phase 3 blocks", () => {
  it("switches headings, months and the name with the CV language", () => {
    const en = buildAboutCvModel(
      base({ nameEn: "Sam Ple", fullName: "สมชาย ใจดี", docLang: "en" }),
    );
    expect(en.name).toBe("Sam Ple");
    expect(en.sections[0].title).toBe("Experience");
    const th = buildAboutCvModel(base({ nameEn: "Sam Ple", fullName: "สมชาย ใจดี", docLang: "th" }));
    expect(th.name).toBe("สมชาย ใจดี");
    expect(th.sections[0].title).toBe("ประสบการณ์ทำงาน");
    expect(th.sections[0].entries[0].period).toBe("2020 - ปัจจุบัน");
    expect(th.labels.blocks.contact).toBe("ติดต่อ");
  });

  it("falls back to the other name when only one exists", () => {
    expect(buildAboutCvModel(base({ fullName: "สมชาย ใจดี", docLang: "en" })).name).toBe("สมชาย ใจดี");
    expect(buildAboutCvModel(base({ fullName: "", nameEn: "Sam", docLang: "th" })).name).toBe("Sam");
  });

  it("renders month names from YYYY-MM periods", () => {
    const input = base({ docLang: "th" });
    input.experience = [job({ periodStart: "2020-05", periodEnd: "2022-03", isCurrent: false })];
    expect(buildAboutCvModel(input).sections[0].entries[0].period).toBe("พ.ค. 2020 - มี.ค. 2022");
  });

  it("keeps personal details hidden until each one is switched on", () => {
    const cv = { birthDate: "1995-08-02", nationality: "Thai", military: "exempt" };
    expect(buildAboutCvModel(base(cv)).personal).toEqual([]);
    const shown = buildAboutCvModel(
      base({ ...cv, docLang: "en", visibility: { birthDate: true, nationality: true, military: true } }),
    );
    expect(shown.personal.map((p) => p.key)).toEqual(["birthDate", "nationality", "military"]);
    expect(shown.personal[0].value).toMatch(/^2 Aug 1995 \(\d+ yrs\)$/);
    expect(shown.personal[2].value).toBe("Exempt");
    const th = buildAboutCvModel(
      base({ ...cv, docLang: "th", visibility: { birthDate: true, military: true } }),
    );
    expect(th.personal[0].value).toMatch(/^2 ส\.ค\. 2538 \(\d+ ปี\)$/);
    expect(th.personal[1].value).toBe("ได้รับการยกเว้น");
  });

  it("adds references only when switched on", () => {
    const cv = { references: [{ name: "Dani Martinez", role: "CEO, Studio X", contact: "0812345678" }] };
    expect(buildAboutCvModel(base(cv)).sections.some((s) => s.key === "references")).toBe(false);
    const m = buildAboutCvModel(base({ ...cv, visibility: { references: true } }));
    const refs = m.sections.find((s) => s.key === "references");
    expect(refs?.entries[0]).toMatchObject({ title: "Dani Martinez", lines: ["CEO, Studio X", "0812345678"] });
  });

  it("features the picked projects in order, else the top three by views", () => {
    const projects = [
      { id: "a", title: "A", views: 5 },
      { id: "b", title: "B", views: 50 },
      { id: "c", title: "C", views: 20 },
      { id: "d", title: "D", views: 10 },
    ];
    const picked = buildAboutCvModel({
      ...base({ featuredProjectIds: ["c", "a"], visibility: { projects: true } }),
      projects,
      siteOrigin: "https://samecor.com",
    });
    const sec = picked.sections.find((s) => s.key === "projects");
    expect(sec?.entries.map((e) => e.title)).toEqual(["C", "A"]);
    expect(sec?.entries[0].href).toBe("https://samecor.com/project/c");
    const auto = buildAboutCvModel({
      ...base({ visibility: { projects: true } }),
      projects,
      siteOrigin: "https://samecor.com",
    });
    expect(auto.sections.find((s) => s.key === "projects")?.entries.map((e) => e.title)).toEqual(["B", "C", "D"]);
    expect(buildAboutCvModel({ ...base(), projects }).sections.some((s) => s.key === "projects")).toBe(false);
  });
});
