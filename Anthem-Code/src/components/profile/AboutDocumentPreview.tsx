import { useState } from "react";
import {
  Award,
  BadgeCheck,
  Briefcase,
  Download,
  Facebook,
  GraduationCap,
  Instagram,
  Languages,
  Link2,
  Mail,
  MapPin,
  Monitor,
  Phone,
  Printer,
  Sparkles,
} from "lucide-react";
import LineMarkIcon from "@/components/icons/LineMarkIcon";
import { toast } from "sonner";
import { aboutCvPdfFilename, downloadAboutCvPdf } from "@/lib/aboutCvPdf";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import ToolIcon from "@/components/ToolIcon";
import type { ExperienceItem, SocialLinkItem } from "@/lib/validators";
import {
  EXPERIENCE_EMPLOYMENT_LABELS,
  formatExperiencePeriod,
  type ExperienceEmploymentType,
} from "@/lib/validators";
import { displayProfileAddress } from "@/lib/profileAddress";
import { displayInitials } from "@/lib/avatarPool";
import { safeHttpUrl } from "@/lib/safeUrl";
import {
  cvPortraitUrl,
  CV_LANGUAGE_LEVEL_LABELS,
  educationDetailLine,
  experienceBullets,
  formatEducationPeriod,
  parseProfileCv,
  partitionSkillsAndSoftware,
} from "@/lib/profileCv";
import {
  ABOUT_CV_THEMES,
  type AboutCvTheme,
  readAboutCvTheme,
  writeAboutCvTheme,
} from "@/lib/aboutCvTheme";
import { cn } from "@/lib/utils";

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
  website: string | null;
  line_id: string | null;
  facebook?: string | null;
  instagram?: string | null;
};

type DocProps = {
  profile: ProfileAbout;
  experience: ExperienceItem[];
  skills: string[];
  socialLinks?: SocialLinkItem[];
  profileUrl?: string | null;
  theme?: AboutCvTheme;
  /** Owner print/PDF — always include application email/LINE/phone. */
  forceShowApplicationContact?: boolean;
};

function hrefLabel(url: string) {
  return url.replace(/^https?:\/\//i, "").replace(/\/$/, "");
}

export function AboutDocumentSheet({
  profile,
  experience,
  skills,
  socialLinks = [],
  theme = "orange",
  forceShowApplicationContact = false,
}: DocProps) {
  const cv = parseProfileCv(profile.cv);
  const portrait = cvPortraitUrl(profile.cv_photo_url, profile.avatar_url);
  const name = cv.fullName.trim();
  const desiredRole = cv.desiredRole.trim();
  const showAppContact = forceShowApplicationContact || cv.contactPublic;
  const contactEmail = showAppContact ? cv.contactEmail.trim() : "";
  const contactPhone = showAppContact ? cv.contactPhone.trim() : "";
  const initials = displayInitials(name || profile.username || profile.display_name, 2);
  const bio = profile.bio?.trim() || "";
  const place = displayProfileAddress(profile.profile_address, profile.location, "short");
  const website = safeHttpUrl(profile.website);
  const lineId = showAppContact ? cv.contactLine.trim() || profile.line_id?.trim() || "" : "";
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
  const extraSocials = socialLinks
    .map((l) => {
      const href = safeHttpUrl(l.url);
      if (!href || !l.title.trim()) return null;
      return { title: l.title.trim(), href };
    })
    .filter((x): x is { title: string; href: string } => !!x);
  const portfolio = safeHttpUrl(cv.portfolioUrl);
  const { craftSkills, software } = partitionSkillsAndSoftware(skills, cv.tools);
  const hasSocialRow = !!(instagramHandle || facebookHref || (website && website !== portfolio) || extraSocials.length);
  const hasContact = !!(
    website ||
    lineId ||
    hasSocialRow ||
    portfolio ||
    contactEmail ||
    contactPhone
  );

  const sideBlocks = [
    place ? (
      <DocBlock key="location" icon={MapPin} title="Location">
        <p className="about-cv-copy">{place}</p>
      </DocBlock>
    ) : null,
    cv.languages.length > 0 ? (
      <DocBlock key="languages" icon={Languages} title="Languages">
        <ul className="space-y-1">
          {cv.languages.map((item) => (
            <li key={item.name} className="about-cv-copy">
              {item.name}
              {item.level ? ` — ${CV_LANGUAGE_LEVEL_LABELS[item.level]}` : ""}
            </li>
          ))}
        </ul>
      </DocBlock>
    ) : null,
    craftSkills.length > 0 ? (
      <DocBlock key="skills" icon={Sparkles} title="Skills">
        <ul className="space-y-1">
          {craftSkills.map((s) => (
            <li key={s} className="about-cv-copy">
              {s}
            </li>
          ))}
        </ul>
      </DocBlock>
    ) : null,
    software.length > 0 ? (
      <DocBlock key="software" icon={Monitor} title="Design Software">
        <ul className="space-y-1.5">
          {software.map((s) => (
            <li key={s} className="flex items-center gap-2 min-w-0">
              <ToolIcon name={s} size="sm" className="shrink-0" />
              <span className="about-cv-copy truncate">{s}</span>
            </li>
          ))}
        </ul>
      </DocBlock>
    ) : null,
  ].filter(Boolean);

  const mainBlocks = [
    bio ? (
      <div key="about">
        <p className="about-cv-copy whitespace-pre-wrap">{bio}</p>
      </div>
    ) : null,
    cv.education.length > 0 ? (
      <div key="education">
        <PrintHeading icon={GraduationCap} title="Education" />
        <ol className="space-y-3">
          {cv.education.map((it, i) => (
            <PrintPeriodRow
              key={`${it.school}-${i}`}
              period={formatEducationPeriod(it) || it.period}
              title={it.school}
              subtitle={educationDetailLine(it)}
            />
          ))}
        </ol>
      </div>
    ) : null,
    experience.length > 0 ? (
      <div key="experience">
        <PrintHeading icon={Briefcase} title="Experience" />
        <ol className="space-y-3.5">
          {experience.map((it, i) => {
            const period = formatExperiencePeriod(it) || it.period;
            const typeLabel = it.employmentType
              ? EXPERIENCE_EMPLOYMENT_LABELS[it.employmentType as ExperienceEmploymentType]
              : null;
            const bullets = experienceBullets(it);
            return (
              <li key={`${it.title}-${i}`} className="grid grid-cols-[minmax(4.4rem,22%)_minmax(0,1fr)] gap-2.5">
                <p className="pt-0.5 text-[0.62rem] tabular-nums leading-snug text-[var(--cv-muted)]">
                  {period || "—"}
                </p>
                <div className="min-w-0 border-l-2 border-[var(--cv-accent)] pl-2.5">
                  <p className="text-[0.8rem] font-bold leading-snug">{it.title}</p>
                  {it.company ? (
                    <p className="mt-0.5 text-[0.72rem] italic text-[var(--cv-muted)]">{it.company}</p>
                  ) : null}
                  {typeLabel ? (
                    <p className="mt-0.5 text-[0.62rem] text-[var(--cv-muted)]">{typeLabel}</p>
                  ) : null}
                  {bullets.length ? (
                    <ul className="mt-1.5 space-y-1">
                      {bullets.map((b) => (
                        <li key={b} className="flex gap-2 about-cv-copy leading-relaxed">
                          <span className="mt-[0.4em] h-1 w-1 shrink-0 rounded-full bg-[var(--cv-accent)]" />
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    ) : null,
    cv.certifications.length > 0 ? (
      <div key="certs">
        <PrintHeading icon={BadgeCheck} title="Certification" />
        <ol className="space-y-3">
          {cv.certifications.map((it, i) => (
            <PrintPeriodRow
              key={`${it.title}-${i}`}
              period={it.year}
              title={it.title}
              subtitle={it.issuer}
            />
          ))}
        </ol>
      </div>
    ) : null,
    cv.awards.length > 0 ? (
      <div key="awards">
        <PrintHeading icon={Award} title="Awards" />
        <ol className="space-y-3">
          {cv.awards.map((it, i) => (
            <PrintPeriodRow
              key={`${it.event}-${i}`}
              period={it.year}
              title={it.award}
              subtitle={it.event}
            />
          ))}
        </ol>
      </div>
    ) : null,
  ].filter(Boolean);

  return (
    <div className="about-cv-sheet" data-cv-theme={theme}>
      <aside className="about-cv-sheet-side min-h-0 overflow-y-auto p-[clamp(0.65rem,2%,1rem)]">
        <div className={cn("flex flex-col items-start gap-2", sideBlocks.length > 0 && "pb-2.5")}>
          <div className="w-[min(100%,5.4rem)] overflow-hidden rounded-xl aspect-square bg-[var(--cv-photo)]">
            {portrait ? (
              <img src={portrait} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-lg font-semibold text-[var(--cv-muted)]">
                {initials}
              </div>
            )}
          </div>
          {name ? (
            <p className="text-[clamp(0.95rem,3.6cqi,1.2rem)] font-bold leading-[1.15] tracking-tight">
              {name}
            </p>
          ) : null}
          {desiredRole ? (
            <p className="text-[clamp(0.62rem,2.2cqi,0.75rem)] font-light leading-snug text-[var(--cv-muted)]">
              {desiredRole}
            </p>
          ) : null}
        </div>
        {sideBlocks.length > 0 ? (
          <div className="mt-auto divide-y divide-[var(--cv-rule)] border-t border-[var(--cv-rule)]">
            {sideBlocks.map((block, i) => (
              <div key={i} className="py-2.5">
                {block}
              </div>
            ))}
          </div>
        ) : null}
      </aside>

      <div className="about-cv-sheet-main min-h-0 overflow-y-auto p-[clamp(0.75rem,3%,1.45rem)]">
        <div className="divide-y divide-[var(--cv-rule)]">
          {mainBlocks.map((block, i) => (
            <div key={i} className={i === 0 ? "pb-3.5" : "py-3.5"}>
              {block}
            </div>
          ))}
        </div>
      </div>

      {hasContact ? (
        <div className="about-cv-sheet-contact px-[clamp(0.75rem,3%,1.45rem)] py-[clamp(0.5rem,1.6%,0.8rem)]">
          <PrintHeading icon={Link2} title="Contact" />
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {contactEmail ? (
              <PrintContactItem icon={Mail} label="Email">
                {contactEmail}
              </PrintContactItem>
            ) : null}
            {lineId ? (
              <PrintContactItem icon={LineMarkIcon} label="LINE">
                {lineId}
              </PrintContactItem>
            ) : null}
            {contactPhone ? (
              <PrintContactItem icon={Phone} label="Phone">
                {contactPhone}
              </PrintContactItem>
            ) : null}
            {portfolio ? (
              <PrintContactItem icon={Briefcase} label="Portfolio">
                <a
                  href={portfolio}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline decoration-[var(--cv-accent)]/35 underline-offset-2"
                >
                  {hrefLabel(portfolio)}
                </a>
              </PrintContactItem>
            ) : null}
          </div>
          {hasSocialRow ? (
            <div className="mt-1.5 flex flex-wrap gap-x-6 gap-y-1">
              {instagramHandle ? (
                <PrintContactItem icon={Instagram} label="Instagram">
                  instagram.com/{instagramHandle}
                </PrintContactItem>
              ) : null}
              {facebookHref ? (
                <PrintContactItem icon={Facebook} label="Facebook">
                  {hrefLabel(facebookHref)}
                </PrintContactItem>
              ) : null}
              {website && website !== portfolio ? (
                <PrintContactItem icon={Link2} label="Website">
                  {hrefLabel(website)}
                </PrintContactItem>
              ) : null}
              {extraSocials.map((item) => (
                <PrintContactItem key={item.href} icon={Link2} label={item.title}>
                  {hrefLabel(item.href)}
                </PrintContactItem>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function PrintPeriodRow({
  period,
  title,
  subtitle,
}: {
  period?: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <li className="grid grid-cols-[minmax(4.4rem,22%)_minmax(0,1fr)] gap-2.5">
      <p className="pt-0.5 text-[0.62rem] tabular-nums leading-snug text-[var(--cv-muted)]">{period || "—"}</p>
      <div className="min-w-0 border-l-2 border-[var(--cv-accent)] pl-2.5">
        <p className="text-[0.8rem] font-bold leading-snug">{title}</p>
        {subtitle ? <p className="mt-0.5 text-[0.72rem] italic text-[var(--cv-muted)]">{subtitle}</p> : null}
      </div>
    </li>
  );
}

function PrintContactItem({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <p className="about-cv-copy min-w-0">
      <span className="mb-0.5 flex items-center gap-1 text-[0.58rem] font-bold uppercase tracking-[0.12em]">
        <Icon className="h-2.5 w-2.5 shrink-0 text-[var(--cv-accent)]" aria-hidden />
        {label}
      </span>
      <span className="break-all">{children}</span>
    </p>
  );
}

function PrintHeading({
  icon: Icon,
  title,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
}) {
  return (
    <p className="mb-2.5 flex items-center gap-1.5 text-[0.62rem] font-bold uppercase tracking-[0.14em]">
      <Icon className="h-3 w-3 shrink-0 text-[var(--cv-accent)]" aria-hidden />
      {title}
    </p>
  );
}

function DocBlock({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <p className="mb-1.5 flex items-center gap-1.5 text-[0.62rem] font-bold uppercase tracking-[0.14em]">
        <Icon className="h-3 w-3 shrink-0 text-[var(--cv-accent)]" aria-hidden />
        {title}
      </p>
      {children}
    </section>
  );
}

type DialogProps = DocProps & {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPrint?: () => void;
  onThemeChange?: (theme: AboutCvTheme) => void;
};

export default function AboutDocumentPreviewDialog({
  open,
  onOpenChange,
  onPrint,
  theme,
  onThemeChange,
  ...doc
}: DialogProps) {
  const [localTheme, setLocalTheme] = useState<AboutCvTheme>(() => theme ?? readAboutCvTheme());
  const [downloading, setDownloading] = useState(false);
  const activeTheme = theme ?? localTheme;
  const themeMeta = ABOUT_CV_THEMES.find((item) => item.id === activeTheme) ?? ABOUT_CV_THEMES[0];
  const previewName = parseProfileCv(doc.profile.cv).fullName.trim() || "Creator";

  const setTheme = (next: AboutCvTheme) => {
    writeAboutCvTheme(next);
    setLocalTheme(next);
    onThemeChange?.(next);
  };

  const handleDownloadPdf = async () => {
    setDownloading(true);
    try {
      await downloadAboutCvPdf(aboutCvPdfFilename(previewName === "Creator" ? "" : previewName));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "ดาวน์โหลด PDF ไม่สำเร็จ");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        overlayClassName="bg-black/55 print:hidden"
        className={cn(
          "w-fit max-w-[min(210mm,calc(100vw-1.25rem))] gap-2.5 rounded-2xl border-0 p-3 sm:p-3.5",
          "print:hidden",
        )}
        style={{ background: themeMeta.frame }}
      >
        <DialogTitle className="sr-only">About Me preview for {previewName}</DialogTitle>
        <DialogDescription className="sr-only">
          A4 portrait preview for printing or job applications
        </DialogDescription>
        <div className="flex flex-wrap items-center justify-between gap-2 pr-8">
          <div className="flex items-center gap-1.5" role="radiogroup" aria-label="ธีมพรีวิว">
            {ABOUT_CV_THEMES.map((item) => (
              <button
                key={item.id}
                type="button"
                role="radio"
                aria-checked={activeTheme === item.id}
                onClick={() => setTheme(item.id)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] border bg-white/80 transition-colors",
                  activeTheme === item.id
                    ? "font-medium shadow-sm"
                    : "border-black/10 text-muted-foreground hover:text-foreground",
                )}
                style={
                  activeTheme === item.id
                    ? { borderColor: item.swatch, color: item.swatch }
                    : undefined
                }
              >
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ background: item.swatch }}
                  aria-hidden
                />
                {item.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="rounded-full bg-white/80"
              style={{ borderColor: themeMeta.swatch, color: themeMeta.swatch }}
              disabled={downloading}
              onClick={() => void handleDownloadPdf()}
            >
              <Download className="h-3.5 w-3.5" />
              {downloading ? "กำลังสร้าง PDF..." : "Download PDF"}
            </Button>
            {onPrint ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="rounded-full bg-white/80"
                style={{ borderColor: themeMeta.swatch, color: themeMeta.swatch }}
                onClick={onPrint}
              >
                <Printer className="h-3.5 w-3.5" />
                Print
              </Button>
            ) : null}
          </div>
        </div>
        <div className="about-cv-a4-frame">
          <AboutDocumentSheet {...doc} theme={activeTheme} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
