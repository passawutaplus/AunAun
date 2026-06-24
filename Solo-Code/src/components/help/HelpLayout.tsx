import { Link } from "@tanstack/react-router";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteFooter } from "@/components/layout/SiteFooter";
import type { HelpLink, HelpRoute } from "@/data/helpCenter";
import { HELP_GUIDES, HELP_RELATED } from "@/data/helpCenter";

type Props = {
  title: string;
  subtitle?: string;
  route: HelpRoute;
  children: React.ReactNode;
  actions?: React.ReactNode;
};

export function HelpArticleLink({ link, className }: { link: HelpLink; className?: string }) {
  return (
    <Link
      to={link.to}
      hash={link.hash}
      className={className ?? "text-primary hover:underline inline-flex items-center gap-0.5"}
    >
      {link.label}
      {link.hash ? null : <ChevronRight className="h-3 w-3 opacity-60" />}
    </Link>
  );
}

export function HelpLayout({ title, subtitle, route, children, actions }: Props) {
  const related = HELP_RELATED[route] ?? [];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border/60 bg-card/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild className="gap-1.5 shrink-0">
            <Link to="/help">
              <ArrowLeft className="h-4 w-4" /> ศูนย์ช่วยเหลือ
            </Link>
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="text-sm font-semibold truncate">{title}</h1>
            {subtitle ? (
              <p className="text-[11px] text-muted-foreground truncate">{subtitle}</p>
            ) : null}
          </div>
        </div>
      </header>

      <div className="flex-1 max-w-5xl mx-auto w-full px-4 py-8">
        <div className="lg:grid lg:grid-cols-[200px_1fr] lg:gap-8 lg:items-start">
          <aside className="hidden lg:block sticky top-20 space-y-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              คู่มือทั้งหมด
            </p>
            <nav className="space-y-0.5 text-xs">
              {HELP_GUIDES.map((g) => (
                <Link
                  key={g.to}
                  to={g.to}
                  className={[
                    "block rounded-md px-2 py-1.5 transition-colors",
                    g.to === route
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:text-primary hover:bg-muted/50",
                  ].join(" ")}
                >
                  {g.title}
                </Link>
              ))}
              <Link
                to="/help"
                className="block rounded-md px-2 py-1.5 text-muted-foreground hover:text-primary hover:bg-muted/50 mt-2"
              >
                ← กลับศูนย์ช่วยเหลือ
              </Link>
            </nav>
          </aside>

          <main className="space-y-6 min-w-0">
            {children}

            {actions ? <div className="flex flex-col sm:flex-row gap-3 pt-2">{actions}</div> : null}

            {related.length > 0 && (
              <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
                <p className="text-xs font-semibold text-muted-foreground mb-2">อ่านต่อ</p>
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  {related.map((link) => (
                    <HelpArticleLink
                      key={`${link.to}-${link.hash ?? ""}-${link.label}`}
                      link={link}
                    />
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-2 pt-2 lg:hidden">
              <Button asChild variant="outline" size="sm">
                <Link to="/help">← กลับศูนย์ช่วยเหลือ</Link>
              </Button>
              <Button asChild variant="ghost" size="sm">
                <Link to="/dashboard">เปิด My Desk</Link>
              </Button>
            </div>
          </main>
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}
