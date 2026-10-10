import type { ExperienceItem, SocialLinkItem } from "@/lib/validators";
import { EXPERIENCE_EMPLOYMENT_LABELS, formatExperiencePeriod, type ExperienceEmploymentType } from "@/lib/validators";
import { displayProfileAddress } from "@/lib/profileAddress";
import { safeHttpUrl } from "@/lib/safeUrl";
import { socialDisplayId } from "@/lib/externalUrl";
import { CV_DOC_COPY, type CvDocCopy } from "@/lib/aboutCvCopy";
import { ABOUT_EDIT_COPY, languageDisplayName } from "@/lib/aboutEditCopy";
import {
  ageFromBirthDate,
  cvAboutText,
  cvPhotoVisible,
  cvPortraitUrl,
  CV_LANGUAGE_LEVEL_LABELS,
  educationDetailLines,
  experienceBullets,
  formatEducationPeriod,
  normalizeBirthDate,
  parseProfileCv,
  partitionSkillsAndSoftware,
  type CvDocLang,
  type CvTemplate,
  type CvHeadingFont,
} from "@/lib/profileCv";

export type AboutCvProfile = {
  display_name?: string | null;
  username?: string | null;
  avatar_url?: string | null;
  cv_photo_url?: string | null;
  cv?: unknown;
  role: string | null;
  location: string | null;
  profile_address?: unknown;
  bio: string | null;
  website: string | null;
  line_id: string | null;
  facebook?: string | null;
  instagram?: string | null;
};

/** A SAMECOR project the owner may feature on the CV. */
export type CvProjectInput = { id: string; title: string; views?: number | null };

export type AboutCvModelInput = {
  profile: AboutCvProfile;
  experience: ExperienceItem[];
  skills: string[];
  socialLinks?: SocialLinkItem[];
  profileUrl?: string | null;
  /** Published projects of the owner; the CV picks `featuredProjectIds` (or the top 3 by views). */
  projects?: CvProjectInput[];
  /** Used to build project links, e.g. https://samecor.com. */
  siteOrigin?: string;
  /** Owner print/PDF — always include application email/LINE/phone. */
  forceShowApplicationContact?: boolean;
};

export type CvContactKind =
  | "profile"
  | "portfolio"
  | "email"
  | "phone"
  | "line"
  | "website"
  | "instagram"
  | "facebook"
  | "social";

export type CvContactItem = {
  key: string;
  kind: CvContactKind;
  label: string;
  value: string;
  /** Clickable target when the value is a link or mailto/tel. */
  href?: string;
};

export type CvEntryModel = {
  title: string;
  period?: string;
  lines: string[];
  bullets: string[];
  /** Whole entry links here (featured projects). */
  href?: string;
};

export type CvSectionKey =
  | "experience"
  | "projects"
  | "education"
  | "certification"
  | "awards"
  | "references";

export type CvSectionModel = { key: CvSectionKey; title: string; entries: CvEntryModel[] };

export type CvPersonalItem = { key: "birthDate" | "nationality" | "military"; label: string; value: string };

export type AboutCvModel = {
  template: CvTemplate;
  headingFont: CvHeadingFont;
  lang: CvDocLang;
  labels: CvDocCopy;
  name: string;
  desiredRole: string;
  bio: string;
  /** Portrait to draw, already gated by the photo switch; null when hidden. */
  portraitUrl: string | null;
  showPhoto: boolean;
  contacts: CvContactItem[];
  personal: CvPersonalItem[];
  qrTarget: string | undefined;
  place: string;
  languages: string[];
  craftSkills: string[];
  software: string[];
  sections: CvSectionModel[];
};

export const CV_TOP_PROJECTS_FALLBACK = 3;

export function hrefLabel(url: string): string {
  return url.replace(/^https?:\/\//i, "").replace(/\/$/, "");
}

const sameText = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/** Drop detail lines that just repeat the title (e.g. issuer == certificate name). */
function distinctLines(title: string, lines: (string | undefined)[]): string[] {
  const shown: string[] = [];
  for (const raw of lines) {
    const line = raw?.trim();
    if (!line || sameText(line, title) || shown.some((s) => sameText(s, line))) continue;
    shown.push(line);
  }
  return shown;
}

const MONTHS_LONG_EN = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];
const MONTHS_SHORT_TH = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
];

/** English: 12 May 1997. Thai: 12 พ.ค. 2540 (Buddhist year). */
export function formatBirthDateForCv(iso: string, lang: CvDocLang): string {
  const t = normalizeBirthDate(iso);
  if (!t) return "";
  const [y, m, d] = t.split("-").map(Number);
  return lang === "th"
    ? `${d} ${MONTHS_SHORT_TH[m - 1]} ${y + 543}`
    : `${d} ${MONTHS_LONG_EN[m - 1]} ${y}`;
}

/**
 * Pure data behind the About CV. The on-screen sheet and the text PDF both
 * render from this, so they can never disagree on what the CV says.
 */
export function buildAboutCvModel({
  profile,
  experience,
  skills,
  socialLinks = [],
  profileUrl,
  projects = [],
  siteOrigin = typeof window !== "undefined" ? window.location.origin : "",
  forceShowApplicationContact = false,
}: AboutCvModelInput): AboutCvModel {
  const cv = parseProfileCv(profile.cv);
  const vis = cv.visibility;
  const lang = cv.docLang;
  const copy = CV_DOC_COPY[lang];
  const editCopy = ABOUT_EDIT_COPY[lang];
  const showPhoto = cvPhotoVisible(cv);
  const name = (lang === "en" ? cv.nameEn.trim() || cv.fullName.trim() : cv.fullName.trim() || cv.nameEn.trim());
  const desiredRole = cv.desiredRole.trim();
  const bio = vis.about ? cvAboutText(cv, profile.bio) : "";
  const contactEmail = forceShowApplicationContact || vis.contactEmail ? cv.contactEmail.trim() : "";
  const contactPhone = forceShowApplicationContact || vis.contactPhone ? cv.contactPhone.trim() : "";
  const lineId =
    forceShowApplicationContact || vis.contactLine
      ? cv.contactLine.trim() || profile.line_id?.trim() || ""
      : "";
  const place = vis.location
    ? displayProfileAddress(profile.profile_address, profile.location, cv.addressDetail)
    : "";
  const website = vis.website ? safeHttpUrl(profile.website) : undefined;
  const instagramHandle = vis.socials
    ? (profile.instagram?.trim() ?? "")
        .replace(/^https?:\/\/(www\.)?instagram\.com\//i, "")
        .replace(/^@/, "")
        .replace(/\/.*$/, "")
    : "";
  const facebookHref = vis.socials
    ? profile.facebook?.trim()
      ? safeHttpUrl(profile.facebook) ??
        (/^[a-zA-Z0-9.\-_]+$/.test(profile.facebook.trim())
          ? `https://facebook.com/${encodeURIComponent(profile.facebook.trim())}`
          : undefined)
      : undefined
    : undefined;
  const extraSocials = vis.socials
    ? socialLinks
        .map((l) => {
          const href = safeHttpUrl(l.url);
          if (!href || !l.title.trim()) return null;
          return { title: l.title.trim(), href };
        })
        .filter((x): x is { title: string; href: string } => !!x)
    : [];
  const portfolio = vis.portfolio ? safeHttpUrl(cv.portfolioUrl) : undefined;
  const profileLink = profileUrl ? safeHttpUrl(profileUrl) : undefined;
  const { craftSkills, software } = partitionSkillsAndSoftware(
    vis.skills ? skills : [],
    vis.software ? cv.tools : [],
  );

  const contacts: CvContactItem[] = [];
  const addContact = (item: Omit<CvContactItem, "label"> & { label?: string }) =>
    contacts.push({ ...item, label: item.label ?? copy.contact[item.kind] });
  if (profileLink) addContact({ key: "profile", kind: "profile", value: hrefLabel(profileLink), href: profileLink });
  if (portfolio && portfolio !== profileLink)
    addContact({ key: "portfolio", kind: "portfolio", value: hrefLabel(portfolio), href: portfolio });
  if (contactEmail) addContact({ key: "email", kind: "email", value: contactEmail, href: `mailto:${contactEmail}` });
  if (contactPhone) addContact({ key: "phone", kind: "phone", value: contactPhone });
  if (lineId) addContact({ key: "line", kind: "line", value: lineId });
  if (website && website !== portfolio && website !== profileLink)
    addContact({ key: "website", kind: "website", value: hrefLabel(website), href: website });
  if (instagramHandle)
    addContact({
      key: "instagram",
      kind: "instagram",
      value: socialDisplayId(instagramHandle),
      href: `https://instagram.com/${instagramHandle}`,
    });
  if (facebookHref)
    addContact({ key: "facebook", kind: "facebook", value: socialDisplayId(facebookHref), href: facebookHref });
  for (const item of extraSocials)
    addContact({
      key: item.href,
      kind: "social",
      label: item.title,
      value: socialDisplayId(item.href),
      href: item.href,
    });

  // Sensitive personal details only appear when the owner switched each one on.
  const personal: CvPersonalItem[] = [];
  if (vis.birthDate) {
    const date = formatBirthDateForCv(cv.birthDate, lang);
    if (date) {
      const age = ageFromBirthDate(cv.birthDate);
      personal.push({
        key: "birthDate",
        label: copy.personal.birthDate,
        value: age === null ? date : `${date} (${copy.personal.age(age)})`,
      });
    }
  }
  if (vis.nationality && cv.nationality.trim()) {
    personal.push({ key: "nationality", label: copy.personal.nationality, value: cv.nationality.trim() });
  }
  if (vis.military && cv.military) {
    personal.push({ key: "military", label: copy.personal.military, value: copy.military[cv.military] });
  }

  const languages = vis.languages
    ? cv.languages.map((item) => {
        const label = languageDisplayName(item.name, editCopy);
        const level = item.level
          ? (editCopy.languageLevels[item.level] ?? CV_LANGUAGE_LEVEL_LABELS[item.level])
          : "";
        return level ? `${label} — ${level}` : label;
      })
    : [];

  const sections: CvSectionModel[] = [];
  if (vis.experience && experience.length > 0) {
    sections.push({
      key: "experience",
      title: copy.sections.experience,
      entries: experience.map((it) => {
        const typeLabel = it.employmentType
          ? (editCopy.employment[it.employmentType as ExperienceEmploymentType] ??
            EXPERIENCE_EMPLOYMENT_LABELS[it.employmentType as ExperienceEmploymentType])
          : null;
        return {
          title: it.title,
          period: formatExperiencePeriod(it, copy.present, lang) || it.period || undefined,
          lines: distinctLines(it.title, [[it.company, typeLabel].filter(Boolean).join(" · ")]),
          bullets: experienceBullets(it),
        };
      }),
    });
  }
  if (vis.projects) {
    const byId = new Map(projects.map((p) => [p.id, p]));
    const picked = cv.featuredProjectIds.map((id) => byId.get(id)).filter((p): p is CvProjectInput => !!p);
    const chosen = picked.length
      ? picked
      : [...projects]
          .sort((a, b) => (b.views ?? 0) - (a.views ?? 0))
          .slice(0, CV_TOP_PROJECTS_FALLBACK);
    if (chosen.length) {
      sections.push({
        key: "projects",
        title: copy.sections.projects,
        entries: chosen.map((p) => {
          const href = `${siteOrigin}/project/${p.id}`;
          return { title: p.title, lines: [hrefLabel(href)], bullets: [], href };
        }),
      });
    }
  }
  if (vis.education && cv.education.length > 0) {
    sections.push({
      key: "education",
      title: copy.sections.education,
      entries: cv.education.map((it) => {
        const { lead, tail } = educationDetailLines(it, editCopy.degreeLabels);
        return {
          title: it.school,
          period: formatEducationPeriod(it, copy.present, lang) || it.period || undefined,
          lines: distinctLines(it.school, [lead, tail]),
          bullets: [],
        };
      }),
    });
  }
  if (vis.certification && cv.certifications.length > 0) {
    sections.push({
      key: "certification",
      title: copy.sections.certification,
      entries: cv.certifications.map((it) => ({
        title: it.title,
        period: it.year || undefined,
        lines: distinctLines(it.title, [it.issuer]),
        bullets: [],
      })),
    });
  }
  if (vis.awards && cv.awards.length > 0) {
    sections.push({
      key: "awards",
      title: copy.sections.awards,
      entries: cv.awards.map((it) => ({
        title: it.award,
        period: it.year || undefined,
        lines: distinctLines(it.award, [it.event]),
        bullets: [],
      })),
    });
  }
  if (vis.references && cv.references.length > 0) {
    sections.push({
      key: "references",
      title: copy.sections.references,
      entries: cv.references.map((it) => ({
        title: it.name,
        lines: distinctLines(it.name, [it.role, it.contact]),
        bullets: [],
      })),
    });
  }

  return {
    template: cv.template,
    headingFont: cv.headingFont,
    lang,
    labels: copy,
    name,
    desiredRole,
    bio,
    portraitUrl: showPhoto ? cvPortraitUrl(profile.cv_photo_url, profile.avatar_url) || null : null,
    showPhoto,
    contacts,
    personal,
    qrTarget: profileLink ?? portfolio,
    place,
    languages,
    craftSkills,
    software,
    sections,
  };
}
