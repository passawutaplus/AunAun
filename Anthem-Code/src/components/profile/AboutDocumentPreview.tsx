import { useLayoutEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
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
import type { ExperienceItem, SocialLinkItem } from "@/lib/validators";
import {
  EXPERIENCE_EMPLOYMENT_LABELS,
  formatExperiencePeriod,
  type ExperienceEmploymentType,
} from "@/lib/validators";
import { displayProfileAddress } from "@/lib/profileAddress";
import { displayInitials } from "@/lib/avatarPool";
import { safeHttpUrl } from "@/lib/safeUrl";
import { socialDisplayId } from "@/lib/externalUrl";
import {
  cvPhotoVisible,
  cvPortraitUrl,
  CV_LANGUAGE_LEVEL_LABELS,
  educationDetailLines,
  experienceBullets,
  formatEducationPeriod,
  cvAboutText,
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

export type CvDensity = "normal" | "compact";
export type CvFit = { density: CvDensity; overflow: boolean };

type DocProps = {
  profile: ProfileAbout;
  experience: ExperienceItem[];
  skills: string[];
  socialLinks?: SocialLinkItem[];
  profileUrl?: string | null;
  theme?: AboutCvTheme;
  /** Owner print/PDF — always include application email/LINE/phone. */
  forceShowApplicationContact?: boolean;
  /** Spacing scale; the measuring sheet (onFit) picks its own. */
  density?: CvDensity;
  /** Set on the fixed-size print sheet only: reports which density fits A4. */
  onFit?: (fit: CvFit) => void;
};

function hrefLabel(url: string) {
  return url.replace(/^https?:\/\//i, "").replace(/\/$/, "");
}

const sameText = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

export function AboutDocumentSheet({
  profile,
  experience,
  skills,
  socialLinks = [],
  profileUrl,
  theme = "orange",
  forceShowApplicationContact = false,
  density = "normal",
  onFit,
}: DocProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const lastFit = useRef<CvFit | null>(null);
  const cv = parseProfileCv(profile.cv);
  const vis = cv.visibility;
  const layout = cv.layout;
  const showPhoto = cvPhotoVisible(cv);
  const portrait = cvPortraitUrl(profile.cv_photo_url, profile.avatar_url);
  const name = cv.fullName.trim();
  const desiredRole = cv.desiredRole.trim();
  const contactEmail = forceShowApplicationContact || vis.contactEmail ? cv.contactEmail.trim() : "";
  const contactPhone = forceShowApplicationContact || vis.contactPhone ? cv.contactPhone.trim() : "";
  const initials = displayInitials(name || profile.username || profile.display_name, 2);
  const bio = vis.about ? cvAboutText(cv, profile.bio) : "";
  const place = vis.location
    ? displayProfileAddress(profile.profile_address, profile.location, cv.addressDetail)
    : "";
  const website = vis.website ? safeHttpUrl(profile.website) : undefined;
  const lineId =
    forceShowApplicationContact || vis.contactLine
      ? cv.contactLine.trim() || profile.line_id?.trim() || ""
      : "";
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
  const qrTarget = profileLink ?? portfolio;
  const { craftSkills, software } = partitionSkillsAndSoftware(
    vis.skills ? skills : [],
    vis.software ? cv.tools : [],
  );

  const contactLines = [
    profileLink ? (
      <CvContactLine key="profile" icon={Link2} label="SAMECOR">
        {hrefLabel(profileLink)}
      </CvContactLine>
    ) : null,
    portfolio && portfolio !== profileLink ? (
      <CvContactLine key="portfolio" icon={Briefcase} label="Portfolio">
        {hrefLabel(portfolio)}
      </CvContactLine>
    ) : null,
    contactEmail ? (
      <CvContactLine key="email" icon={Mail} label="Email">
        {contactEmail}
      </CvContactLine>
    ) : null,
    contactPhone ? (
      <CvContactLine key="phone" icon={Phone} label="Phone">
        {contactPhone}
      </CvContactLine>
    ) : null,
    lineId ? (
      <CvContactLine key="line" icon={LineMarkIcon} label="LINE">
        {lineId}
      </CvContactLine>
    ) : null,
    website && website !== portfolio && website !== profileLink ? (
      <CvContactLine key="website" icon={Link2} label="Website">
        {hrefLabel(website)}
      </CvContactLine>
    ) : null,
    instagramHandle ? (
      <CvContactLine key="instagram" icon={Instagram} label="Instagram">
        {socialDisplayId(instagramHandle)}
      </CvContactLine>
    ) : null,
    facebookHref ? (
      <CvContactLine key="facebook" icon={Facebook} label="Facebook">
        {socialDisplayId(facebookHref)}
      </CvContactLine>
    ) : null,
    ...extraSocials.map((item) => (
      <CvContactLine key={item.href} icon={Link2} label={item.title}>
        {socialDisplayId(item.href)}
      </CvContactLine>
    )),
  ].filter(Boolean);

  const contactBlock =
    contactLines.length > 0 || qrTarget ? (
      <DocBlock key="contact" icon={Link2} title="Contact">
        <div className="about-cv-contact-body">
          <div className="about-cv-contact-lines">{contactLines}</div>
          {qrTarget ? (
            <div className="about-cv-qr" aria-label="QR code">
              <QRCodeSVG value={qrTarget} size={96} level="M" marginSize={0} bgColor="#ffffff" fgColor="#111111" />
            </div>
          ) : null}
        </div>
      </DocBlock>
    ) : null;

  const sideBlocks = [
    place ? (
      <DocBlock key="location" icon={MapPin} title="Location">
        <p className="about-cv-copy">{place}</p>
      </DocBlock>
    ) : null,
    vis.languages && cv.languages.length > 0 ? (
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
        <p className="about-cv-copy">{software.join(" · ")}</p>
      </DocBlock>
    ) : null,
  ].filter(Boolean);

  const asideBlocks = layout === "one" ? sideBlocks : [contactBlock, ...sideBlocks].filter(Boolean);
  const hasHero = !!((showPhoto && portrait) || name || desiredRole || bio);
  const renderPhoto = showPhoto && hasHero;

  const mainBlocks = [
    vis.experience && experience.length > 0 ? (
      <div key="experience">
        <PrintHeading icon={Briefcase} title="Experience" />
        <ol className="about-cv-entries">
          {experience.map((it, i) => {
            const period = formatExperiencePeriod(it) || it.period;
            const typeLabel = it.employmentType
              ? EXPERIENCE_EMPLOYMENT_LABELS[it.employmentType as ExperienceEmploymentType]
              : null;
            const bullets = experienceBullets(it);
            return (
              <CvEntry
                key={`${it.title}-${i}`}
                period={period}
                title={it.title}
                lines={[[it.company, typeLabel].filter(Boolean).join(" · ")]}
              >
                {bullets.length ? (
                  <ul className="about-cv-entry-bullets">
                    {bullets.map((b) => (
                      <li key={b} className="flex gap-2 about-cv-copy leading-relaxed">
                        <span className="mt-[0.4em] h-1 w-1 shrink-0 rounded-full bg-[var(--cv-accent)]" />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </CvEntry>
            );
          })}
        </ol>
      </div>
    ) : null,
    vis.education && cv.education.length > 0 ? (
      <div key="education">
        <PrintHeading icon={GraduationCap} title="Education" />
        <ol className="about-cv-entries">
          {cv.education.map((it, i) => {
            const { lead, tail } = educationDetailLines(it);
            return (
              <CvEntry
                key={`${it.school}-${i}`}
                period={formatEducationPeriod(it) || it.period}
                title={it.school}
                lines={[lead, tail]}
              />
            );
          })}
        </ol>
      </div>
    ) : null,
    vis.certification && cv.certifications.length > 0 ? (
      <div key="certs">
        <PrintHeading icon={BadgeCheck} title="Certification" />
        <ol className="about-cv-entries">
          {cv.certifications.map((it, i) => (
            <CvEntry key={`${it.title}-${i}`} period={it.year} title={it.title} lines={[it.issuer]} />
          ))}
        </ol>
      </div>
    ) : null,
    vis.awards && cv.awards.length > 0 ? (
      <div key="awards">
        <PrintHeading icon={Award} title="Awards" />
        <ol className="about-cv-entries">
          {cv.awards.map((it, i) => (
            <CvEntry key={`${it.event}-${i}`} period={it.year} title={it.award} lines={[it.event]} />
          ))}
        </ol>
      </div>
    ) : null,
  ].filter(Boolean);

  // The print root (fixed 210mm) is the source of truth for fit: try the
  // normal density, fall back to compact, and report whether it still overflows.
  useLayoutEffect(() => {
    const el = sheetRef.current;
    if (!onFit || !el) return;
    const overflows = () =>
      el.scrollHeight > el.clientHeight + 1 ||
      Array.from(el.querySelectorAll<HTMLElement>(".about-cv-sheet-main, .about-cv-sheet-side")).some(
        (part) => part.scrollHeight > part.clientHeight + 1,
      );
    const measure = () => {
      el.dataset.density = "normal";
      let next: CvFit = { density: "normal", overflow: overflows() };
      if (next.overflow) {
        el.dataset.density = "compact";
        next = { density: "compact", overflow: overflows() };
      }
      const prev = lastFit.current;
      if (prev && prev.density === next.density && prev.overflow === next.overflow) return;
      lastFit.current = next;
      onFit(next);
    };
    measure();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    observer?.observe(el);
    void document.fonts?.ready.then(measure);
    return () => observer?.disconnect();
  });

  return (
    <div
      ref={sheetRef}
      className="about-cv-sheet"
      data-cv-theme={theme}
      data-cv-layout={layout}
      data-cv-photo={renderPhoto ? "on" : "off"}
      data-density={onFit ? undefined : density}
    >
      {hasHero ? (
        <>
          {renderPhoto ? (
            <div className="about-cv-sheet-hero-photo">
              <div className="about-cv-hero-photo">
                {portrait ? (
                  <img loading="lazy" decoding="async" src={portrait} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-[clamp(1.1rem,4cqi,1.6rem)] font-semibold text-[var(--cv-ink)]">
                    {initials}
                  </div>
                )}
              </div>
            </div>
          ) : null}
          <div className="about-cv-sheet-hero-copy">
            {name ? <p className="about-cv-hero-name">{name}</p> : null}
            {desiredRole ? <p className="about-cv-hero-role">{desiredRole}</p> : null}
            {name || desiredRole ? <span className="about-cv-hero-rule" aria-hidden /> : null}
            {bio ? <p className="about-cv-copy whitespace-pre-wrap">{bio}</p> : null}
          </div>
        </>
      ) : null}

      {layout === "one" && contactBlock ? (
        <div className="about-cv-sheet-contact">{contactBlock}</div>
      ) : null}

      <aside className="about-cv-sheet-side">
        {asideBlocks.length > 0 ? (
          <div className={layout === "one" ? "about-cv-side-grid" : "about-cv-side-stack"}>
            {asideBlocks.map((block, i) => (
              <div key={i} className="about-cv-side-item">
                {block}
              </div>
            ))}
          </div>
        ) : null}
      </aside>

      <div className="about-cv-sheet-main">
        <div className="divide-y divide-[var(--cv-rule)]">
          {mainBlocks.map((block, i) => (
            <div key={i} className={cn(i === 0 ? "pb-3.5 pt-0" : "py-3.5", "last:pb-0")}>
              {block}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CvEntry({
  period,
  title,
  lines = [],
  children,
}: {
  period?: string;
  title: string;
  lines?: (string | undefined)[];
  children?: React.ReactNode;
}) {
  // Drop detail lines that just repeat the title (e.g. issuer == certificate name).
  const shown: string[] = [];
  for (const raw of lines) {
    const line = raw?.trim();
    if (!line || sameText(line, title) || shown.some((s) => sameText(s, line))) continue;
    shown.push(line);
  }
  return (
    <li className="about-cv-entry">
      <div className="about-cv-entry-head">
        <p className="about-cv-entry-title">{title}</p>
        {period ? <p className="about-cv-entry-date">{period}</p> : null}
      </div>
      {shown.map((line) => (
        <p key={line} className="about-cv-entry-sub">
          {line}
        </p>
      ))}
      {children}
    </li>
  );
}

function CvContactLine({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <p className="about-cv-copy flex min-w-0 items-start gap-1.5">
      <Icon className="mt-[0.28em] h-2.5 w-2.5 shrink-0 text-[var(--cv-icon)]" aria-hidden />
      <span className="sr-only">{label}: </span>
      <span className="min-w-0 break-all">{children}</span>
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
      <Icon className="h-3 w-3 shrink-0 text-[var(--cv-icon)]" aria-hidden />
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
        <Icon className="h-3 w-3 shrink-0 text-[var(--cv-icon)]" aria-hidden />
        {title}
      </p>
      {children}
    </section>
  );
}

type DialogProps = DocProps & {
  /** Fit result of the print sheet — drives the "too long for one page" notice. */
  fit?: CvFit;
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
  fit,
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
            {ABOUT_CV_THEMES.filter((item) => item.id !== "slate").map((item) => (
              <button
                key={item.id}
                type="button"
                role="radio"
                aria-checked={activeTheme === item.id}
                onClick={() => setTheme(item.id)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] border bg-white transition-colors",
                  activeTheme === item.id
                    ? "border-black font-medium text-foreground"
                    : "border-black/20 text-foreground hover:border-black",
                )}
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
              className="rounded-full bg-white text-foreground"
              style={{ borderColor: "#111111", color: "#111111" }}
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
                className="rounded-full bg-white text-foreground"
                style={{ borderColor: "#111111", color: "#111111" }}
                onClick={onPrint}
              >
                <Printer className="h-3.5 w-3.5" />
                Print
              </Button>
            ) : null}
          </div>
        </div>
        {fit?.overflow ? (
          <p role="status" className="rounded-lg bg-amber-100 px-2.5 py-1.5 text-[11px] text-amber-950">
            เนื้อหายาวเกิน 1 หน้า A4 — ลดข้อความ ปิดบางหัวข้อ หรือเลือกคอลัมน์เดียว
          </p>
        ) : null}
        <div className="about-cv-a4-frame">
          <AboutDocumentSheet {...doc} theme={activeTheme} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
