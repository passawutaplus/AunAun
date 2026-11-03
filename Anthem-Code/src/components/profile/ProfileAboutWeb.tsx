import type { ReactNode } from "react";
import {
  Award,
  Briefcase,
  ExternalLink,
  Facebook,
  Globe,
  GraduationCap,
  Instagram,
  Layers,
  Languages,
  Mail,
  MessageSquare,
  Monitor,
  Phone,
  type LucideIcon,
} from "lucide-react";
import { safeHttpUrl } from "@/lib/safeUrl";
import {
  CV_LANGUAGE_LEVEL_LABELS,
  EDUCATION_DEGREE_LABELS,
  parseProfileCv,
  type CvLanguageLevel,
  type EducationDegree,
} from "@/lib/profileCv";
import { resolveToolIconSlug, toolIconUrl } from "@/lib/toolIcons";
import type { ExperienceItem } from "@/lib/validators";

const EMPLOYMENT_LABEL: Record<string, string> = {
  full_time: "Full-time",
  part_time: "Part-time",
  freelance: "Freelance",
  contract: "Contract",
  owner: "Owner",
  consultant: "Consultant",
};

type Props = {
  profile: {
    bio: string | null;
    cv?: unknown;
    website: string | null;
    instagram: string | null;
    facebook: string | null;
    line_id: string | null;
  };
  experience: ExperienceItem[];
  skills: string[];
};

/** "2568 – Present" from a period text or start/end fields. */
function periodText(item: { period?: string; periodStart?: string; periodEnd?: string; isCurrent?: boolean }) {
  if (item.period?.trim()) return item.period.trim();
  const end = item.isCurrent ? "Present" : item.periodEnd?.trim();
  return [item.periodStart?.trim(), end].filter(Boolean).join(" – ");
}

function SideSection({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children: ReactNode }) {
  return (
    <section className="space-y-3 py-6 first:pt-0">
      <h3 className="flex items-center gap-3 text-base font-semibold text-foreground">
        <Icon className="h-5 w-5 text-muted-foreground" aria-hidden />
        {title}
      </h3>
      <div className="pl-8">{children}</div>
    </section>
  );
}

function Timeline({ rows }: { rows: { key: string; title: string; sub: string; period: string }[] }) {
  return (
    <ol className="relative space-y-5 pl-8 before:absolute before:bottom-2 before:left-[0.4rem] before:top-2 before:w-px before:bg-border">
      {rows.map((r) => (
        <li key={r.key} className="relative flex items-start justify-between gap-4">
          <span className="absolute -left-8 top-1.5 h-3 w-3 rounded-full border-2 border-background bg-foreground" aria-hidden />
          <div className="min-w-0">
            <p className="font-semibold text-foreground">{r.title}</p>
            {r.sub ? <p className="text-sm text-muted-foreground">{r.sub}</p> : null}
          </div>
          {r.period ? <p className="shrink-0 text-sm text-foreground/80 tabular-nums">{r.period}</p> : null}
        </li>
      ))}
    </ol>
  );
}

function ContactPill({ href, icon: Icon, label, external }: { href?: string; icon: LucideIcon; label: string; external?: boolean }) {
  const body = (
    <>
      <Icon className="h-4 w-4 shrink-0" aria-hidden />
      <span className="truncate">{label}</span>
      {external ? <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden /> : null}
    </>
  );
  const cls =
    "inline-flex h-10 max-w-full items-center gap-2 rounded-full border border-border px-4 text-sm text-foreground transition-colors hover:border-foreground/40";
  return href ? (
    <a href={href} target={external ? "_blank" : undefined} rel={external ? "noopener noreferrer" : undefined} className={cls}>
      {body}
    </a>
  ) : (
    <span className={cls}>{body}</span>
  );
}

/**
 * Visitor About tab as a web page (the A4 sheet stays for print / PDF): about + contacts,
 * experience and education on the left; expertise, software, languages and awards on the right.
 * Every block follows the creator's CV show/hide settings.
 */
export default function ProfileAboutWeb({ profile, experience, skills }: Props) {
  const cv = parseProfileCv(profile.cv);
  const show = cv.visibility;
  const about = (cv.about || profile.bio || "").trim();

  const contacts: { key: string; node: ReactNode }[] = [];
  if (show.contactEmail && cv.contactEmail) {
    contacts.push({ key: "mail", node: <ContactPill href={`mailto:${cv.contactEmail}`} icon={Mail} label={cv.contactEmail} /> });
  }
  if (show.contactPhone && cv.contactPhone) {
    contacts.push({ key: "phone", node: <ContactPill href={`tel:${cv.contactPhone.replace(/\s/g, "")}`} icon={Phone} label={cv.contactPhone} /> });
  }
  const line = (show.contactLine && cv.contactLine) || profile.line_id;
  if (line) contacts.push({ key: "line", node: <ContactPill icon={MessageSquare} label={line} /> });
  if (show.socials && profile.instagram) {
    contacts.push({
      key: "ig",
      node: (
        <ContactPill
          href={`https://instagram.com/${encodeURIComponent(profile.instagram)}`}
          icon={Instagram}
          label={profile.instagram}
          external
        />
      ),
    });
  }
  const facebook = show.socials ? safeHttpUrl(profile.facebook) : undefined;
  if (facebook) {
    contacts.push({
      key: "fb",
      node: <ContactPill href={facebook} icon={Facebook} label={facebook.replace(/^https?:\/\/(www\.)?facebook\.com\//, "")} external />,
    });
  }
  const website = show.website ? safeHttpUrl(profile.website) : undefined;
  if (website) {
    contacts.push({
      key: "web",
      node: <ContactPill href={website} icon={Globe} label={website.replace(/^https?:\/\//, "").replace(/\/$/, "")} external />,
    });
  }

  const experienceRows = show.experience
    ? experience.map((e, i) => ({
        key: `exp-${i}`,
        title: e.title,
        sub: [e.company, e.employmentType ? EMPLOYMENT_LABEL[e.employmentType] : ""].filter(Boolean).join(" · "),
        period: periodText(e),
      }))
    : [];
  const educationRows = show.education
    ? cv.education.map((e, i) => ({
        key: `edu-${i}`,
        title: e.school,
        sub: [e.degree ? EDUCATION_DEGREE_LABELS[e.degree as EducationDegree] : "", e.faculty, e.field]
          .filter(Boolean)
          .join(" · "),
        period: periodText(e),
      }))
    : [];
  const awards = [
    ...(show.awards
      ? cv.awards.map((a) => ({
          // "Gold — RED DOT", or just one name when award and event are the same.
          title: a.award && a.award.toLowerCase() !== a.event.toLowerCase() ? `${a.award} — ${a.event}` : a.event,
          year: a.year,
        }))
      : []),
    ...(show.certification
      ? cv.certifications.map((c) => ({ title: c.issuer ? `${c.title} · ${c.issuer}` : c.title, year: c.year }))
      : []),
  ];
  const tools = show.software ? cv.tools : [];
  const languages = show.languages ? cv.languages : [];
  const expertise = show.skills ? skills : [];

  const hasSide = expertise.length || tools.length || languages.length || awards.length;

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-0">
      <div className="space-y-8 lg:pr-10">
        <section>
          <h2 className="text-3xl font-semibold tracking-tight text-foreground">About the Creator</h2>
          {show.about && about ? (
            <p className="mt-4 max-w-2xl whitespace-pre-line text-lg leading-relaxed text-foreground/85">{about}</p>
          ) : null}
          {contacts.length ? (
            <div className="mt-6 flex flex-wrap gap-3">
              {contacts.map((c) => (
                <span key={c.key} className="max-w-full">
                  {c.node}
                </span>
              ))}
            </div>
          ) : null}
        </section>

        {experienceRows.length ? (
          <section className="space-y-5 border-t border-border pt-8">
            <h3 className="flex items-center gap-3 text-lg font-semibold text-foreground">
              <Briefcase className="h-5 w-5 text-muted-foreground" aria-hidden /> Experience
            </h3>
            <Timeline rows={experienceRows} />
          </section>
        ) : null}

        {educationRows.length ? (
          <section className="space-y-5 border-t border-border pt-8">
            <h3 className="flex items-center gap-3 text-lg font-semibold text-foreground">
              <GraduationCap className="h-5 w-5 text-muted-foreground" aria-hidden /> Education
            </h3>
            <Timeline rows={educationRows} />
          </section>
        ) : null}
      </div>

      {hasSide ? (
        <aside className="divide-y divide-border border-border lg:border-l lg:pl-8">
          {expertise.length ? (
            <SideSection icon={Layers} title="Expertise">
              <ul className="flex flex-wrap gap-2">
                {expertise.map((s) => (
                  <li key={s} className="rounded-full bg-muted px-3 py-1 text-sm text-foreground">
                    {s}
                  </li>
                ))}
              </ul>
            </SideSection>
          ) : null}

          {tools.length ? (
            <SideSection icon={Monitor} title="Design Software">
              <ul className="flex flex-wrap gap-2">
                {tools.map((t) => {
                  const slug = resolveToolIconSlug(t);
                  return (
                    <li key={t} title={t}>
                      {slug ? (
                        <img src={toolIconUrl(slug)} alt={t} className="h-10 w-10 rounded-lg object-contain" loading="lazy" />
                      ) : (
                        <span className="inline-flex h-10 items-center rounded-lg bg-muted px-3 text-sm text-foreground">{t}</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </SideSection>
          ) : null}

          {languages.length ? (
            <SideSection icon={Languages} title="Languages">
              <ul className="space-y-1 text-sm text-foreground/85">
                {languages.map((l) => (
                  <li key={l.name}>
                    {l.name}
                    {l.level ? ` — ${CV_LANGUAGE_LEVEL_LABELS[l.level as CvLanguageLevel]}` : ""}
                  </li>
                ))}
              </ul>
            </SideSection>
          ) : null}

          {awards.length ? (
            <SideSection icon={Award} title="Awards & Certification">
              <ul className="divide-y divide-border">
                {awards.map((a, i) => (
                  <li key={`${a.title}-${i}`} className="flex items-start justify-between gap-3 py-2.5 first:pt-0">
                    <span className="min-w-0 text-sm font-semibold text-foreground">{a.title}</span>
                    {a.year ? <span className="shrink-0 text-sm text-foreground/80 tabular-nums">{a.year}</span> : null}
                  </li>
                ))}
              </ul>
            </SideSection>
          ) : null}
        </aside>
      ) : null}
    </div>
  );
}
