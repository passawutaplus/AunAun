import type { ReactNode } from "react";
import {
  Award,
  BadgeCheck,
  Briefcase,
  Eye,
  Facebook,
  Globe,
  GraduationCap,
  Instagram,
  Languages,
  Link2,
  Mail,
  MapPin,
  Monitor,
  Pencil,
  Phone,
  Printer,
  Sparkles,
  User,
} from "lucide-react";
import ExperienceTimeline from "@/components/profile/ExperienceTimeline";
import ProfileSkillChips from "@/components/profile/ProfileSkillChips";
import ToolIcon from "@/components/ToolIcon";
import LineMarkIcon from "@/components/icons/LineMarkIcon";
import type { ExperienceItem, SocialLinkItem } from "@/lib/validators";
import { displayProfileAddress } from "@/lib/profileAddress";
import { safeHttpUrl } from "@/lib/safeUrl";
import { socialDisplayId } from "@/lib/externalUrl";
import { displayInitials } from "@/lib/avatarPool";
import { cn } from "@/lib/utils";
import {
  cvPortraitUrl,
  CV_LANGUAGE_LEVEL_LABELS,
  educationDetailLines,
  formatEducationPeriod,
  cvAboutText,
  parseProfileCv,
  partitionSkillsAndSoftware,
  type EducationItem,
} from "@/lib/profileCv";

type ProfileAbout = {
  display_name?: string | null;
  username?: string | null;
  avatar_url?: string | null;
  cv_photo_url?: string | null;
  cv?: unknown;
  role: string | null;
  location: string | null;
  profile_address?: unknown;
  bio: string | null;
  email: string | null;
  website: string | null;
  line_id: string | null;
  facebook: string | null;
  instagram: string | null;
};

type Props = {
  profile: ProfileAbout;
  experience: ExperienceItem[];
  skills: string[];
  socialLinks?: SocialLinkItem[];
  /** owner = แสดงช่องว่างเป็น hint · public = ซ่อนหมวดที่ว่าง */
  mode?: "owner" | "public";
  profileUrl?: string | null;
  onEdit?: () => void;
  onPreview?: () => void;
  onPrint?: () => void;
  /** When false, the page renders the toolbar outside the section card. */
  showToolbar?: boolean;
};

function PeriodEntry({
  period,
  title,
  subtitle,
  extra,
}: {
  period: string;
  title: string;
  subtitle?: string;
  extra?: string;
}) {
  return (
    <li className="grid grid-cols-[5.25rem_minmax(0,1fr)] gap-3 sm:grid-cols-[6.75rem_minmax(0,1fr)]">
      <p className="pt-0.5 text-[11px] sm:text-xs leading-snug text-muted-foreground tabular-nums">
        {period || "—"}
      </p>
      <div className="min-w-0 border-l border-primary/35 pl-4">
        <h4 className="font-semibold text-foreground leading-snug">{title}</h4>
        {subtitle ? (
          <p className="mt-0.5 pr-1 text-xs italic leading-snug break-words text-muted-foreground">{subtitle}</p>
        ) : null}
        {extra ? (
          <p className="mt-0.5 pr-1 text-xs italic leading-snug break-words text-muted-foreground">{extra}</p>
        ) : null}
      </div>
    </li>
  );
}

function EducationList({ items }: { items: EducationItem[] }) {
  return (
    <ol className="space-y-6">
      {items.map((it, i) => {
        const { lead, tail } = educationDetailLines(it);
        return (
          <PeriodEntry
            key={`${it.school}-${i}`}
            period={formatEducationPeriod(it) || it.period}
            title={it.school}
            subtitle={lead}
            extra={tail}
          />
        );
      })}
    </ol>
  );
}

function hrefLabel(url: string) {
  return url.replace(/^https?:\/\//i, "").replace(/\/$/, "");
}

/**
 * About as a live CV — sidebar scan fields + experience column.
 */
export function ProfileAboutReadOnly({
  profile,
  experience,
  skills,
  socialLinks = [],
  mode = "owner",
  onEdit,
  onPreview,
  onPrint,
  showToolbar = true,
}: Props) {
  const hideEmpty = mode === "public";
  const cv = parseProfileCv(profile.cv);
  const { craftSkills, software } = partitionSkillsAndSoftware(skills, cv.tools);
  const addressLine = displayProfileAddress(profile.profile_address, profile.location, "short");
  const fullName = cv.fullName.trim();
  const desiredRole = cv.desiredRole.trim();
  const showAppContact = mode !== "public" || cv.contactPublic;
  const contactEmail = showAppContact ? cv.contactEmail.trim() : "";
  const contactLine = showAppContact ? cv.contactLine.trim() || profile.line_id?.trim() || "" : "";
  const contactPhone = showAppContact ? cv.contactPhone.trim() : "";
  const bio = cvAboutText(cv, profile.bio);
  const websiteHref = safeHttpUrl(profile.website);
  const hasWebsite = !!websiteHref;
  const instagramHandle = (profile.instagram?.trim() ?? "")
    .replace(/^https?:\/\/(www\.)?instagram\.com\//i, "")
    .replace(/^@/, "")
    .replace(/\/.*$/, "");
  const facebookHref = profile.facebook?.trim()
    ? safeHttpUrl(profile.facebook) ??
      (/^[a-zA-Z0-9.\-_]+$/.test(profile.facebook.trim())
        ? `https://facebook.com/${encodeURIComponent(profile.facebook.trim())}`
        : undefined)
    : undefined;
  const hasLegacyContact = !!(facebookHref || instagramHandle);
  const hasSocial = socialLinks.length > 0;
  const portfolioHref = safeHttpUrl(cv.portfolioUrl);
  const hasContactBlock =
    hasWebsite || hasLegacyContact || hasSocial || !!portfolioHref || !!contactEmail || !!contactLine || !!contactPhone;
  const portrait = cvPortraitUrl(profile.cv_photo_url, profile.avatar_url);
  const initials = displayInitials(fullName || profile.username || profile.display_name, 2);
  const locationBits = [addressLine].filter(Boolean);

  const showPortrait = !!portrait || !hideEmpty;
  const showBio = !!bio || !hideEmpty;
  const showIdentity = !!fullName || !!desiredRole || !hideEmpty;
  const showSkills = craftSkills.length > 0 || !hideEmpty;
  const showSoftware = software.length > 0 || !hideEmpty;
  const showEducation = cv.education.length > 0 || !hideEmpty;
  const showCertifications = cv.certifications.length > 0 || !hideEmpty;
  const showAwards = cv.awards.length > 0 || !hideEmpty;
  const showLanguages = cv.languages.length > 0 || !hideEmpty;
  const showExperience = experience.length > 0 || !hideEmpty;
  const showLocation = locationBits.length > 0 || !hideEmpty;
  const showContact = hasContactBlock || !hideEmpty;

  const empty =
    hideEmpty &&
    !showBio &&
    !fullName &&
    !desiredRole &&
    !showSkills &&
    !showSoftware &&
    !showExperience &&
    !showEducation &&
    !showCertifications &&
    !showAwards &&
    !showContact &&
    !portrait;

  if (empty) {
    return <EmptyHint text="No About Me yet" />;
  }

  const showScanFields = showLocation || showLanguages || showSkills || showSoftware;

  const sidebar = (
    <div className="flex h-full min-h-0 flex-col">
      {showPortrait || showIdentity ? (
        <div className={cn("flex flex-col items-start gap-3", showScanFields && "pb-5")}>
          {showPortrait ? (
            <div className="h-40 w-40 overflow-hidden rounded-2xl bg-secondary ring-1 ring-border/80 sm:h-44 sm:w-44">
              {portrait ? (
                <img loading="lazy" decoding="async"
                  src={portrait}
                  alt={fullName ? `About Me photo of ${fullName}` : "About Me photo"}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-brand text-white text-3xl font-semibold">
                  {initials}
                </div>
              )}
            </div>
          ) : null}
          {showIdentity ? (
            <div className="min-w-0 space-y-1">
              {fullName ? (
                <p className="text-2xl sm:text-3xl font-bold text-foreground leading-tight tracking-tight">
                  {fullName}
                </p>
              ) : (
                <EmptyHint text="Add first and last name" />
              )}
              {desiredRole ? (
                <p className="text-sm font-light text-muted-foreground leading-snug">{desiredRole}</p>
              ) : !hideEmpty ? (
                <EmptyHint text="Add a desired position" />
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {showScanFields ? (
        <div className="mt-5 divide-y divide-border/80 lg:mt-auto">
          {showLocation ? (
            <div className="py-5 first:pt-0 last:pb-0">
              <SideBlock icon={MapPin} title="Location">
                {locationBits.length ? (
                  <p className="text-sm text-foreground leading-relaxed">{locationBits.join(" · ")}</p>
                ) : (
                  <EmptyHint text="Add a city" />
                )}
              </SideBlock>
            </div>
          ) : null}

          {showLanguages ? (
            <div className="py-5 first:pt-0 last:pb-0">
              <SideBlock icon={Languages} title="Languages">
                {cv.languages.length ? (
                  <ul className="space-y-1.5">
                    {cv.languages.map((item) => (
                      <li key={item.name} className="text-sm text-foreground">
                        {item.name}
                        {item.level ? (
                          <span className="text-muted-foreground">
                            {" "}
                            — {CV_LANGUAGE_LEVEL_LABELS[item.level]}
                          </span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <EmptyHint text="Add languages" />
                )}
              </SideBlock>
            </div>
          ) : null}

          {showSkills ? (
            <div className="py-5 first:pt-0 last:pb-0">
              <SideBlock icon={Sparkles} title="Skills">
                {craftSkills.length ? (
                  <ProfileSkillChips skills={craftSkills.slice(0, 12)} />
                ) : (
                  <EmptyHint text="Add skills" />
                )}
              </SideBlock>
            </div>
          ) : null}

          {showSoftware ? (
            <div className="py-5 first:pt-0 last:pb-0">
              <SideBlock icon={Monitor} title="Design Software">
                {software.length ? (
                  <div className="flex flex-wrap gap-1.5">
                    {software.map((tool) => (
                      <span
                        key={tool}
                        title={tool}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-secondary/80 px-2 py-1 text-xs text-foreground ring-1 ring-border/50"
                      >
                        <ToolIcon name={tool} size="sm" />
                        {tool}
                      </span>
                    ))}
                  </div>
                ) : (
                  <EmptyHint text="Add design software" />
                )}
              </SideBlock>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );

  const main = (
    <div className="flex min-h-0 min-w-0 flex-col lg:h-full">
      <div className="space-y-8 min-w-0 lg:mt-auto">
      {showBio ? (
        <div>
          <MainHeading icon={User} title="About me" />
          {bio ? (
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{bio}</p>
          ) : (
            <EmptyHint text="Write a short intro — what you do and who you work with" />
          )}
        </div>
      ) : null}

      {showEducation ? (
        <div className={showBio ? "border-t border-border/80 pt-8" : undefined}>
          <MainHeading icon={GraduationCap} title="Education" />
          {cv.education.length ? (
            <EducationList items={cv.education} />
          ) : (
            <EmptyHint text="Add education" />
          )}
        </div>
      ) : null}

      {showExperience ? (
        <div className={showBio || showEducation ? "border-t border-border/80 pt-8" : undefined}>
          <MainHeading
            icon={Briefcase}
            title="Experience"
            count={experience.length > 0 ? experience.length : undefined}
          />
          {experience.length ? (
            <ExperienceTimeline items={experience} />
          ) : (
            <EmptyHint text="Add work experience" />
          )}
        </div>
      ) : null}

      {showCertifications ? (
        <div
          className={
            showBio || showEducation || showExperience ? "border-t border-border/80 pt-8" : undefined
          }
        >
          <MainHeading icon={BadgeCheck} title="Certification" />
          {cv.certifications.length ? (
            <ol className="space-y-6">
              {cv.certifications.map((it, i) => (
                <PeriodEntry
                  key={`${it.title}-${i}`}
                  period={it.year}
                  title={it.title}
                  subtitle={it.issuer}
                />
              ))}
            </ol>
          ) : (
            <EmptyHint text="Add certifications" />
          )}
        </div>
      ) : null}

      {showAwards ? (
        <div
          className={
            showBio || showEducation || showExperience || showCertifications
              ? "border-t border-border/80 pt-8"
              : undefined
          }
        >
          <MainHeading icon={Award} title="Awards" />
          {cv.awards.length ? (
            <ol className="space-y-6">
              {cv.awards.map((it, i) => (
                <PeriodEntry
                  key={`${it.event}-${i}`}
                  period={it.year}
                  title={it.award}
                  subtitle={it.event}
                />
              ))}
            </ol>
          ) : (
            <EmptyHint text="Add awards" />
          )}
        </div>
      ) : null}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {showToolbar ? (
        <ProfileAboutToolbar onPreview={onPreview} onPrint={onPrint} onEdit={onEdit} />
      ) : null}

      <div className="grid items-stretch gap-8 lg:grid-cols-2 lg:gap-10">
        {sidebar}
        {main}
      </div>

      {showContact ? (
        <section className="border-t border-border/80 pt-6">
          <h3 className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-foreground">
            <Link2 className="w-3.5 h-3.5 text-primary shrink-0" aria-hidden />
            Contact
          </h3>
          {hasContactBlock ? (
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-4">
                {contactEmail || !hideEmpty ? (
                  <ContactField icon={Mail} label="Email">
                    {contactEmail ? (
                      <span className="break-all">{contactEmail}</span>
                    ) : (
                      <EmptyHint text="Add email" />
                    )}
                  </ContactField>
                ) : null}
                {contactLine || !hideEmpty ? (
                  <ContactField icon={LineMarkIcon} label="LINE">
                    {contactLine ? (
                      <span className="break-all">{contactLine}</span>
                    ) : (
                      <EmptyHint text="Add LINE" />
                    )}
                  </ContactField>
                ) : null}
                {contactPhone || !hideEmpty ? (
                  <ContactField icon={Phone} label="Phone">
                    {contactPhone ? (
                      <span className="tabular-nums">{contactPhone}</span>
                    ) : (
                      <EmptyHint text="Add phone" />
                    )}
                  </ContactField>
                ) : null}
                {portfolioHref || !hideEmpty ? (
                  <ContactField icon={Briefcase} label="Portfolio">
                    {portfolioHref ? (
                      <a
                        href={portfolioHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline break-all"
                      >
                        {hrefLabel(portfolioHref)}
                      </a>
                    ) : (
                      <EmptyHint text="Add a portfolio link" />
                    )}
                  </ContactField>
                ) : null}
              </div>
              {hasWebsite || hasLegacyContact || hasSocial ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-4">
                  {instagramHandle ? (
                    <ContactField icon={Instagram} label="Instagram">
                      <a
                        href={`https://instagram.com/${encodeURIComponent(instagramHandle)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline break-all"
                      >
                        {socialDisplayId(instagramHandle)}
                      </a>
                    </ContactField>
                  ) : null}
                  {facebookHref ? (
                    <ContactField icon={Facebook} label="Facebook">
                      <a
                        href={facebookHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline break-all"
                      >
                        {socialDisplayId(facebookHref)}
                      </a>
                    </ContactField>
                  ) : null}
                  {websiteHref && websiteHref !== portfolioHref ? (
                    <ContactField icon={Globe} label="Website">
                      <a
                        href={websiteHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline break-all"
                      >
                        {hrefLabel(websiteHref)}
                      </a>
                    </ContactField>
                  ) : null}
                  {socialLinks.map((link) => {
                    const href = safeHttpUrl(link.url);
                    if (!href || !link.title.trim()) return null;
                    return (
                      <ContactField key={link.id} icon={Link2} label={link.title.trim()}>
                        <a
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline break-all"
                        >
                          {socialDisplayId(href)}
                        </a>
                      </ContactField>
                    );
                  })}
                </div>
              ) : null}
            </div>
          ) : (
            <EmptyHint text="Add contact links" />
          )}
        </section>
      ) : null}
    </div>
  );
}

export function ProfileAboutToolbar({
  title = "About Me",
  onPreview,
  onPrint,
  onEdit,
}: {
  title?: string;
  onPreview?: () => void;
  onPrint?: () => void;
  onEdit?: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="text-sm font-semibold text-foreground min-w-0">{title}</h2>
      <div className="flex items-center gap-1 shrink-0">
        {onPreview ? (
          <button
            type="button"
            onClick={onPreview}
            className="inline-flex h-8 items-center gap-1 rounded-full px-2.5 text-xs text-foreground hover:bg-black/5"
          >
            <Eye className="h-3.5 w-3.5" />
            Preview
          </button>
        ) : null}
        {onPrint ? (
          <button
            type="button"
            onClick={onPrint}
            className="inline-flex h-8 items-center gap-1 rounded-full px-2.5 text-xs text-foreground hover:bg-black/5"
          >
            <Printer className="h-3.5 w-3.5" />
            Print
          </button>
        ) : null}
        {onEdit ? (
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex h-8 items-center gap-1 rounded-full px-2.5 text-xs text-foreground hover:bg-black/5"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </button>
        ) : null}
      </div>
    </div>
  );
}

const MainHeading = ({
  icon: Icon,
  title,
  count,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  count?: number;
}) => (
  <h3 className="mb-4 flex items-center gap-2 text-sm font-medium text-foreground">
    <Icon className="h-3.5 w-3.5 text-primary shrink-0" aria-hidden />
    {title}
    {count != null ? (
      <span className="text-muted-foreground font-normal text-xs">({count})</span>
    ) : null}
  </h3>
);

const ContactField = ({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: ReactNode;
}) => (
  <p className="text-sm leading-snug min-w-0">
    <span className="mb-0.5 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <Icon className="h-3.5 w-3.5 text-primary shrink-0" aria-hidden />
      {label}
    </span>
    <br />
    {children}
  </p>
);

const SideBlock = ({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: ReactNode;
}) => (
  <section>
    <h3 className="mb-2.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-foreground">
      <Icon className="w-3.5 h-3.5 text-primary shrink-0" aria-hidden />
      {title}
    </h3>
    {children}
  </section>
);

const EmptyHint = ({ text }: { text: string }) => (
  <p className="text-xs font-light text-muted-foreground/70">{text}</p>
);

export default ProfileAboutReadOnly;
