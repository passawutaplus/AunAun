import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { RouteError } from "@/components/RouteError";
import { RequireAuth } from "@/auth/RequireAuth";
import { useAuth } from "@/auth/AuthProvider";
import { ArrowLeft, FlaskConical, ShieldCheck } from "lucide-react";
import { Toaster } from "@/components/ui/sonner";
import { LabsTabLazy } from "@/components/dashboard/labs/LabsTabLazy";
import { NotificationBell } from "@/components/NotificationBell";

import { useTrackActivity } from "@/hooks/useTrackActivity";
import { useLogActivity } from "@/hooks/useLogActivity";
import { markLabsVisited } from "@/lib/designDrillStorage";
import logoUrl from "@/assets/solo-freelancer-logo.webp";
import { SiteFooter } from "@/components/layout/SiteFooter";

export const Route = createFileRoute("/labs")({
  head: () => ({
    meta: [
      { title: "So1o Creative Labs — ห้องทดลองนักออกแบบ | So1o Freelancer" },
      {
        name: "description",
        content:
          "Color Lab สำหรับฟรีแลนซ์สายดีไซน์ — ทดลองสี ตรวจ contrast export Tailwind บันทึกพาเลท และใช้สีใน Smart Brief",
      },
      { name: "robots", content: "noindex,nofollow" },
      { property: "og:title", content: "So1o Creative Labs — ห้องทดลองนักออกแบบ" },
      {
        property: "og:description",
        content: "ทดลองสี บันทึกพาเลท และ export โค้ดสำหรับงานดีไซน์",
      },
      { property: "og:url", content: "https://solofreelancer.com/labs" },
      { property: "og:image", content: logoUrl },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: logoUrl },
    ],
    links: [{ rel: "canonical", href: "https://solofreelancer.com/labs" }],
  }),
  errorComponent: ({ error }) => <RouteError error={error} />,
  component: () => (
    <RequireAuth>
      <LabsPage />
    </RequireAuth>
  ),
});

function LabsPage() {
  const { isAdmin, profile, user } = useAuth();
  useTrackActivity(user?.id);
  useLogActivity(user?.id, "labs_view");

  React.useEffect(() => {
    markLabsVisited();
  }, []);

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
                So1o <span className="text-primary">Creative Labs</span>
              </h1>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 truncate">
                ห้องทดลองสำหรับนักออกแบบ
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <NotificationBell />

            {isAdmin && (
              <Link
                to="/admin"
                search={{ section: undefined, q: undefined }}
                className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-foreground text-background px-3 py-1.5 text-xs font-medium hover:bg-foreground/90 transition-colors"
              >
                <ShieldCheck className="h-3.5 w-3.5" /> Admin
              </Link>
            )}
            <div className="hidden sm:flex items-center gap-2 rounded-full bg-white/70 backdrop-blur px-3 py-1.5 text-xs text-primary font-medium border border-primary/20">
              <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
              {profile?.brand_name || profile?.display_name || "เชื่อมต่อแล้ว"}
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-6xl px-3 sm:px-4 py-4 sm:py-7">
        <LabsTabLazy />
      </main>

      <SiteFooter variant="minimal" />
      <Toaster position="top-center" richColors />
    </div>
  );
}
