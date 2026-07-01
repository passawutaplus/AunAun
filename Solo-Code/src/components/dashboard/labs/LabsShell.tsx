import * as React from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { ArrowLeft, FlaskConical } from "lucide-react";
import { NotificationBell } from "@/components/NotificationBell";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { Toaster } from "@/components/ui/sonner";
import { useAuth } from "@/auth/AuthProvider";
import { cn } from "@/lib/utils";
import { ProductTourHeaderButton } from "@/components/dashboard/ProductTourProvider";

const TABS = [
  { to: "/labs/creative" as const, label: "ครีเอทีฟ" },
  { to: "/labs/doc" as const, label: "เอกสาร" },
] as const;

export function LabsShell({ children }: { children: React.ReactNode }) {
  const { profile } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isHub = pathname === "/labs" || pathname === "/labs/";

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="ambient-blobs" aria-hidden="true" />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[420px] -z-0"
        aria-hidden="true"
        style={{ backgroundImage: "var(--gradient-mesh)" }}
      />

      <header className="sticky top-0 z-30 glass border-b border-white/40">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <Link
              to="/dashboard"
              className="h-9 w-9 rounded-xl bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors shrink-0"
              aria-label="กลับไปหน้า Dashboard"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="h-9 w-9 rounded-xl bg-gradient-primary text-primary-foreground flex items-center justify-center shadow-soft ring-1 ring-white/60 shrink-0">
              <FlaskConical className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm sm:text-base font-semibold leading-none tracking-tight truncate">
                So1o <span className="text-primary">Labs</span>
              </h1>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 truncate">
                เครื่องมือเสริม — ใช้เมื่อสะดวก
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <ProductTourHeaderButton />
            <NotificationBell />
            <div className="hidden sm:flex items-center gap-2 rounded-full bg-white/70 backdrop-blur px-3 py-1.5 text-xs text-primary font-medium border border-primary/20">
              <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
              {profile?.brand_name || profile?.display_name || "เชื่อมต่อแล้ว"}
            </div>
          </div>
        </div>
        {!isHub && (
          <div className="mx-auto max-w-6xl px-4 pb-3">
            <nav
              className="inline-flex rounded-xl border border-border/60 bg-muted/30 p-1 gap-1"
              aria-label="Labs categories"
            >
              <Link
                to="/labs"
                className="inline-flex items-center rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-card/50"
              >
                หน้าหลัก
              </Link>
              {TABS.map((tab) => {
                const active = pathname.startsWith(tab.to);
                return (
                  <Link
                    key={tab.to}
                    to={tab.to}
                    className={cn(
                      "inline-flex items-center rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                      active
                        ? "bg-card text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground hover:bg-card/50",
                    )}
                  >
                    {tab.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        )}
      </header>

      <main className="relative z-10 mx-auto max-w-6xl px-3 sm:px-4 py-4 sm:py-7">{children}</main>

      <SiteFooter variant="minimal" />
      <Toaster position="top-center" richColors />
    </div>
  );
}
