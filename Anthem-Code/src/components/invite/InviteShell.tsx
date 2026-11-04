import type { ReactNode } from "react";
import { ArrowUpRight, Check, ChevronDown, Globe } from "lucide-react";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { PageLang } from "@/lib/creatorInvite";
import { PAGE_LANGS, type InviteCopy } from "@/lib/creatorInviteCopy";

export function LangMenu({ lang, onChange, label }: { lang: PageLang; onChange: (l: PageLang) => void; label: string }) {
  const current = PAGE_LANGS.find((l) => l.id === lang) ?? PAGE_LANGS[0];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 gap-1.5 rounded-full px-3" aria-label={`${label}: ${current.label}`}>
          <Globe className="h-4 w-4" aria-hidden />
          <span className="text-xs font-semibold">{current.short}</span>
          <ChevronDown className="h-3.5 w-3.5 opacity-70" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[9rem]">
        {PAGE_LANGS.map((l) => (
          <DropdownMenuItem key={l.id} lang={l.id} onSelect={() => onChange(l.id)} className="justify-between">
            {l.label}
            {l.id === lang ? <Check className="h-4 w-4" aria-hidden /> : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Page frame for the private invitation pages: logo, "Get in touch" (→ /learn, new tab), language menu. */
export function InviteShell({
  lang,
  onLang,
  t,
  children,
}: {
  lang: PageLang;
  onLang: (l: PageLang) => void;
  t: InviteCopy;
  children: ReactNode;
}) {
  return (
    <main id="main-content" lang={lang} className="min-h-[calc(100vh-4rem)] bg-background pb-28">
      <header className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 pt-5 sm:px-6">
        <a href="/" target="_blank" rel="noopener" aria-label="SAMECOR">
          <BrandLogo tone="theme" className="shrink-0" />
        </a>
        <nav className="flex shrink-0 items-center gap-1 sm:gap-2" aria-label={t.getInTouch}>
          {/* New tab so the invitation (and any form progress) stays open behind it */}
          <a
            href="/learn"
            target="_blank"
            rel="noopener"
            className="inline-flex h-9 items-center gap-1 whitespace-nowrap rounded-full px-2 text-xs font-medium text-foreground hover:bg-secondary sm:px-3 sm:text-sm"
          >
            {t.getInTouch} <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
          </a>
          <LangMenu lang={lang} onChange={onLang} label={t.language} />
        </nav>
      </header>
      {children}
    </main>
  );
}

export function InviteStateCard({
  title,
  body,
  explore,
  children,
}: {
  title: string;
  body: string;
  /** Pass the copy to show the Explore links under the message. */
  explore?: InviteCopy;
  children?: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-xl px-4 py-16 text-center sm:py-24">
      <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">{title}</h1>
      {body ? <p className="mt-3 text-sm text-muted-foreground">{body}</p> : null}
      {children ? <div className="mt-6 flex justify-center gap-3">{children}</div> : null}
      {explore ? (
        <div className="mt-8 flex flex-wrap justify-center gap-2">
          {explore.exploreCards.map(([label, , href]) => (
            <a key={href} href={href} className="inline-flex items-center gap-1 rounded-full border border-border px-4 py-2 text-sm hover:border-foreground/40">
              {label} <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
            </a>
          ))}
        </div>
      ) : null}
    </div>
  );
}
