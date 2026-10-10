import { z } from "zod";
import { formatPeriodRange, type CvDateLang } from "@/lib/cvDates";
import { hasCatalogToolIcon } from "@/lib/toolIcons";
import { canonicalizeSkillChip } from "@/data/skillChipOptions";

export const WORK_ARRANGEMENTS = ["remote", "onsite", "hybrid"] as const;
export type WorkArrangement = (typeof WORK_ARRANGEMENTS)[number];

export const WORK_ARRANGEMENT_LABELS: Record<WorkArrangement, string> = {
  remote: "ทำงานระยะไกล",
  onsite: "เข้าออฟฟิศ",
  hybrid: "ไฮบริด",
};

export const CV_LANGUAGE_OPTIONS = [
  "Thai",
  "English",
  "Chinese",
  "Cantonese",
  "Japanese",
  "Korean",
  "Vietnamese",
  "Indonesian",
  "Malay",
  "Burmese",
  "Khmer",
  "Lao",
  "Filipino",
  "Hindi",
  "Arabic",
  "French",
  "German",
  "Spanish",
  "Italian",
  "Portuguese",
  "Dutch",
  "Russian",
  "Turkish",
  "Swedish",
  "Polish",
] as const;
export type CvLanguageName = (typeof CV_LANGUAGE_OPTIONS)[number];
export const CV_LANGUAGE_OTHER = "__other__";

export const CV_LANGUAGE_LEVELS = ["native", "fluent", "intermediate", "basic"] as const;
export type CvLanguageLevel = (typeof CV_LANGUAGE_LEVELS)[number];

export const CV_LANGUAGE_LEVEL_LABELS: Record<CvLanguageLevel, string> = {
  native: "Native",
  fluent: "Fluent",
  intermediate: "Intermediate",
  basic: "Basic",
};

export type CvLanguageItem = {
  name: string;
  level: CvLanguageLevel | "";
};

const LANGUAGE_ALIAS: Record<string, string> = {
  thai: "Thai",
  ไทย: "Thai",
  english: "English",
  อังกฤษ: "English",
  en: "English",
  chinese: "Chinese",
  จีน: "Chinese",
  zh: "Chinese",
  mandarin: "Chinese",
  cantonese: "Cantonese",
  กวางตุ้ง: "Cantonese",
  yue: "Cantonese",
  japanese: "Japanese",
  ญี่ปุ่น: "Japanese",
  ja: "Japanese",
  korean: "Korean",
  เกาหลี: "Korean",
  ko: "Korean",
  vietnamese: "Vietnamese",
  เวียดนาม: "Vietnamese",
  vi: "Vietnamese",
  indonesian: "Indonesian",
  อินโดนีเซีย: "Indonesian",
  bahasa: "Indonesian",
  id: "Indonesian",
  malay: "Malay",
  มาเลย์: "Malay",
  ms: "Malay",
  burmese: "Burmese",
  myanmar: "Burmese",
  พม่า: "Burmese",
  my: "Burmese",
  khmer: "Khmer",
  cambodian: "Khmer",
  เขมร: "Khmer",
  กัมพูชา: "Khmer",
  km: "Khmer",
  lao: "Lao",
  ลาว: "Lao",
  lo: "Lao",
  filipino: "Filipino",
  tagalog: "Filipino",
  ฟิลิปปินส์: "Filipino",
  tl: "Filipino",
  hindi: "Hindi",
  ฮินดี: "Hindi",
  hi: "Hindi",
  arabic: "Arabic",
  อาหรับ: "Arabic",
  ar: "Arabic",
  french: "French",
  ฝรั่งเศส: "French",
  fr: "French",
  german: "German",
  เยอรมัน: "German",
  de: "German",
  spanish: "Spanish",
  สเปน: "Spanish",
  es: "Spanish",
  italian: "Italian",
  อิตาลี: "Italian",
  it: "Italian",
  portuguese: "Portuguese",
  โปรตุเกส: "Portuguese",
  pt: "Portuguese",
  dutch: "Dutch",
  ดัตช์: "Dutch",
  ฮอลแลนด์: "Dutch",
  nl: "Dutch",
  russian: "Russian",
  รัสเซีย: "Russian",
  ru: "Russian",
  turkish: "Turkish",
  ตุรกี: "Turkish",
  tr: "Turkish",
  swedish: "Swedish",
  สวีเดน: "Swedish",
  sv: "Swedish",
  polish: "Polish",
  โปแลนด์: "Polish",
  pl: "Polish",
};

export function normalizeCvLanguage(raw: string): string | null {
  const t = raw.trim().slice(0, 40);
  if (!t) return null;
  if (t === CV_LANGUAGE_OTHER || t.toLowerCase() === "other" || t === "อื่นๆ") return null;
  const exact = CV_LANGUAGE_OPTIONS.find((o) => o.toLowerCase() === t.toLowerCase());
  if (exact) return exact;
  return LANGUAGE_ALIAS[t] ?? LANGUAGE_ALIAS[t.toLowerCase()] ?? t;
}

export function normalizeCvLanguageLevel(raw: string): CvLanguageLevel | "" {
  const t = raw.trim().toLowerCase();
  return CV_LANGUAGE_LEVELS.includes(t as CvLanguageLevel) ? (t as CvLanguageLevel) : "";
}

export function parseCvLanguages(raw: unknown): CvLanguageItem[] {
  if (!Array.isArray(raw)) return [];
  const out: CvLanguageItem[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    let name = "";
    let level: CvLanguageLevel | "" = "";
    if (typeof item === "string") {
      name = normalizeCvLanguage(item) ?? "";
    } else if (item && typeof item === "object") {
      const o = item as Record<string, unknown>;
      name = typeof o.name === "string" ? (normalizeCvLanguage(o.name) ?? "") : "";
      level = typeof o.level === "string" ? normalizeCvLanguageLevel(o.level) : "";
    }
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ name, level });
    if (out.length >= 8) break;
  }
  return out;
}

export const EDUCATION_DEGREES = [
  "high_school",
  "vocational",
  "high_vocational",
  "bachelor",
  "master",
  "doctorate",
] as const;
export type EducationDegree = (typeof EDUCATION_DEGREES)[number];

export const EDUCATION_DEGREE_LABELS: Record<EducationDegree, string> = {
  high_school: "High School",
  vocational: "Vocational Certificate",
  high_vocational: "High Vocational Diploma",
  bachelor: "Bachelor's",
  master: "Master's",
  doctorate: "Doctorate",
};

export function educationNeedsFaculty(degree: EducationDegree | null | undefined): boolean {
  return degree === "bachelor" || degree === "master" || degree === "doctorate";
}

export function educationNeedsField(degree: EducationDegree | null | undefined): boolean {
  return degree !== "high_school" && !!degree;
}

function parseEducationDegree(raw: unknown): EducationDegree | null {
  return typeof raw === "string" && EDUCATION_DEGREES.includes(raw as EducationDegree)
    ? (raw as EducationDegree)
    : null;
}

export function educationDetailLine(
  item: {
    degree?: EducationDegree | null;
    faculty?: string | null;
    field?: string | null;
  },
  degreeLabels: Record<EducationDegree, string> = EDUCATION_DEGREE_LABELS,
): string {
  const { lead, tail } = educationDetailLines(item, degreeLabels);
  return [lead, tail].filter(Boolean).join(" · ");
}

/** Last education detail (field) moves to its own line when degree/faculty already fill the first. */
export function educationDetailLines(
  item: {
    degree?: EducationDegree | null;
    faculty?: string | null;
    field?: string | null;
  },
  degreeLabels: Record<EducationDegree, string> = EDUCATION_DEGREE_LABELS,
): { lead: string; tail: string } {
  const degree = item.degree ?? null;
  const faculty = educationNeedsFaculty(degree) ? (item.faculty ?? "").trim() : "";
  const field = (item.field ?? "").trim();
  const lead = [degree ? degreeLabels[degree] : "", faculty].filter(Boolean).join(" · ");
  if (field && lead) return { lead, tail: field };
  return { lead: lead || field, tail: "" };
}

export function splitFullName(fullName: string): { firstName: string; lastName: string } {
  const t = fullName.trim().replace(/\s+/g, " ");
  if (!t) return { firstName: "", lastName: "" };
  const i = t.indexOf(" ");
  if (i === -1) return { firstName: t.slice(0, 40), lastName: "" };
  return {
    firstName: t.slice(0, i).slice(0, 40),
    lastName: t.slice(i + 1).trim().slice(0, 40),
  };
}

export function composeFullName(firstName: string, lastName: string): string {
  return `${firstName.trim()} ${lastName.trim()}`.replace(/\s+/g, " ").trim().slice(0, 80);
}

export const educationItemSchema = z.object({
  school: z.string().trim().min(1, "Enter the institution").max(80),
  degree: z.enum(EDUCATION_DEGREES).nullable().optional().default(null),
  faculty: z.string().trim().max(80).optional().default(""),
  field: z.string().trim().max(80).optional().default(""),
  period: z.string().trim().max(60).optional().default(""),
  periodStart: z.string().trim().max(40).optional().default(""),
  periodEnd: z.string().trim().max(40).optional().default(""),
  isCurrent: z.boolean().optional().default(false),
});
export type EducationItem = z.infer<typeof educationItemSchema>;

export const certificationItemSchema = z.object({
  title: z.string().trim().min(1, "Enter the course or certificate").max(80),
  issuer: z.string().trim().max(80).optional().default(""),
  year: z.string().trim().max(10).optional().default(""),
});
export type CertificationItem = z.infer<typeof certificationItemSchema>;

export const awardItemSchema = z.object({
  event: z.string().trim().min(1, "Enter the competition or event").max(80),
  award: z.string().trim().min(1, "Enter the award").max(80),
  year: z.string().trim().max(10).optional().default(""),
});
export type AwardItem = z.infer<typeof awardItemSchema>;

export const cvLanguageItemSchema = z.object({
  name: z.string().trim().min(1).max(40),
  level: z.enum(CV_LANGUAGE_LEVELS).or(z.literal("")).optional().default(""),
});

export const CV_DOC_LANGS = ["en", "th"] as const;
export type CvDocLang = (typeof CV_DOC_LANGS)[number];

/** Language of the CV document itself (headings, month names, labels) — not the editor UI. */
export function parseCvDocLang(raw: unknown): CvDocLang {
  return raw === "th" ? "th" : "en";
}

export const CV_MILITARY_STATUSES = ["completed", "exempt", "not_required"] as const;
export type CvMilitaryStatus = (typeof CV_MILITARY_STATUSES)[number];

export function parseCvMilitary(raw: unknown): CvMilitaryStatus | null {
  return CV_MILITARY_STATUSES.includes(raw as CvMilitaryStatus) ? (raw as CvMilitaryStatus) : null;
}

export const referenceItemSchema = z.object({
  name: z.string().trim().min(1).max(60),
  role: z.string().trim().max(80).optional().default(""),
  contact: z.string().trim().max(80).optional().default(""),
});
export type ReferenceItem = z.infer<typeof referenceItemSchema>;

export const CV_REFERENCES_MAX = 3;
export const CV_FEATURED_PROJECTS_MAX = 3;

export function normalizeReferences(raw: unknown): ReferenceItem[] {
  if (!Array.isArray(raw)) return [];
  const out: ReferenceItem[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const r = item as Record<string, unknown>;
    const name = typeof r.name === "string" ? r.name.trim().slice(0, 60) : "";
    if (!name) continue;
    out.push({
      name,
      role: typeof r.role === "string" ? r.role.trim().slice(0, 80) : "",
      contact: typeof r.contact === "string" ? r.contact.trim().slice(0, 80) : "",
    });
    if (out.length >= CV_REFERENCES_MAX) break;
  }
  return out;
}

export function parseFeaturedProjectIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  for (const id of raw) {
    if (typeof id === "string" && id.trim() && id.length <= 64) seen.add(id.trim());
    if (seen.size >= CV_FEATURED_PROJECTS_MAX) break;
  }
  return [...seen];
}

export const profileCvSchema = z.object({
  education: z.array(educationItemSchema).max(10).default([]),
  certifications: z.array(certificationItemSchema).max(8).default([]),
  awards: z.array(awardItemSchema).max(8).default([]),
  tools: z.array(z.string().trim().min(1).max(40)).max(12).default([]),
  workArrangement: z.enum(WORK_ARRANGEMENTS).nullable().optional().default(null),
  languages: z.array(cvLanguageItemSchema).max(8).default([]),
  portfolioUrl: z.string().trim().max(255).optional().default(""),
  firstName: z.string().trim().max(40).optional().default(""),
  lastName: z.string().trim().max(40).optional().default(""),
  fullName: z.string().trim().max(80).optional().default(""),
  nameEn: z.string().trim().max(80).optional().default(""),
  docLang: z.enum(CV_DOC_LANGS).optional().default("en"),
  nationality: z.string().trim().max(40).optional().default(""),
  military: z.enum(CV_MILITARY_STATUSES).nullable().optional().default(null),
  references: z.array(referenceItemSchema).max(CV_REFERENCES_MAX).optional().default([]),
  featuredProjectIds: z.array(z.string().max(64)).max(CV_FEATURED_PROJECTS_MAX).optional().default([]),
  birthDate: z.string().trim().max(10).optional().default(""),
  desiredRole: z.string().trim().max(60).optional().default(""),
  contactEmail: z.string().trim().max(120).optional().default(""),
  contactLine: z.string().trim().max(50).optional().default(""),
  contactPhone: z.string().trim().max(16).optional().default(""),
  contactPublic: z.boolean().optional().default(false),
  about: z.string().trim().max(500).optional().default(""),
  addressDetail: z.enum(["short", "full"]).optional().default("short"),
  layout: z.enum(["two", "one"]).optional().default("two"),
  /** null = never chosen (legacy CVs keep showing the photo). */
  showPhoto: z.boolean().nullable().optional().default(null),
  visibility: z
    .object({
      about: z.boolean().optional().default(true),
      location: z.boolean().optional().default(true),
      languages: z.boolean().optional().default(true),
      skills: z.boolean().optional().default(true),
      software: z.boolean().optional().default(true),
      education: z.boolean().optional().default(true),
      experience: z.boolean().optional().default(true),
      certification: z.boolean().optional().default(true),
      awards: z.boolean().optional().default(true),
      contactEmail: z.boolean().optional().default(false),
      contactLine: z.boolean().optional().default(false),
      contactPhone: z.boolean().optional().default(false),
      portfolio: z.boolean().optional().default(true),
      website: z.boolean().optional().default(true),
      socials: z.boolean().optional().default(true),
      // Sensitive or opt-in blocks stay hidden until the owner switches them on.
      birthDate: z.boolean().optional().default(false),
      nationality: z.boolean().optional().default(false),
      military: z.boolean().optional().default(false),
      references: z.boolean().optional().default(false),
      projects: z.boolean().optional().default(false),
    })
    .optional()
    .default({}),
});
export type ProfileCv = z.infer<typeof profileCvSchema>;
export type CvVisibility = ProfileCv["visibility"];
export type CvVisibilityKey = keyof CvVisibility;
export type CvAddressDetail = ProfileCv["addressDetail"];
export type CvLayout = ProfileCv["layout"];

export function parseCvLayout(raw: unknown): CvLayout {
  return raw === "one" ? "one" : "two";
}

/** Photo is shown unless the owner switched it off (legacy CVs: shown). */
export function cvPhotoVisible(cv: Pick<ProfileCv, "showPhoto">): boolean {
  return cv.showPhoto !== false;
}

/**
 * First-time default for the photo switch: Thai résumés usually carry a photo,
 * English ones usually do not. An existing CV that never chose keeps its photo.
 */
export function defaultCvShowPhoto(rawCv: unknown, lang: "th" | "en"): boolean {
  const o = rawCv && typeof rawCv === "object" && !Array.isArray(rawCv) ? (rawCv as Record<string, unknown>) : null;
  if (o && typeof o.showPhoto === "boolean") return o.showPhoto;
  if (o && Object.keys(o).length > 0) return true;
  return lang === "th";
}

export const CV_VISIBILITY_KEYS = [
  "about",
  "location",
  "languages",
  "skills",
  "software",
  "education",
  "experience",
  "certification",
  "awards",
  "contactEmail",
  "contactLine",
  "contactPhone",
  "portfolio",
  "website",
  "socials",
  "birthDate",
  "nationality",
  "military",
  "references",
  "projects",
] as const;

export function defaultCvVisibility(contactPublic = false): CvVisibility {
  return {
    about: true,
    location: true,
    languages: true,
    skills: true,
    software: true,
    education: true,
    experience: true,
    certification: true,
    awards: true,
    contactEmail: contactPublic,
    contactLine: contactPublic,
    contactPhone: contactPublic,
    portfolio: true,
    website: true,
    socials: true,
    birthDate: false,
    nationality: false,
    military: false,
    references: false,
    projects: false,
  };
}

export function parseCvVisibility(raw: unknown, contactPublic = false): CvVisibility {
  const base = defaultCvVisibility(contactPublic);
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return base;
  const o = raw as Record<string, unknown>;
  for (const key of CV_VISIBILITY_KEYS) {
    if (typeof o[key] === "boolean") base[key] = o[key];
  }
  return base;
}

export function parseCvAddressDetail(raw: unknown): CvAddressDetail {
  return raw === "full" ? "full" : "short";
}

export const EMPTY_PROFILE_CV: ProfileCv = {
  education: [],
  certifications: [],
  awards: [],
  tools: [],
  workArrangement: null,
  languages: [],
  portfolioUrl: "",
  firstName: "",
  lastName: "",
  fullName: "",
  nameEn: "",
  docLang: "en",
  nationality: "",
  military: null,
  references: [],
  featuredProjectIds: [],
  birthDate: "",
  desiredRole: "",
  contactEmail: "",
  contactLine: "",
  contactPhone: "",
  contactPublic: false,
  about: "",
  addressDetail: "short",
  layout: "two",
  showPhoto: null,
  visibility: defaultCvVisibility(false),
};

export function normalizePortfolioUrl(raw: string): string {
  const t = raw.trim();
  if (!t) return "";
  const withProtocol = /^https?:\/\//i.test(t) ? t : `https://${t}`;
  return withProtocol.slice(0, 255);
}

export function normalizeBirthDate(raw: string): string {
  const t = raw.trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) return "";
  const [ys, ms, ds] = t.split("-");
  const y = Number(ys);
  const m = Number(ms);
  const d = Number(ds);
  const dt = new Date(y, m - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) return "";
  if (dt.getTime() > Date.now()) return "";
  if (y < 1920) return "";
  return t;
}

export function ageFromBirthDate(iso: string, now = new Date()): number | null {
  const t = normalizeBirthDate(iso);
  if (!t) return null;
  const [ys, ms, ds] = t.split("-");
  const y = Number(ys);
  const m = Number(ms) - 1;
  const d = Number(ds);
  let age = now.getFullYear() - y;
  if (now.getMonth() < m || (now.getMonth() === m && now.getDate() < d)) age -= 1;
  if (age < 0 || age > 120) return null;
  return age;
}

const EN_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

/** Birth date for About Me — English month, Buddhist year to match CV periods. */
export function formatCvBirthDate(iso: string): string {
  const t = normalizeBirthDate(iso);
  if (!t) return "";
  const [ys, ms, ds] = t.split("-");
  const y = Number(ys);
  const m = Number(ms);
  const d = Number(ds);
  const month = EN_MONTHS[m - 1];
  if (!y || !month || !d) return "";
  return `${d} ${month} ${y + 543}`;
}

export function normalizeContactEmail(raw: string): string {
  return raw.trim().slice(0, 120);
}

export function isSimpleEmail(raw: string): boolean {
  const t = raw.trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t) && t.length <= 120;
}

export function normalizeContactPhone(raw: string): string {
  let s = raw.trim().replace(/[^\d+]/g, "");
  if (s.startsWith("00")) s = `+${s.slice(2)}`;
  if (s.startsWith("+66") && s[3] === "0") s = `0${s.slice(4)}`;
  else if (s.startsWith("66") && s.length === 11) s = `+${s}`;
  return s.slice(0, 16);
}

export function isSimpleThaiPhone(raw: string): boolean {
  const t = normalizeContactPhone(raw);
  return /^(0[6-9]\d{8}|\+66[6-9]\d{8})$/.test(t);
}

export function formatEducationPeriod(
  item: {
    period?: string | null;
    periodStart?: string | null;
    periodEnd?: string | null;
    isCurrent?: boolean | null;
  },
  presentLabel = "Present",
  lang: CvDateLang = "en",
): string {
  return formatPeriodRange(item, presentLabel, lang);
}

export function normalizeEducationItem(raw: unknown): EducationItem | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const school = typeof r.school === "string" ? r.school.trim() : "";
  if (!school) return null;
  const degree = parseEducationDegree(r.degree);
  const faculty = typeof r.faculty === "string" ? r.faculty.trim() : "";
  const field = typeof r.field === "string" ? r.field.trim() : "";
  const period = typeof r.period === "string" ? r.period.trim() : "";
  let periodStart = typeof r.periodStart === "string" ? r.periodStart.trim() : "";
  let periodEnd = typeof r.periodEnd === "string" ? r.periodEnd.trim() : "";
  let isCurrent = r.isCurrent === true;
  if (!periodStart && period) {
    const parts = period.split(/\s*[-–—]\s*/);
    periodStart = (parts[0] ?? "").trim();
    const tail = (parts[1] ?? "").trim();
    if (/ปัจจุบัน|present|now/i.test(tail) || /ปัจจุบัน|present|now/i.test(period)) {
      isCurrent = true;
      periodEnd = "";
    } else {
      periodEnd = tail;
    }
  } else if (!isCurrent && /ปัจจุบัน|present|now/i.test(periodEnd || period)) {
    isCurrent = true;
    periodEnd = "";
  }
  const composed = formatEducationPeriod({ period, periodStart, periodEnd, isCurrent });
  return {
    school,
    degree,
    faculty: educationNeedsFaculty(degree) ? faculty : "",
    field,
    period: composed || period,
    periodStart,
    periodEnd: isCurrent ? "" : periodEnd,
    isCurrent,
  };
}

function parseStringList(raw: unknown, max: number): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const item of raw) {
    if (typeof item !== "string") continue;
    const t = item.trim();
    if (!t || t.length > 40) continue;
    out.push(t);
    if (out.length >= max) break;
  }
  return out;
}

export function normalizeCertificationItem(raw: unknown): CertificationItem | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const title = typeof r.title === "string" ? r.title.trim() : "";
  if (!title) return null;
  return {
    title: title.slice(0, 80),
    issuer: typeof r.issuer === "string" ? r.issuer.trim().slice(0, 80) : "",
    year: typeof r.year === "string" ? r.year.trim().slice(0, 10) : "",
  };
}

export function normalizeAwardItem(raw: unknown): AwardItem | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const event = typeof r.event === "string" ? r.event.trim() : "";
  const award = typeof r.award === "string" ? r.award.trim() : "";
  if (!event || !award) return null;
  return {
    event: event.slice(0, 80),
    award: award.slice(0, 80),
    year: typeof r.year === "string" ? r.year.trim().slice(0, 10) : "",
  };
}

export function parseProfileCv(raw: unknown): ProfileCv {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ...EMPTY_PROFILE_CV };
  }
  const o = raw as Record<string, unknown>;
  const education = Array.isArray(o.education)
    ? o.education.map(normalizeEducationItem).filter((x): x is EducationItem => !!x).slice(0, 10)
    : [];
  const certifications = Array.isArray(o.certifications)
    ? o.certifications.map(normalizeCertificationItem).filter((x): x is CertificationItem => !!x).slice(0, 8)
    : [];
  const awards = Array.isArray(o.awards)
    ? o.awards.map(normalizeAwardItem).filter((x): x is AwardItem => !!x).slice(0, 8)
    : [];
  const arrangementRaw = typeof o.workArrangement === "string" ? o.workArrangement : null;
  const workArrangement = WORK_ARRANGEMENTS.includes(arrangementRaw as WorkArrangement)
    ? (arrangementRaw as WorkArrangement)
    : null;
  const portfolioRaw = typeof o.portfolioUrl === "string" ? o.portfolioUrl : "";
  const firstNameRaw = typeof o.firstName === "string" ? o.firstName.trim().slice(0, 40) : "";
  const lastNameRaw = typeof o.lastName === "string" ? o.lastName.trim().slice(0, 40) : "";
  const fullNameRaw = typeof o.fullName === "string" ? o.fullName.trim().slice(0, 80) : "";
  const names =
    firstNameRaw || lastNameRaw ? { firstName: firstNameRaw, lastName: lastNameRaw } : splitFullName(fullNameRaw);
  const fullName = composeFullName(names.firstName, names.lastName) || fullNameRaw;
  const desiredRole = typeof o.desiredRole === "string" ? o.desiredRole.trim().slice(0, 60) : "";
  const contactEmail = typeof o.contactEmail === "string" ? o.contactEmail.trim().slice(0, 120) : "";
  const contactLine = typeof o.contactLine === "string" ? o.contactLine.trim().slice(0, 50) : "";
  const contactPhoneRaw = typeof o.contactPhone === "string" ? o.contactPhone : "";
  const contactPhone = normalizeContactPhone(contactPhoneRaw);
  const contactPublic = o.contactPublic === true;
  const about = typeof o.about === "string" ? o.about.trim().slice(0, 500) : "";
  const addressDetail = parseCvAddressDetail(o.addressDetail);
  const visibility = parseCvVisibility(o.visibility, contactPublic);
  const birthDate = normalizeBirthDate(typeof o.birthDate === "string" ? o.birthDate : "");
  const languages = parseCvLanguages(o.languages);
  return {
    education,
    certifications,
    awards,
    tools: parseStringList(o.tools, 12),
    workArrangement,
    languages,
    portfolioUrl: normalizePortfolioUrl(portfolioRaw),
    firstName: names.firstName,
    lastName: names.lastName,
    fullName,
    nameEn: typeof o.nameEn === "string" ? o.nameEn.trim().replace(/\s+/g, " ").slice(0, 80) : "",
    docLang: parseCvDocLang(o.docLang),
    nationality: typeof o.nationality === "string" ? o.nationality.trim().slice(0, 40) : "",
    military: parseCvMilitary(o.military),
    references: normalizeReferences(o.references),
    featuredProjectIds: parseFeaturedProjectIds(o.featuredProjectIds),
    birthDate,
    desiredRole,
    contactEmail,
    contactLine,
    contactPhone,
    contactPublic,
    about,
    addressDetail,
    layout: parseCvLayout(o.layout),
    showPhoto: typeof o.showPhoto === "boolean" ? o.showPhoto : null,
    visibility,
  };
}

export function profileCvToJson(cv: ProfileCv): ProfileCv {
  const firstName = (cv.firstName ?? "").trim().slice(0, 40);
  const lastName = (cv.lastName ?? "").trim().slice(0, 40);
  const languages = parseCvLanguages(cv.languages);
  return {
    education: cv.education.slice(0, 10),
    certifications: cv.certifications.slice(0, 8),
    awards: cv.awards.slice(0, 8),
    tools: cv.tools.map((t) => t.trim()).filter(Boolean).slice(0, 12),
    workArrangement: cv.workArrangement ?? null,
    languages,
    portfolioUrl: normalizePortfolioUrl(cv.portfolioUrl ?? ""),
    firstName,
    lastName,
    fullName: composeFullName(firstName, lastName),
    nameEn: (cv.nameEn ?? "").trim().replace(/\s+/g, " ").slice(0, 80),
    docLang: parseCvDocLang(cv.docLang),
    nationality: (cv.nationality ?? "").trim().slice(0, 40),
    military: parseCvMilitary(cv.military),
    references: normalizeReferences(cv.references),
    featuredProjectIds: parseFeaturedProjectIds(cv.featuredProjectIds),
    birthDate: normalizeBirthDate(cv.birthDate ?? ""),
    desiredRole: (cv.desiredRole ?? "").trim().slice(0, 60),
    contactEmail: normalizeContactEmail(cv.contactEmail ?? ""),
    contactLine: (cv.contactLine ?? "").trim().slice(0, 50),
    contactPhone: normalizeContactPhone(cv.contactPhone ?? ""),
    contactPublic:
      cv.visibility.contactEmail || cv.visibility.contactLine || cv.visibility.contactPhone,
    about: (cv.about ?? "").trim().slice(0, 500),
    addressDetail: parseCvAddressDetail(cv.addressDetail),
    layout: parseCvLayout(cv.layout),
    showPhoto: typeof cv.showPhoto === "boolean" ? cv.showPhoto : null,
    visibility: parseCvVisibility(cv.visibility, cv.contactPublic === true),
  };
}

export function experienceBullets(item: {
  highlights?: string[] | null;
  description?: string | null;
}): string[] {
  const fromHighlights = (item.highlights ?? [])
    .map((s) => s.trim().replace(/^[-•*]\s*/, ""))
    .filter(Boolean);
  if (fromHighlights.length) return fromHighlights.slice(0, 4);
  const d = (item.description ?? "").trim();
  if (!d) return [];
  return d
    .split(/\n+/)
    .map((s) => s.trim().replace(/^[-•*]\s*/, ""))
    .filter(Boolean)
    .slice(0, 4);
}

/**
 * Craft skills vs design software. Catalog programs stored in `skills`
 * are shown under Design Software so older mixed tags still scan correctly.
 */
export function partitionSkillsAndSoftware(
  skills: string[] | undefined,
  tools: string[] | undefined,
): { craftSkills: string[]; software: string[] } {
  const craftSkills: string[] = [];
  const software: string[] = [];
  const seenSoftware = new Set<string>();
  const seenCraft = new Set<string>();

  const addSoftware = (raw: string) => {
    const label = raw.trim();
    if (!label) return;
    const key = label.toLowerCase();
    if (seenSoftware.has(key)) return;
    seenSoftware.add(key);
    software.push(label);
  };

  for (const item of tools ?? []) addSoftware(item);
  for (const item of skills ?? []) {
    const label = item.trim();
    if (!label) continue;
    if (hasCatalogToolIcon(label)) addSoftware(label);
    else {
      const canon = canonicalizeSkillChip(label);
      const key = canon.toLowerCase();
      if (seenCraft.has(key)) continue;
      seenCraft.add(key);
      craftSkills.push(canon);
    }
  }

  return {
    craftSkills: craftSkills.slice(0, 30),
    software: software.slice(0, 12),
  };
}

export function cvPortraitUrl(cvPhotoUrl?: string | null, avatarUrl?: string | null): string | null {
  return cvPhotoUrl?.trim() || avatarUrl?.trim() || null;
}

export const PROFILE_INTRO_MAX = 100;
export const CV_ABOUT_MAX = 500;

/** CV About Me — prefers `cv.about`, falls back to legacy `profiles.bio`. */
export function cvAboutText(cv: ProfileCv, legacyBio?: string | null): string {
  return cv.about.trim() || (legacyBio ?? "").trim();
}

export function profileIntroText(bio?: string | null): string {
  return (bio ?? "").trim().slice(0, PROFILE_INTRO_MAX);
}

export function cvReadiness(input: {
  bio?: string | null;
  role?: string | null;
  skills?: string[];
  experience?: unknown[];
  education?: EducationItem[];
  tools?: string[];
  hasContact?: boolean;
}): { filled: number; total: number; ready: boolean } {
  const checks = [
    !!(input.role?.trim()),
    !!(input.bio?.trim() && (input.bio.trim().length >= 20)),
    (input.skills?.length ?? 0) >= 3,
    (input.experience?.length ?? 0) >= 1,
    (input.education?.length ?? 0) >= 1,
    !!input.hasContact,
  ];
  const filled = checks.filter(Boolean).length;
  return { filled, total: checks.length, ready: filled >= 4 };
}
