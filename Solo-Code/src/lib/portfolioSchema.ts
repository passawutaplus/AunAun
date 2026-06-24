import { z } from "zod";

export const PORTFOLIO_RESERVED_SLUGS = new Set([
  "p",
  "api",
  "auth",
  "admin",
  "dashboard",
  "brief",
  "track",
  "supplier",
  "planner",
  "vision",
  "license",
  "inhouse",
  "help",
  "pricing",
  "blog",
  "apply",
  "login",
  "signup",
  "settings",
  "portfolio",
]);

const SLUG_REGEX = /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])?$/;

export type PortfolioStatus = "draft" | "published";

export type PortfolioAvailability = "available" | "limited" | "unavailable";

export const portfolioHeroSchema = z.object({
  displayName: z.string().max(120).default(""),
  headline: z.string().max(200).default(""),
  avatarUrl: z.string().max(500).default(""),
  location: z.string().max(120).default(""),
  availability: z.enum(["available", "limited", "unavailable"]).default("available"),
  email: z.string().max(200).default(""),
  phone: z.string().max(30).default(""),
  lineId: z.string().max(120).default(""),
});

export const portfolioAboutSchema = z.object({
  bio: z.string().max(5000).default(""),
});

export const portfolioServiceSchema = z.object({
  id: z.string(),
  name: z.string().max(120),
  priceNote: z.string().max(120).optional(),
});

export const portfolioSkillsSchema = z.object({
  tags: z.array(z.string().max(60)).default([]),
  services: z.array(portfolioServiceSchema).default([]),
});

export const portfolioExperienceItemSchema = z.object({
  id: z.string(),
  role: z.string().max(120).default(""),
  company: z.string().max(120).default(""),
  period: z.string().max(80).default(""),
  highlights: z.array(z.string().max(300)).default([]),
  sortOrder: z.number().int().default(0),
});

export const portfolioFeaturedItemSchema = z.object({
  id: z.string(),
  title: z.string().max(120).default(""),
  description: z.string().max(1000).default(""),
  coverUrl: z.string().max(500).default(""),
  url: z.string().max(500).default(""),
  sortOrder: z.number().int().default(0),
});

export const portfolioExternalLinkSchema = z.object({
  id: z.string(),
  platform: z.string().max(40).default("website"),
  label: z.string().max(80).default(""),
  url: z.string().max(500).default(""),
});

export const portfolioResumeSchema = z.object({
  fileUrl: z.string().max(500).default(""),
  fileName: z.string().max(200).default(""),
  label: z.string().max(80).default("ดาวน์โหลด CV"),
});

export const portfolioVisibilitySchema = z.object({
  about: z.boolean().default(true),
  skills: z.boolean().default(true),
  experience: z.boolean().default(true),
  featured_work: z.boolean().default(true),
  external_links: z.boolean().default(true),
  resume: z.boolean().default(true),
  show_email: z.boolean().default(false),
  show_phone: z.boolean().default(false),
  show_line: z.boolean().default(false),
});

export type PortfolioHero = z.infer<typeof portfolioHeroSchema>;
export type PortfolioAbout = z.infer<typeof portfolioAboutSchema>;
export type PortfolioSkills = z.infer<typeof portfolioSkillsSchema>;
export type PortfolioExperienceItem = z.infer<typeof portfolioExperienceItemSchema>;
export type PortfolioFeaturedItem = z.infer<typeof portfolioFeaturedItemSchema>;
export type PortfolioExternalLink = z.infer<typeof portfolioExternalLinkSchema>;
export type PortfolioResume = z.infer<typeof portfolioResumeSchema>;
export type PortfolioVisibility = z.infer<typeof portfolioVisibilitySchema>;

export interface PortfolioPage {
  userId: string;
  slug: string;
  status: PortfolioStatus;
  hero: PortfolioHero;
  about: PortfolioAbout;
  skills: PortfolioSkills;
  experience: PortfolioExperienceItem[];
  featuredWork: PortfolioFeaturedItem[];
  externalLinks: PortfolioExternalLink[];
  resume: PortfolioResume;
  visibility: PortfolioVisibility;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PortfolioPublicPayload {
  slug: string;
  hero: PortfolioHero;
  about: PortfolioAbout;
  skills: PortfolioSkills;
  experience: PortfolioExperienceItem[];
  featured_work: PortfolioFeaturedItem[];
  external_links: PortfolioExternalLink[];
  resume: PortfolioResume;
  visibility: PortfolioVisibility;
  published_at?: string;
}

export const DEFAULT_PORTFOLIO_VISIBILITY: PortfolioVisibility = {
  about: true,
  skills: true,
  experience: true,
  featured_work: true,
  external_links: true,
  resume: true,
  show_email: false,
  show_phone: false,
  show_line: false,
};

export function normalizeSlug(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export function slugFromDisplayName(name: string): string {
  const base = normalizeSlug(
    name
      .replace(/[^\w\s\u0E00-\u0E7F-]/g, "")
      .replace(/\s+/g, "-"),
  );
  if (base.length >= 3) return base;
  return `freelancer-${Math.random().toString(36).slice(2, 8)}`;
}

export type SlugValidationResult =
  | { ok: true; slug: string }
  | { ok: false; reason: string };

export function validateSlug(raw: string): SlugValidationResult {
  const slug = normalizeSlug(raw);
  if (slug.length < 3) {
    return { ok: false, reason: "slug ต้องมีอย่างน้อย 3 ตัวอักษร" };
  }
  if (slug.length > 40) {
    return { ok: false, reason: "slug ยาวเกิน 40 ตัวอักษร" };
  }
  if (!SLUG_REGEX.test(slug)) {
    return { ok: false, reason: "ใช้ได้เฉพาะ a-z, 0-9 และ - (ห้ามขึ้นต้น/ลงท้ายด้วย -)" };
  }
  if (PORTFOLIO_RESERVED_SLUGS.has(slug)) {
    return { ok: false, reason: "slug นี้ถูกสงวนไว้" };
  }
  return { ok: true, slug };
}

export function portfolioPublicUrl(slug: string): string {
  const base =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://solofreelancer.com";
  return `${base}/p/${encodeURIComponent(slug)}`;
}

export function parseSkillsPayload(raw: unknown): PortfolioSkills {
  if (Array.isArray(raw)) {
    return { tags: raw.filter((t): t is string => typeof t === "string"), services: [] };
  }
  const parsed = portfolioSkillsSchema.safeParse(raw);
  return parsed.success ? parsed.data : { tags: [], services: [] };
}

export function portfolioCompleteness(page: Pick<
  PortfolioPage,
  "hero" | "about" | "skills" | "experience" | "featuredWork" | "resume"
>): number {
  let score = 0;
  const checks = [
    Boolean(page.hero.displayName?.trim()),
    Boolean(page.hero.headline?.trim()),
    Boolean(page.hero.avatarUrl?.trim()),
    Boolean(page.about.bio?.trim()),
    page.skills.tags.length > 0,
    page.experience.length > 0,
    page.featuredWork.length > 0,
    Boolean(page.resume.fileUrl?.trim()),
  ];
  for (const ok of checks) {
    if (ok) score += 1;
  }
  return Math.round((score / checks.length) * 100);
}

export const AVAILABILITY_LABELS: Record<PortfolioAvailability, string> = {
  available: "รับงาน",
  limited: "รับบางส่วน",
  unavailable: "ไม่รับงาน",
};

export const LINK_PLATFORM_OPTIONS = [
  { value: "website", label: "เว็บไซต์" },
  { value: "behance", label: "Behance" },
  { value: "dribbble", label: "Dribbble" },
  { value: "github", label: "GitHub" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "instagram", label: "Instagram" },
  { value: "pixel100", label: "Pixel100" },
  { value: "other", label: "อื่นๆ" },
] as const;
