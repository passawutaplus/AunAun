import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { RouteError } from "@/components/RouteError";
import * as React from "react";
import { useAuth } from "@/auth/AuthProvider";
import { RequireAuth } from "@/auth/RequireAuth";
import { Toaster } from "@/components/ui/sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { ShieldCheck, LogOut, Loader2 } from "lucide-react";
import { AdminSidebar, isAdminSection, type AdminSection } from "@/components/admin/AdminSidebar";
import { LineHeaderButton } from "@/components/LineContactButton";
import { useAdminMetrics } from "@/components/admin/useAdminMetrics";
import { useAllTickets } from "@/store/supportTickets";
import { useAllBetaFeedback } from "@/store/betaFeedback";
import { useIsMobile } from "@/hooks/use-mobile";

// Lazy-load heavy section panels — only fetch the chunk when the tab is opened.
const OverviewSection = React.lazy(() =>
  import("@/components/admin/OverviewSection").then((m) => ({ default: m.OverviewSection })),
);
const UsersSection = React.lazy(() =>
  import("@/components/admin/UsersSection").then((m) => ({ default: m.UsersSection })),
);
const BusinessSection = React.lazy(() =>
  import("@/components/admin/BusinessSection").then((m) => ({ default: m.BusinessSection })),
);
const HealthSection = React.lazy(() =>
  import("@/components/admin/HealthSection").then((m) => ({ default: m.HealthSection })),
);
const UsageSection = React.lazy(() =>
  import("@/components/admin/UsageSection").then((m) => ({ default: m.UsageSection })),
);
const SupabaseConnectionSection = React.lazy(() =>
  import("@/components/admin/SupabaseConnectionSection").then((m) => ({
    default: m.SupabaseConnectionSection,
  })),
);
const EarlyAccessSection = React.lazy(() =>
  import("@/components/admin/EarlyAccessSection").then((m) => ({ default: m.EarlyAccessSection })),
);
const FeatureUsageSection = React.lazy(() =>
  import("@/components/admin/FeatureUsageSection").then((m) => ({
    default: m.FeatureUsageSection,
  })),
);
const AnnouncementsSection = React.lazy(() =>
  import("@/components/admin/AnnouncementsSection").then((m) => ({
    default: m.AnnouncementsSection,
  })),
);
const AdminChatSection = React.lazy(() =>
  import("@/components/admin/AdminChatSection").then((m) => ({ default: m.AdminChatSection })),
);
const AdminTicketsSection = React.lazy(() =>
  import("@/components/admin/AdminTicketsSection").then((m) => ({
    default: m.AdminTicketsSection,
  })),
);
const ActivityAnalyticsSection = React.lazy(() =>
  import("@/components/admin/ActivityAnalyticsSection").then((m) => ({
    default: m.ActivityAnalyticsSection,
  })),
);
const ArticlesSection = React.lazy(() =>
  import("@/components/admin/ArticlesSection").then((m) => ({ default: m.ArticlesSection })),
);
const DeviceAnalyticsSection = React.lazy(() =>
  import("@/components/admin/DeviceAnalyticsSection").then((m) => ({
    default: m.DeviceAnalyticsSection,
  })),
);
const BannersHubSection = React.lazy(() =>
  import("@/components/admin/BannersHubSection").then((m) => ({ default: m.BannersHubSection })),
);
const SubscriptionsHubSection = React.lazy(() =>
  import("@/components/admin/SubscriptionsHubSection").then((m) => ({
    default: m.SubscriptionsHubSection,
  })),
);
const AiHubSection = React.lazy(() =>
  import("@/components/admin/AiHubSection").then((m) => ({ default: m.AiHubSection })),
);
const ActivityFeedSection = React.lazy(() =>
  import("@/components/admin/ActivityFeedSection").then((m) => ({
    default: m.ActivityFeedSection,
  })),
);
const AiUsageSection = React.lazy(() =>
  import("@/components/admin/AiMonitorSection").then((m) => ({ default: m.AiMonitorSection })),
);
const PaymentsSection = React.lazy(() =>
  import("@/components/admin/PaymentsSection").then((m) => ({ default: m.PaymentsSection })),
);
const DevTasksSection = React.lazy(() =>
  import("@/components/admin/DevTasksSection").then((m) => ({ default: m.DevTasksSection })),
);
const EcosystemOpsSection = React.lazy(() =>
  import("@/components/admin/EcosystemOpsSection").then((m) => ({
    default: m.EcosystemOpsSection,
  })),
);

function SectionFallback() {
  return (
    <div className="flex items-center justify-center py-24 text-muted-foreground">
      <Loader2 className="h-5 w-5 animate-spin" />
      <span className="ml-2 text-sm">กำลังโหลด...</span>
    </div>
  );
}

export const Route = createFileRoute("/admin")({
  validateSearch: (search: Record<string, unknown>) => {
    const section = typeof search.section === "string" ? search.section : undefined;
    const q = typeof search.q === "string" ? search.q : undefined;
    return {
      section: isAdminSection(section) ? section : undefined,
      q,
    };
  },
  head: () => ({
    meta: [
      { title: "Mission Control — Admin Monitor | So1o Freelancer" },
      {
        name: "description",
        content: "หน้ามอนิเตอร์สำหรับเจ้าของแอป ดูสมาชิก รายได้ พอร์ต และสุขภาพระบบในที่เดียว",
      },
      { name: "robots", content: "noindex,nofollow" },
      { property: "og:title", content: "Mission Control — Admin Monitor" },
      { property: "og:description", content: "หน้ามอนิเตอร์สำหรับเจ้าของแอป" },
      { property: "og:url", content: "https://solofreelancer.com/admin" },
    ],
    links: [{ rel: "canonical", href: "https://solofreelancer.com/admin" }],
  }),
  errorComponent: ({ error }) => <RouteError error={error} />,
  component: () => (
    <RequireAuth requireAdmin>
      <AdminPage />
    </RequireAuth>
  ),
});

function AdminPage() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const { section: urlSection, q: urlQuery } = Route.useSearch();
  const [active, setActive] = React.useState<AdminSection>(() => urlSection ?? "overview");
  const m = useAdminMetrics();
  const isMobile = useIsMobile();
  const { tickets } = useAllTickets();
  const { items: betaItems } = useAllBetaFeedback();
  const recentBeta = betaItems.filter(
    (b) => Date.now() - new Date(b.createdAt).getTime() < 7 * 86_400_000,
  ).length;
  const attentionTickets = tickets.filter(
    (t) =>
      t.status === "new" ||
      (t.priority === "critical" && !["closed", "wont_fix"].includes(t.status)),
  );
  const ticketBadge = attentionTickets.length + (recentBeta > 0 ? 1 : 0);

  React.useEffect(() => {
    if (urlSection && urlSection !== active) {
      setActive(urlSection);
    }
  }, [urlSection, active]);

  const handleSetActive = React.useCallback(
    (section: AdminSection) => {
      setActive(section);
      void navigate({ to: "/admin", search: { section, q: urlQuery }, replace: true });
    },
    [navigate],
  );

  return (
    <SidebarProvider defaultOpen={!isMobile}>
      <div className="relative min-h-screen flex w-full bg-background overflow-hidden">
        <div className="ambient-blobs" aria-hidden="true" />
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-[420px] -z-0"
          aria-hidden="true"
          style={{ backgroundImage: "var(--gradient-mesh)" }}
        />

        <AdminSidebar
          active={active}
          setActive={handleSetActive}
          onRefresh={m.refresh}
          refreshing={m.loading}
          ticketBadge={ticketBadge}
        />

        <div className="flex-1 flex flex-col min-w-0 relative z-10">
          {/* Top bar */}
          <header className="sticky top-0 z-30 glass border-b border-border">
            <div className="px-3 sm:px-5 py-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <SidebarTrigger className="shrink-0" />
                <div className="min-w-0">
                  <h1 className="text-sm sm:text-base font-semibold leading-none tracking-tight truncate">
                    Mission Control
                  </h1>
                  <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 truncate">
                    {profile?.email} ·{" "}
                    {m.lastFetched
                      ? `อัปเดตล่าสุด ${m.lastFetched.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`
                      : "กำลังเตรียมข้อมูล..."}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <LineHeaderButton />
                <Badge className="bg-foreground text-background gap-1 hidden sm:inline-flex">
                  <ShieldCheck className="h-3 w-3" /> ADMIN
                </Badge>
                <Button asChild size="sm" variant="outline" className="hidden sm:inline-flex h-8">
                  <Link to="/dashboard">My Desk</Link>
                </Button>
                <Button size="sm" variant="ghost" onClick={signOut} aria-label="ออกจากระบบ">
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </header>

          <main className="flex-1 px-3 sm:px-5 py-5 sm:py-7 overflow-x-hidden">
            <div className="max-w-7xl mx-auto animate-fade-in">
              <React.Suspense fallback={<SectionFallback />}>
                {active === "overview" && <OverviewSection m={m} />}
                {active === "dev_tasks" && <DevTasksSection />}
                {active === "activity_feed" && <ActivityFeedSection />}
                {active === "early_access" && <EarlyAccessSection />}
                {active === "users" && <UsersSection m={m} initialQuery={urlQuery ?? ""} />}
                {active === "chat" && <AdminChatSection />}
                {active === "tickets" && <AdminTicketsSection />}
                {active === "announcements" && <AnnouncementsSection />}
                {active === "banners" && <BannersHubSection />}
                {active === "articles" && <ArticlesSection />}
                {active === "business" && <BusinessSection m={m} />}
                {active === "subscriptions" && <SubscriptionsHubSection m={m} />}
                {active === "payments" && <PaymentsSection />}
                {active === "feature_usage" && <FeatureUsageSection />}
                {active === "activity" && <ActivityAnalyticsSection />}
                {active === "device" && <DeviceAnalyticsSection />}
                {active === "ai_usage" && <AiUsageSection />}
                {active === "ecosystem_ops" && <EcosystemOpsSection />}
                {active === "ai_center" && <AiHubSection />}
                {active === "health" && <HealthSection m={m} />}
                {active === "usage" && <UsageSection />}
                {active === "supabase" && <SupabaseConnectionSection />}
              </React.Suspense>
            </div>
          </main>
        </div>

        <Toaster position="top-center" richColors />
      </div>
    </SidebarProvider>
  );
}
