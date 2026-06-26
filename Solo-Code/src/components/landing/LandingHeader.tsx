import { Link } from "@tanstack/react-router";
import {
  LayoutDashboard,
  LogIn,
  ShieldCheck,
  Sparkles,
  Calculator,
  LayoutGrid,
  ListChecks,
  BookOpen,
  Briefcase,
  ExternalLink,
  Moon,
  Sun,
  Menu,
  HelpCircle,
  Tag,
} from "lucide-react";
import { ANTHEM_SHOWCASE_URL } from "@/lib/productLinks";
import { LANDING_COPY } from "@/data/landingContent";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { NotificationBell } from "@/components/NotificationBell";
import { LineHeaderButton } from "@/components/LineContactButton";
import { Button } from "@/components/ui/button";
import logoUrl from "@/assets/solo-freelancer-logo.webp";

type Props = {
  user: boolean;
  isAdmin: boolean;
  theme: string;
  onToggleTheme: () => void;
};

export function LandingHeader({ user, isAdmin, theme, onToggleTheme }: Props) {
  return (
    <header className="sticky top-0 z-30 glass border-b border-border">
      <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between gap-3">
        <Link to="/" className="flex items-center gap-2.5 shrink-0 min-w-0">
          <img
            src={logoUrl}
            alt="So1o Freelancer logo"
            width={36}
            height={36}
            loading="eager"
            decoding="async"
            fetchPriority="high"
            className="h-9 w-9 rounded-xl object-cover shadow-soft ring-1 ring-border shrink-0"
          />
          <div className="min-w-0">
            <p className="text-sm sm:text-base font-semibold leading-none tracking-tight truncate">
              So<span className="text-primary">1</span>o Freelancer
            </p>
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 truncate hidden sm:block">
              {LANDING_COPY.tagline}
            </p>
          </div>
        </Link>

        <nav className="hidden lg:flex items-center gap-4 text-sm text-muted-foreground">
          <a href="#features" className="hover:text-foreground transition-colors">
            ฟีเจอร์
          </a>
          <a href="#calculator" className="hover:text-foreground transition-colors">
            คำนวณราคา
          </a>
          <Link to="/pricing" className="hover:text-foreground transition-colors">
            ราคา
          </Link>
          <Link to="/help" className="hover:text-foreground transition-colors">
            ช่วยเหลือ
          </Link>
          <Link to="/blog" className="hover:text-foreground transition-colors">
            Blog
          </Link>
        </nav>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={onToggleTheme}
            aria-label={theme === "dark" ? "สลับเป็นโหมดสว่าง" : "สลับเป็นโหมดมืด"}
            className="h-8 w-8 rounded-full"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <LineHeaderButton />
          {user && <NotificationBell />}
          {isAdmin && (
            <Link
              to="/admin"
              search={{ section: undefined, q: undefined }}
              className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-foreground text-background px-3 py-2 text-xs font-semibold hover:bg-foreground/90 transition-colors"
            >
              <ShieldCheck className="h-3.5 w-3.5" /> Admin
            </Link>
          )}
          {user ? (
            <Link
              to="/dashboard"
              className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-gradient-primary text-primary-foreground px-3.5 py-2 text-xs font-semibold shadow-elevated hover:opacity-90 transition-opacity"
            >
              <LayoutDashboard className="h-3.5 w-3.5" />
              Dashboard
            </Link>
          ) : (
            <Link
              to="/auth"
              search={{ redirect: undefined }}
              className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-gradient-primary text-primary-foreground px-3.5 py-2 text-xs font-semibold shadow-elevated hover:opacity-90 transition-opacity"
            >
              <LogIn className="h-3.5 w-3.5" /> เข้าสู่ระบบ
            </Link>
          )}

          <Sheet>
            <SheetTrigger asChild>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                aria-label="เปิดเมนู"
                className="lg:hidden h-8 w-8 rounded-full"
              >
                <Menu className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px] glass border-l border-border">
              <SheetHeader>
                <SheetTitle className="text-left text-base">เมนู</SheetTitle>
              </SheetHeader>
              <nav className="mt-6 flex flex-col gap-1 text-sm">
                <a
                  href="#features"
                  className="px-3 py-2.5 rounded-lg hover:bg-accent transition-colors flex items-center gap-2.5"
                >
                  <Sparkles className="h-4 w-4 text-primary" /> ฟีเจอร์
                </a>
                <a
                  href="#calculator"
                  className="px-3 py-2.5 rounded-lg hover:bg-accent transition-colors flex items-center gap-2.5"
                >
                  <Calculator className="h-4 w-4 text-primary" /> คำนวณราคา
                </a>
                <Link
                  to="/pricing"
                  className="px-3 py-2.5 rounded-lg hover:bg-accent transition-colors flex items-center gap-2.5"
                >
                  <Tag className="h-4 w-4 text-primary" /> ราคา
                </Link>
                <Link
                  to="/help"
                  className="px-3 py-2.5 rounded-lg hover:bg-accent transition-colors flex items-center gap-2.5"
                >
                  <HelpCircle className="h-4 w-4 text-primary" /> ช่วยเหลือ
                </Link>
                <Link
                  to="/blog"
                  className="px-3 py-2.5 rounded-lg hover:bg-accent transition-colors flex items-center gap-2.5"
                >
                  <BookOpen className="h-4 w-4 text-primary" /> Blog
                </Link>
                <a
                  href="#showcase"
                  className="px-3 py-2.5 rounded-lg hover:bg-accent transition-colors flex items-center gap-2.5"
                >
                  <LayoutGrid className="h-4 w-4 text-primary" /> โชว์เคส
                </a>
                <a
                  href={ANTHEM_SHOWCASE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-2.5 rounded-lg hover:bg-accent transition-colors flex items-center gap-2.5"
                >
                  <ExternalLink className="h-4 w-4 text-primary" /> Aplus1 Showcase
                </a>
                <a
                  href="#how"
                  className="px-3 py-2.5 rounded-lg hover:bg-accent transition-colors flex items-center gap-2.5"
                >
                  <ListChecks className="h-4 w-4 text-primary" /> วิธีใช้
                </a>
                <Link
                  to="/creative-partner"
                  className="px-3 py-2.5 rounded-lg hover:bg-accent transition-colors flex items-center gap-2.5"
                >
                  <Briefcase className="h-4 w-4 text-primary" /> Creative Partner
                </Link>
                <div className="my-2 border-t border-border" />
                {isAdmin && (
                  <Link
                    to="/admin"
                    search={{ section: undefined, q: undefined }}
                    className="px-3 py-2.5 rounded-lg hover:bg-accent transition-colors flex items-center gap-2.5"
                  >
                    <ShieldCheck className="h-4 w-4 text-primary" /> Admin
                  </Link>
                )}
                {user ? (
                  <Link
                    to="/dashboard"
                    className="mt-2 inline-flex items-center justify-center gap-1.5 rounded-full bg-gradient-primary text-primary-foreground px-4 py-2.5 text-xs font-semibold shadow-elevated"
                  >
                    <LayoutDashboard className="h-3.5 w-3.5" /> เข้าสู่ Dashboard
                  </Link>
                ) : (
                  <Link
                    to="/auth"
                    search={{ redirect: undefined }}
                    className="mt-2 inline-flex items-center justify-center gap-1.5 rounded-full bg-gradient-primary text-primary-foreground px-4 py-2.5 text-xs font-semibold shadow-elevated"
                  >
                    <LogIn className="h-3.5 w-3.5" /> เข้าสู่ระบบ
                  </Link>
                )}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
