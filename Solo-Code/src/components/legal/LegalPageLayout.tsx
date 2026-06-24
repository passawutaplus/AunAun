import { Link } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import { ArrowLeft } from "lucide-react";
import { LEGAL, type LegalSection } from "@/lib/legalMeta";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { CookiePreferencesLink } from "@/components/CookiePreferencesLink";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  subtitle?: string;
  icon: LucideIcon;
  iconLabel: string;
  sections: LegalSection[];
  children: React.ReactNode;
};

export function LegalPageLayout({
  title,
  subtitle,
  icon: Icon,
  iconLabel,
  sections,
  children,
}: Props) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-30 glass border-b border-border">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> กลับหน้าหลัก
          </Link>
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <Icon className="h-3.5 w-3.5 text-primary" /> {iconLabel}
          </span>
        </div>
      </header>

      <main className="flex-1 w-full">
        <div className="max-w-5xl mx-auto px-4 py-10 sm:py-14">
          <div className="lg:grid lg:grid-cols-[220px_1fr] lg:gap-10 lg:items-start">
            <aside className="hidden lg:block sticky top-20">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                สารบัญ
              </p>
              <nav className="space-y-1 text-xs">
                {sections.map((s) => (
                  <a
                    key={s.id}
                    href={`#${s.id}`}
                    className="block rounded-md px-2 py-1.5 text-muted-foreground hover:text-primary hover:bg-muted/50 transition-colors"
                  >
                    {s.title}
                  </a>
                ))}
              </nav>
            </aside>

            <div>
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">{title}</h1>
              {subtitle && <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>}
              <p className="mt-2 text-sm text-muted-foreground">
                อัปเดตล่าสุด: {LEGAL.lastUpdated}
              </p>

              <article className="mt-8 space-y-8 text-sm leading-relaxed text-foreground/90">
                {children}
              </article>

              <LegalCrossLinks />
            </div>
          </div>
        </div>
      </main>

      <SiteFooter variant="minimal" />
    </div>
  );
}

export function LegalSectionBlock({
  id,
  title,
  children,
  className,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={cn("scroll-mt-24", className)}>
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  );
}

function LegalCrossLinks() {
  return (
    <div className="mt-10 pt-6 border-t border-border text-xs text-muted-foreground flex flex-wrap gap-x-3 gap-y-2 items-center">
      <span>เอกสารที่เกี่ยวข้อง:</span>
      <Link to="/privacy" className="text-primary hover:underline">
        นโยบายความเป็นส่วนตัว (PDPA)
      </Link>
      <span className="opacity-40">·</span>
      <Link to="/terms" className="text-primary hover:underline">
        ข้อกำหนดการใช้งาน
      </Link>
      <span className="opacity-40">·</span>
      <Link to="/cookies" className="text-primary hover:underline">
        นโยบายคุกกี้
      </Link>
      <span className="opacity-40">·</span>
      <Link to="/refund" className="text-primary hover:underline">
        นโยบายคืนเงิน
      </Link>
      <span className="opacity-40">·</span>
      <CookiePreferencesLink className="text-primary hover:underline" />
      <span className="opacity-40">·</span>
      <a href={`mailto:${LEGAL.contactEmail}`} className="text-primary hover:underline">
        {LEGAL.contactEmail}
      </a>
    </div>
  );
}
