import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { safeHref } from "@/lib/security";
import {
  AVAILABILITY_LABELS,
  type PortfolioAbout,
  type PortfolioExperienceItem,
  type PortfolioExternalLink,
  type PortfolioFeaturedItem,
  type PortfolioHero,
  type PortfolioResume,
  type PortfolioSkills,
  type PortfolioVisibility,
} from "@/lib/portfolioSchema";
import {
  Briefcase,
  Download,
  ExternalLink,
  Globe,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  ShieldCheck,
} from "lucide-react";

export interface PortfolioViewData {
  slug: string;
  hero: PortfolioHero;
  about: PortfolioAbout;
  skills: PortfolioSkills;
  experience: PortfolioExperienceItem[];
  featuredWork: PortfolioFeaturedItem[];
  externalLinks: PortfolioExternalLink[];
  resume: PortfolioResume;
  visibility: PortfolioVisibility;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
      {children}
    </h2>
  );
}

function sorted<T extends { sortOrder?: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
}

export function PortfolioPublicView({
  data,
  showFooter = true,
}: {
  data: PortfolioViewData;
  showFooter?: boolean;
}) {
  const { hero, about, skills, experience, featuredWork, externalLinks, resume, visibility } =
    data;
  const availabilityTone =
    hero.availability === "available"
      ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/20"
      : hero.availability === "limited"
        ? "bg-amber-500/10 text-amber-700 border-amber-500/20"
        : "bg-muted text-muted-foreground border-border";

  const contacts: { key: string; href: string; label: string; icon: React.ReactNode }[] = [];
  if (visibility.show_email && hero.email) {
    contacts.push({
      key: "email",
      href: `mailto:${hero.email}`,
      label: hero.email,
      icon: <Mail className="h-4 w-4" />,
    });
  }
  if (visibility.show_phone && hero.phone) {
    contacts.push({
      key: "phone",
      href: `tel:${hero.phone}`,
      label: hero.phone,
      icon: <Phone className="h-4 w-4" />,
    });
  }
  if (visibility.show_line && hero.lineId) {
    contacts.push({
      key: "line",
      href: safeHref(`https://line.me/ti/p/~${encodeURIComponent(hero.lineId)}`) ?? "#",
      label: `LINE: ${hero.lineId}`,
      icon: <MessageCircle className="h-4 w-4" />,
    });
  }

  return (
    <article className="bg-card rounded-3xl shadow-elevated border border-border/60 overflow-hidden">
      <div className="bg-gradient-to-br from-primary/10 via-background to-primary-soft/30 px-6 sm:px-10 py-10 sm:py-12">
        <header className="flex flex-col sm:flex-row gap-6 items-start">
          {hero.avatarUrl ? (
            <img
              src={hero.avatarUrl}
              alt={hero.displayName}
              className="h-24 w-24 sm:h-28 sm:w-28 rounded-2xl object-cover border-4 border-background shadow-soft shrink-0"
            />
          ) : (
            <div className="h-24 w-24 sm:h-28 sm:w-28 rounded-2xl bg-primary/15 flex items-center justify-center text-3xl font-semibold text-primary shrink-0">
              {(hero.displayName || "?").charAt(0).toUpperCase()}
            </div>
          )}
          <div className="space-y-3 min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className={`text-[11px] rounded-full ${availabilityTone}`}>
                {AVAILABILITY_LABELS[hero.availability]}
              </Badge>
              {hero.location ? (
                <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {hero.location}
                </span>
              ) : null}
            </div>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight break-words">
              {hero.displayName || "Freelancer"}
            </h1>
            {hero.headline ? (
              <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
                {hero.headline}
              </p>
            ) : null}
            {contacts.length > 0 ? (
              <div className="flex flex-wrap gap-2 pt-1">
                {contacts.map((c) => (
                  <Button key={c.key} asChild variant="outline" size="sm" className="h-8 gap-1.5">
                    <a href={c.href} target={c.key === "line" ? "_blank" : undefined} rel="noopener noreferrer">
                      {c.icon}
                      <span className="truncate max-w-[180px]">{c.label}</span>
                    </a>
                  </Button>
                ))}
              </div>
            ) : null}
          </div>
        </header>
      </div>

      <div className="px-6 sm:px-10 py-8 sm:py-10 space-y-10">
        {visibility.about && about.bio?.trim() ? (
          <section>
            <SectionTitle>เกี่ยวกับฉัน</SectionTitle>
            <p className="text-sm sm:text-base leading-relaxed whitespace-pre-wrap text-foreground/90">
              {about.bio}
            </p>
          </section>
        ) : null}

        {visibility.skills && (skills.tags.length > 0 || skills.services.length > 0) ? (
          <section>
            <SectionTitle>ทักษะ & บริการ</SectionTitle>
            {skills.tags.length > 0 ? (
              <div className="flex flex-wrap gap-2 mb-4">
                {skills.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="rounded-full text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            ) : null}
            {skills.services.length > 0 ? (
              <ul className="space-y-2">
                {skills.services.map((s) => (
                  <li
                    key={s.id}
                    className="flex items-center justify-between gap-3 text-sm border border-border/50 rounded-xl px-4 py-3"
                  >
                    <span className="font-medium">{s.name}</span>
                    {s.priceNote ? (
                      <span className="text-muted-foreground text-xs shrink-0">{s.priceNote}</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        ) : null}

        {visibility.experience && experience.length > 0 ? (
          <section>
            <SectionTitle>ประสบการณ์</SectionTitle>
            <div className="space-y-6">
              {sorted(experience).map((item) => (
                <div key={item.id} className="relative pl-5 border-l-2 border-primary/20">
                  <div className="absolute -left-[5px] top-1.5 h-2 w-2 rounded-full bg-primary" />
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <h3 className="font-semibold text-sm sm:text-base">{item.role}</h3>
                    {item.company ? (
                      <span className="text-muted-foreground text-sm">· {item.company}</span>
                    ) : null}
                  </div>
                  {item.period ? (
                    <p className="text-xs text-muted-foreground mt-0.5">{item.period}</p>
                  ) : null}
                  {item.highlights?.length ? (
                    <ul className="mt-2 space-y-1 text-sm text-foreground/85 list-disc list-inside">
                      {item.highlights.map((h, i) => (
                        <li key={i}>{h}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {visibility.featured_work && featuredWork.length > 0 ? (
          <section>
            <SectionTitle>ผลงานเด่น</SectionTitle>
            <div className="grid gap-4 sm:grid-cols-2">
              {sorted(featuredWork).map((item) => {
                const href = safeHref(item.url);
                const inner = (
                  <>
                    {item.coverUrl ? (
                      <div className="aspect-[16/10] bg-muted overflow-hidden">
                        <img
                          src={item.coverUrl}
                          alt={item.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="aspect-[16/10] bg-muted/50 flex items-center justify-center">
                        <Briefcase className="h-8 w-8 text-muted-foreground/40" />
                      </div>
                    )}
                    <div className="p-4 space-y-1">
                      <h3 className="font-semibold text-sm">{item.title}</h3>
                      {item.description ? (
                        <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>
                      ) : null}
                    </div>
                  </>
                );
                return href ? (
                  <a
                    key={item.id}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block rounded-2xl border border-border/60 overflow-hidden hover:border-primary/40 transition-colors"
                  >
                    {inner}
                  </a>
                ) : (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-border/60 overflow-hidden"
                  >
                    {inner}
                  </div>
                );
              })}
            </div>
          </section>
        ) : null}

        {visibility.external_links && externalLinks.length > 0 ? (
          <section>
            <SectionTitle>ลิงก์</SectionTitle>
            <div className="flex flex-wrap gap-2">
              {externalLinks.map((link) => {
                const href = safeHref(link.url);
                if (!href) return null;
                return (
                  <Button key={link.id} asChild variant="outline" size="sm" className="gap-1.5 h-9">
                    <a href={href} target="_blank" rel="noopener noreferrer">
                      <Globe className="h-3.5 w-3.5" />
                      {link.label || link.platform}
                      <ExternalLink className="h-3 w-3 opacity-50" />
                    </a>
                  </Button>
                );
              })}
            </div>
          </section>
        ) : null}

        {visibility.resume && resume.fileUrl ? (
          <section>
            <SectionTitle>Resume / CV</SectionTitle>
            <Button asChild className="gap-2">
              <a href={resume.fileUrl} target="_blank" rel="noopener noreferrer" download>
                <Download className="h-4 w-4" />
                {resume.label || "ดาวน์โหลด CV"}
              </a>
            </Button>
          </section>
        ) : null}
      </div>

      {showFooter ? (
        <footer className="border-t border-border/50 px-6 sm:px-10 py-4 flex items-center justify-between gap-3 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <ShieldCheck className="h-3.5 w-3.5 text-primary/70" />
            Portfolio บน So1o Freelancer
          </span>
          <span className="truncate">solofreelancer.com/p/{data.slug}</span>
        </footer>
      ) : null}
    </article>
  );
}
