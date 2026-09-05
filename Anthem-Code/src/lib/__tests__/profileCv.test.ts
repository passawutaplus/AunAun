import { describe, expect, it } from "vitest";
import {
  ageFromBirthDate,
  composeFullName,
  cvAboutText,
  parseCvAddressDetail,
  parseCvVisibility,
  cvPortraitUrl,
  cvReadiness,
  educationDetailLine,
  educationDetailLines,
  educationNeedsFaculty,
  educationNeedsField,
  experienceBullets,
  formatCvBirthDate,
  normalizeCvLanguage,
  normalizeEducationItem,
  parseProfileCv,
  partitionSkillsAndSoftware,
  profileIntroText,
  splitFullName,
  isSimpleThaiPhone,
} from "@/lib/profileCv";
import { normalizeExperienceItem } from "@/lib/validators";
import { profileAboutPath, profileAboutUrl } from "@/lib/profileRoutes";

describe("parseProfileCv", () => {
  it("returns empty defaults for junk", () => {
    expect(parseProfileCv(null).education).toEqual([]);
    expect(parseProfileCv("x").tools).toEqual([]);
  });

  it("keeps education, tools, arrangement, languages", () => {
    const cv = parseProfileCv({
      education: [{ school: "Silpakorn", field: "Graphic Design", periodStart: "2562", periodEnd: "2566" }],
      tools: ["Figma", "Illustrator"],
      workArrangement: "hybrid",
      languages: ["ไทย", "อังกฤษ"],
      portfolioUrl: "behance.net/momo",
      fullName: "ภัสวุฒิ ศรีวงศ์",
      birthDate: "1990-01-15",
      desiredRole: "Graphic Designer",
      contactEmail: "me@example.com",
    });
    expect(cv.education[0]?.school).toBe("Silpakorn");
    expect(cv.tools).toEqual(["Figma", "Illustrator"]);
    expect(cv.workArrangement).toBe("hybrid");
    expect(cv.languages).toEqual([
      { name: "Thai", level: "" },
      { name: "English", level: "" },
    ]);
    expect(cv.portfolioUrl).toBe("https://behance.net/momo");
    expect(cv.about).toBe("");
    expect(cv.fullName).toBe("ภัสวุฒิ ศรีวงศ์");
    expect(cv.firstName).toBe("ภัสวุฒิ");
    expect(cv.lastName).toBe("ศรีวงศ์");
    expect(cv.desiredRole).toBe("Graphic Designer");
    expect(cv.contactEmail).toBe("me@example.com");
    expect(cv.contactPublic).toBe(false);
    expect(cv.birthDate).toBe("1990-01-15");
  });

  it("keeps contactPublic when explicitly enabled", () => {
    expect(parseProfileCv({ contactPublic: true }).contactPublic).toBe(true);
  });

  it("keeps a Thai contact phone on About Me", () => {
    expect(parseProfileCv({ contactPhone: "081-234-5678" }).contactPhone).toBe("0812345678");
  });

  it("prefers split first and last name fields", () => {
    const cv = parseProfileCv({ firstName: "สมชาย", lastName: "ใจดี", fullName: "ชื่อเก่า" });
    expect(cv.firstName).toBe("สมชาย");
    expect(cv.lastName).toBe("ใจดี");
    expect(cv.fullName).toBe("สมชาย ใจดี");
  });

  it("maps language aliases onto the standard list", () => {
    expect(parseProfileCv({ languages: ["English", "ไทย"] }).languages).toEqual([
      { name: "English", level: "" },
      { name: "Thai", level: "" },
    ]);
  });

  it("keeps a custom language name from Other", () => {
    expect(parseProfileCv({ languages: [{ name: "Mizo", level: "basic" }] }).languages).toEqual([
      { name: "Mizo", level: "basic" },
    ]);
  });

  it("keeps language levels and university education fields", () => {
    const cv = parseProfileCv({
      languages: [{ name: "Thai", level: "native" }],
      education: [
        {
          school: "KMITL",
          degree: "bachelor",
          faculty: "Architecture",
          field: "Product Design",
        },
      ],
      certifications: [{ title: "Packaging Intensive", issuer: "Adobe", year: "2567" }],
      awards: [{ event: "YDA", award: "First prize", year: "2566" }],
    });
    expect(cv.languages).toEqual([{ name: "Thai", level: "native" }]);
    expect(cv.education[0]?.degree).toBe("bachelor");
    expect(cv.education[0]?.faculty).toBe("Architecture");
    expect(cv.certifications[0]?.title).toBe("Packaging Intensive");
    expect(cv.awards[0]?.award).toBe("First prize");
  });
});

describe("normalizeEducationItem", () => {
  it("drops rows without a school", () => {
    expect(normalizeEducationItem({ field: "Design" })).toBeNull();
  });

  it("keeps faculty only for bachelor and above", () => {
    expect(educationNeedsFaculty("bachelor")).toBe(true);
    expect(educationNeedsFaculty("vocational")).toBe(false);
    expect(educationNeedsField("vocational")).toBe(true);
    expect(educationNeedsField("high_school")).toBe(false);
    expect(
      educationDetailLine({
        degree: "bachelor",
        faculty: "Architecture",
        field: "Product Design",
      }),
    ).toBe("Bachelor's · Architecture · Product Design");
    expect(
      educationDetailLines({
        degree: "bachelor",
        faculty: "สถาปัตยกรรมศาสตร์",
        field: "ออกแบบผลิตภัณฑ์",
      }),
    ).toEqual({
      lead: "Bachelor's · สถาปัตยกรรมศาสตร์",
      tail: "ออกแบบผลิตภัณฑ์",
    });
    expect(educationDetailLines({ degree: "high_school", field: "วิทย์-คณิต" })).toEqual({
      lead: "High School",
      tail: "วิทย์-คณิต",
    });
    expect(
      normalizeEducationItem({
        school: "Triam Udom",
        degree: "high_school",
        faculty: "should drop",
        field: "Science",
      }),
    ).toMatchObject({ faculty: "", field: "Science" });
  });
});

describe("experienceBullets", () => {
  it("prefers highlights", () => {
    expect(
      experienceBullets({ highlights: ["ออกแบบแพ็กเกจ 12 SKU"], description: "old blob" }),
    ).toEqual(["ออกแบบแพ็กเกจ 12 SKU"]);
  });

  it("splits legacy description lines", () => {
    expect(experienceBullets({ description: "- one\n- two" })).toEqual(["one", "two"]);
  });
});

describe("normalizeExperienceItem highlights", () => {
  it("fills highlights from description when missing", () => {
    const item = normalizeExperienceItem({
      title: "Designer",
      description: "ทำแบรนด์\nทำแพ็กเกจ",
    });
    expect(item?.highlights).toEqual(["ทำแบรนด์", "ทำแพ็กเกจ"]);
  });
});

describe("partitionSkillsAndSoftware", () => {
  it("keeps craft work in skills and catalog programs in software", () => {
    const { craftSkills, software } = partitionSkillsAndSoftware(
      ["ออกแบบแพ็กเกจ", "Figma", "ทำแบรนดิ้ง"],
      ["Illustrator"],
    );
    expect(craftSkills).toEqual(["Package Design", "Branding"]);
    expect(software).toEqual(["Illustrator", "Figma"]);
  });
});

describe("splitFullName", () => {
  it("splits first and last name from a stored full name", () => {
    expect(splitFullName("ภัสวุฒิ ศรีวงศ์")).toEqual({ firstName: "ภัสวุฒิ", lastName: "ศรีวงศ์" });
    expect(composeFullName("ภัสวุฒิ", "ศรีวงศ์")).toBe("ภัสวุฒิ ศรีวงศ์");
  });
});

describe("normalizeCvLanguage", () => {
  it("maps common aliases onto the standard list", () => {
    expect(normalizeCvLanguage("English")).toBe("English");
    expect(normalizeCvLanguage("ไทย")).toBe("Thai");
    expect(normalizeCvLanguage("เวียดนาม")).toBe("Vietnamese");
  });

  it("keeps a custom language name from Other", () => {
    expect(normalizeCvLanguage("Mizo")).toBe("Mizo");
    expect(normalizeCvLanguage("other")).toBeNull();
    expect(normalizeCvLanguage("อื่นๆ")).toBeNull();
  });
});

describe("isSimpleThaiPhone", () => {
  it("accepts a Thai mobile number", () => {
    expect(isSimpleThaiPhone("0812345678")).toBe(true);
    expect(isSimpleThaiPhone("12345")).toBe(false);
  });
});

describe("ageFromBirthDate", () => {
  it("computes age without showing the birthday", () => {
    expect(ageFromBirthDate("1990-01-15", new Date("2026-09-04T00:00:00"))).toBe(36);
    expect(ageFromBirthDate("1990-12-31", new Date("2026-09-04T00:00:00"))).toBe(35);
    expect(ageFromBirthDate("not-a-date")).toBeNull();
  });
});

describe("formatCvBirthDate", () => {
  it("formats a birth date with an English month and Buddhist year", () => {
    expect(formatCvBirthDate("1997-05-29")).toBe("29 May 2540");
    expect(formatCvBirthDate("not-a-date")).toBe("");
  });
});

describe("CV visibility", () => {
  it("hides application contact until each field is ticked", () => {
    const cv = parseProfileCv({ contactEmail: "a@b.co", contactPublic: false });
    expect(cv.visibility.contactEmail).toBe(false);
    expect(cv.visibility.location).toBe(true);
    expect(cv.addressDetail).toBe("short");
  });

  it("maps the old contactPublic flag onto email, LINE, and phone", () => {
    const vis = parseCvVisibility(undefined, true);
    expect(vis.contactEmail).toBe(true);
    expect(vis.contactLine).toBe(true);
    expect(vis.contactPhone).toBe(true);
  });

  it("keeps a per-field contact tick and full address", () => {
    const cv = parseProfileCv({
      visibility: { contactEmail: true, contactPhone: false, location: false },
      addressDetail: "full",
    });
    expect(cv.visibility.contactEmail).toBe(true);
    expect(cv.visibility.contactPhone).toBe(false);
    expect(cv.visibility.location).toBe(false);
    expect(parseCvAddressDetail(cv.addressDetail)).toBe("full");
  });
});

describe("cvAboutText and profileIntroText", () => {
  it("prefers cv.about and falls back to legacy bio", () => {
    expect(parseProfileCv({ about: "CV about me" }).about).toBe("CV about me");
    expect(cvAboutText(parseProfileCv({ about: "CV" }), "legacy")).toBe("CV");
    expect(cvAboutText(parseProfileCv({}), "legacy bio")).toBe("legacy bio");
  });

  it("keeps the community intro to 100 characters", () => {
    expect(profileIntroText("  hello  ")).toBe("hello");
    expect(profileIntroText("x".repeat(200))).toHaveLength(100);
  });
});

describe("cvPortraitUrl", () => {
  it("uses the About Me photo, then the profile photo", () => {
    expect(cvPortraitUrl("https://x/cv.jpg", "https://x/a.jpg")).toBe("https://x/cv.jpg");
    expect(cvPortraitUrl("", "https://x/a.jpg")).toBe("https://x/a.jpg");
    expect(cvPortraitUrl("", "")).toBeNull();
  });
});

describe("cvReadiness", () => {
  it("is ready when core scan fields are filled", () => {
    const r = cvReadiness({
      bio: "นักออกแบบกราฟิกสี่ปี ถนัดแพ็กเกจและงานพิมพ์",
      role: "Graphic designer",
      skills: ["Branding", "Packaging", "Figma"],
      experience: [{}],
      education: [{ school: "Silpakorn" }],
      hasContact: true,
    });
    expect(r.ready).toBe(true);
  });
});

describe("profileAboutUrl", () => {
  it("opens the About tab", () => {
    expect(profileAboutPath({ user_id: "u1", username: "momo" })).toBe("/@momo?tab=about");
    expect(profileAboutUrl({ user_id: "u1", username: "momo" }, "https://aplus1.app")).toBe(
      "https://aplus1.app/@momo?tab=about",
    );
  });
});
