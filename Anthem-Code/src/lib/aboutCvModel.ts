import type { ExperienceItem, SocialLinkItem } from "@/lib/validators";
import {
  EXPERIENCE_EMPLOYMENT_LABELS,
  formatExperiencePeriod,
  type ExperienceEmploymentType,
} from "@/lib/validators";
import { displayProfileAddress } from "@/lib/profileAddress";
import { safeHttpUrl } from "@/lib/safeUrl";
import { socialDisplayId } from "@/lib/externalUrl";
import {
  cvAboutText,
  cvPhotoVisible,
  cvPortraitUrl,
  CV_LANGUAGE_LEVEL_LABELS,
  educationDetailLines,
  experienceBullets,
  formatEducationPeriod,
  parseProfileCv,
  partitionSkillsAndSoftware,
  type CvLayout,
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

export type AboutCvModelInput = {
  profile: AboutCvProfile;
  experience: ExperienceItem[];
  skills: string[];
  socialLinks?: SocialLinkItem[];
  profileUrl?: string | null;
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
};

export type CvSectionKey = "experience" | "education" | "certification" | "awards";

export type CvSectionModel = { key: CvSectionKey; entries: CvEntryModel[] };

export type AboutCvModel = {
  layout: CvLayout;
  name: string;
  desiredRole: string;
  bio: string;
  /** Portrait to draw, already gated by the photo switch; null when hidden. */
  portraitUrl: string | null;
  showPhoto: boolean;
  contacts: CvContactItem[];
  qrTarget: string | undefined;
  place: string;
  languages: string[];
  craftSkills: string[];
  software: string[];
  sections: CvSectionModel[];
};

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
  forceShowApplicationContact = false,
}: AboutCvModelInput): AboutCvModel {
  const cv = parseProfileCv(profile.cv);
  const vis = cv.visibility;
  const showPhoto = cvPhotoVisible(cv);
  const name = cv.fullName.trim();
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
  if (profileLink)
    contacts.push({ key: "profile", kind: "profile", label: "SAMECOR", value: hrefLabel(profileLink), href: profileLink });
  if (portfolio && portfolio !== profileLink)
    contacts.push({ key: "portfolio", kind: "portfolio", label: "Portfolio", value: hrefLabel(portfolio), href: portfolio });
  if (contactEmail)
    contacts.push({ key: "email", kind: "email", label: "Email", value: contactEmail, href: `mailto:${contactEmail}` });
  if (contactPhone)
    contacts.push({ key: "phone", kind: "phone", label: "Phone", value: contactPhone });
  if (lineId) contacts.push({ key: "line", kind: "line", label: "LINE", value: lineId });
  if (website && website !== portfolio && website !== profileLink)
    contacts.push({ key: "website", kind: "website", label: "Website", value: hrefLabel(website), href: website });
  if (instagramHandle)
    contacts.push({
      key: "instagram",
      kind: "instagram",
      label: "Instagram",
      value: socialDisplayId(instagramHandle),
      href: `https://instagram.com/${instagramHandle}`,
    });
  if (facebookHref)
    contacts.push({
      key: "facebook",
      kind: "facebook",
      label: "Facebook",
      value: socialDisplayId(facebookHref),
      href: facebookHref,
    });
  for (const item of extraSocials)
    contacts.push({
      key: item.href,
      kind: "social",
      label: item.title,
      value: socialDisplayId(item.href),
      href: item.href,
    });

  const languages = vis.languages
    ? cv.languages.map((item) =>
        item.level ? `${item.name} — ${CV_LANGUAGE_LEVEL_LABELS[item.level]}` : item.name,
      )
    : [];

  const sections: CvSectionModel[] = [];
  if (vis.experience && experience.length > 0) {
    sections.push({
      key: "experience",
      entries: experience.map((it) => {
        const typeLabel = it.employmentType
          ? EXPERIENCE_EMPLOYMENT_LABELS[it.employmentType as ExperienceEmploymentType]
          : null;
        return {
          title: it.title,
          period: formatExperiencePeriod(it) || it.period || undefined,
          lines: distinctLines(it.title, [[it.company, typeLabel].filter(Boolean).join(" · ")]),
          bullets: experienceBullets(it),
        };
      }),
    });
  }
  if (vis.education && cv.education.length > 0) {
    sections.push({
      key: "education",
      entries: cv.education.map((it) => {
        const { lead, tail } = educationDetailLines(it);
        return {
          title: it.school,
          period: formatEducationPeriod(it) || it.period || undefined,
          lines: distinctLines(it.school, [lead, tail]),
          bullets: [],
        };
      }),
    });
  }
  if (vis.certification && cv.certifications.length > 0) {
    sections.push({
      key: "certification",
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
      entries: cv.awards.map((it) => ({
        title: it.award,
        period: it.year || undefined,
        lines: distinctLines(it.award, [it.event]),
        bullets: [],
      })),
    });
  }

  return {
    layout: cv.layout,
    name,
    desiredRole,
    bio,
    portraitUrl: showPhoto ? cvPortraitUrl(profile.cv_photo_url, profile.avatar_url) || null : null,
    showPhoto,
    contacts,
    qrTarget: profileLink ?? portfolio,
    place,
    languages,
    craftSkills,
    software,
    sections,
  };
}
