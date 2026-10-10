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
