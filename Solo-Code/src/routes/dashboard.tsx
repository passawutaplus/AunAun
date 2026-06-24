import { createFileRoute } from "@tanstack/react-router";
import { RouteError } from "@/components/RouteError";
import * as React from "react";
import { Toaster } from "@/components/ui/sonner";
import { FinanceProvider } from "@/store/finance";
import { RequireAuth } from "@/auth/RequireAuth";
import { useAuth } from "@/auth/AuthProvider";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { Link } from "@tanstack/react-router";
import { FlaskConical } from "lucide-react";
import { DashboardSidebar, type DashSection } from "@/components/dashboard/layout/DashboardSidebar";
import { PipelineNewDealButton } from "@/components/dashboard/layout/PipelineNewDealButton";
import { BottomNav } from "@/components/dashboard/layout/BottomNav";
import { DashboardCommandMenu } from "@/components/dashboard/DashboardCommandMenu";
import { NotificationBell } from "@/components/NotificationBell";

import { SubscriptionStatusBanner } from "@/components/dashboard/SubscriptionStatusBanner";
import { CheckoutSuccessHandler } from "@/components/dashboard/CheckoutSuccessHandler";
import {
  OverviewSkeleton,
  FinanceSkeleton,
  PlannerSkeleton,
  MyDataSkeleton,
  SettingsSkeleton,
} from "@/components/dashboard/skeletons/TabSkeletons";

const HomeTab = React.lazy(() =>
  import("@/components/dashboard/HomeTab").then((m) => ({ default: m.HomeTab })),
);
const OverviewTab = React.lazy(() =>
  import("@/components/dashboard/OverviewTab").then((m) => ({ default: m.OverviewTab })),
);
const FinanceTab = React.lazy(() =>
  import("@/components/dashboard/FinanceTab").then((m) => ({ default: m.FinanceTab })),
);
const PlannerTab = React.lazy(() =>
  import("@/components/dashboard/PlannerTab").then((m) => ({ default: m.PlannerTab })),
);
const MyDataTab = React.lazy(() =>
  import("@/components/dashboard/MyDataTab").then((m) => ({ default: m.MyDataTab })),
);
const SettingsTab = React.lazy(() =>
  import("@/components/dashboard/SettingsTab").then((m) => ({ default: m.SettingsTab })),
);

import { trackFeature } from "@/lib/featureUsage";
import {
  buildStudioQuotationHandoffFromParams,
  parseAnthemDashboardParams,
  parseStudioDashboardParams,
  STUDIO_DASHBOARD_PARAM_KEYS,
  storeAnthemQuotationHandoff,
  storeStudioQuotationHandoff,
} from "@/lib/ecosystemHandoff";
import { supabase } from "@/integrations/supabase/client";
import { AnnouncementBanner } from "@/components/AnnouncementBanner";
import { DashboardBannerSlider } from "@/components/DashboardBannerSlider";
import { useTrackActivity } from "@/hooks/useTrackActivity";
import { useLogActivity } from "@/hooks/useLogActivity";
import { useDailyTrendsPrefetch } from "@/hooks/useDailyTrendsPrefetch";
import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";
import logoUrl from "@/assets/solo-freelancer-logo.webp";

const untypedSupabase = supabase as unknown as {
  from: (table: string) => any;
};

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "My Desk — หลังบ้านฟรีแลนซ์ | So1o Freelancer" },
      {
        name: "description",
        content:
          "บริหารจัดการรายได้ ค่าสมาชิก ภาษี ลูกค้า โปรเจกต์ และคอนเทนต์ในที่เดียว สำหรับฟรีแลนซ์ไทย",
      },
      { name: "robots", content: "noindex,nofollow" },
      { property: "og:title", content: "My Desk — หลังบ้านฟรีแลนซ์" },
      { property: "og:description", content: "ติดตามรายได้ ภาษี VAT และค่าสมาชิกแบบครบวงจร" },
      { property: "og:url", content: "https://solofreelancer.com/dashboard" },
      { property: "og:image", content: logoUrl },
    ],
    links: [{ rel: "canonical", href: "https://solofreelancer.com/dashboard" }],
  }),
  errorComponent: ({ error }) => <RouteError error={error} />,
  component: () => (
    <RequireAuth>
      <Dashboard />
    </RequireAuth>
  ),
});

const VALID_SECTIONS: DashSection[] = [
  "home",
  "overview",
  "finance",
  "planner",
  "mydata",
  "settings",
];

function parseDashSection(tab: string | null): DashSection {
  if (tab === "trends" || tab === "inspire") return "home";
  if (tab && VALID_SECTIONS.includes(tab as DashSection)) return tab as DashSection;
  return "overview";
}

const SECTION_FALLBACK: Record<DashSection, string> = {
  home: "Home",
  overview: "Dashboard",
  finance: "Quotation",
  planner: "Content",
  mydata: "ลูกค้า",
  settings: "ตั้งค่า",
};

const SUB_TITLES: Partial<Record<DashSection, Record<string, string>>> = {
  finance: {
    pipeline: "Pipeline",
    quotations: "Quotation",
    jobs: "Job Tracker",
    income: "รายได้",
    tax: "ภาษี",
    subs: "Subscription",
  },
  planner: {
    content: "ปฏิทินคอนเทนต์",
    projects: "To Do List",
    briefs: "Smart Brief",
    meetings: "Meeting",
    feedback: "Feedback ลูกค้า",
  },
  mydata: {
    clients: "ลูกค้า",
    suppliers: "Suppliers",
    portfolio: "Portfolio",
    assets: "Assets",
    legal: "Legal Desk",
  },
};

function getSectionTitle(section: DashSection, sub?: string): string {
  const subMap = SUB_TITLES[section];
  if (sub && subMap && subMap[sub]) return subMap[sub];
  return SECTION_FALLBACK[section];
}

const DEFAULT_SUBS: Record<DashSection, string | undefined> = {
  home: undefined,
  overview: undefined,
  finance: "quotations",
  planner: "content",
  mydata: "clients",
  settings: undefined,
};

function Dashboard() {
  const { profile, user } = useAuth();
  const [section, setSection] = React.useState<DashSection>(() => {
    if (typeof window === "undefined") return "overview";
    return parseDashSection(new URLSearchParams(window.location.search).get("tab"));
  });
  const [sub, setSub] = React.useState<string | undefined>(() => {
    if (typeof window === "undefined") return undefined;
    const sp = new URLSearchParams(window.location.search);
    return sp.get("sub") ?? undefined;
  });
  const updateSection = React.useCallback((next: DashSection | string, nextSub?: string) => {
    const resolvedSection = parseDashSection(next);
    setSection(resolvedSection);
    const resolvedSub = nextSub ?? DEFAULT_SUBS[resolvedSection];
    setSub(resolvedSub);
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", resolvedSection);
      if (resolvedSub) url.searchParams.set("sub", resolvedSub);
      else url.searchParams.delete("sub");
      window.history.replaceState({}, "", url.toString());
    }
  }, []);

  const studioUrlHandoffRef = React.useRef(false);

  useTrackActivity(user?.id);
  useLogActivity(user?.id, "dashboard_view");
  useDailyTrendsPrefetch();

  // Legacy deep links: ?tab=trends|inspire → home
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const tab = new URLSearchParams(window.location.search).get("tab");
    if (tab === "trends" || tab === "inspire") {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", "home");
      if (tab === "inspire") url.hash = "inspire";
      else if (tab === "trends") url.hash = "news";
      window.history.replaceState({}, "", url.toString());
      setSection("home");
    }
  }, []);

  React.useEffect(() => {
    trackFeature(`dashboard.${section}`);
  }, [section]);

  // Anthem → So1o studio combined quote deep-link handoff
  React.useEffect(() => {
    if (typeof window === "undefined" || !user?.id) return;
    if (studioUrlHandoffRef.current) return;
    const studioParams = parseStudioDashboardParams(window.location.search);
    if (!studioParams.fromStudio) return;
    studioUrlHandoffRef.current = true;

    void (async () => {
      const payload = buildStudioQuotationHandoffFromParams(studioParams);
      if (!payload) return;

      storeStudioQuotationHandoff(payload);

      if (studioParams.linkId) {
        await supabase
          .from("ecosystem_links")
          .update({
            meta: { converted_at: new Date().toISOString(), target: "studio_quotation_handoff" },
          })
          .eq("id", studioParams.linkId);
      }

      updateSection("finance", "quotations");
      const url = new URL(window.location.href);
      ["from", ...STUDIO_DASHBOARD_PARAM_KEYS].forEach((k) => url.searchParams.delete(k));
      window.history.replaceState({}, "", url.toString());
    })();
  }, [updateSection, user?.id]);

  // Anthem → So1o solo quotation deep-link handoff
  React.useEffect(() => {
    if (typeof window === "undefined" || !user?.id) return;
    if (new URLSearchParams(window.location.search).get("handoff") === "studio") return;
    const params = parseAnthemDashboardParams(window.location.search);
    if (!params.fromAnthem) return;

    void (async () => {
      let clientName = params.clientName;
      let projectTitle = params.projectTitle;
      let clientEmail = params.clientEmail;
      let clientPhone = params.clientPhone;
      let message = params.message;
      let deadline = params.deadline;
      let requestId = params.requestId;

      if (params.requestId) {
        const { data: hire } = await untypedSupabase
          .from("hiring_requests")
          .select("id, client_name, email, phone, message, deadline, project_title, budget_amount")
          .eq("id", params.requestId)
          .eq("freelancer_id", user.id)
          .maybeSingle();
        if (hire) {
          clientName = hire.client_name ?? clientName;
          projectTitle = hire.project_title ?? projectTitle;
          clientEmail = hire.email ?? clientEmail;
          clientPhone = hire.phone ?? clientPhone;
          message = hire.message ?? message;
          deadline = hire.deadline ?? deadline;
          requestId = hire.id;
        }
      }

      const notesParts: string[] = [];
      if (message) notesParts.push(message);
      if (deadline) notesParts.push(`กำหนดส่ง: ${deadline}`);
      if (params.conversationId) notesParts.push(`แชท Pixel100: ${params.conversationId}`);

      storeAnthemQuotationHandoff({
        projectName: projectTitle || "งานจาก Pixel100",
        clientName: clientName || "ลูกค้า Pixel100",
        clientEmail,
        clientPhone,
        endDate: deadline,
        notes: notesParts.length ? notesParts.join("\n\n") : undefined,
        ecosystemLinkId: params.linkId,
        conversationId: params.conversationId,
        requestId,
      });

      if (params.linkId) {
        const ownsLink =
          !requestId ||
          (
            await untypedSupabase
              .from("hiring_requests")
              .select("id")
              .eq("id", requestId)
              .eq("freelancer_id", user.id)
              .maybeSingle()
          ).data != null;

        if (ownsLink) {
          await supabase
            .from("ecosystem_links")
            .update({
              meta: { converted_at: new Date().toISOString(), target: "quotation_handoff" },
            })
            .eq("id", params.linkId);
        }
      }

      updateSection("finance", "quotations");
      const url = new URL(window.location.href);
      [
        "from",
        "conversation_id",
        "request_id",
        "client_name",
        "project_title",
        "client_email",
        "client_phone",
        "message",
        "deadline",
        "link_id",
      ].forEach((k) => url.searchParams.delete(k));
      window.history.replaceState({}, "", url.toString());
    })();
  }, [updateSection, user?.id]);

  return (
    <FinanceProvider>
      <OnboardingFlow />
      <SidebarProvider>
        <div className="relative min-h-screen flex w-full bg-background">
          <DashboardSidebar active={section} activeSub={sub} setActive={updateSection} />

          <SidebarInset className="flex-1 min-w-0 flex flex-col">
            {/* Top bar */}
            <header className="sticky top-0 z-20 border-b border-border/40 bg-background/40 backdrop-blur-xl supports-[backdrop-filter]:bg-background/40">
              <SubscriptionStatusBanner />
              <CheckoutSuccessHandler />
              <div className="flex items-center justify-between gap-3 px-3 sm:px-5 py-2">
                <div className="flex items-center gap-2 min-w-0">
                  <SidebarTrigger className="shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] text-muted-foreground leading-tight">
                      สวัสดี, {profile?.display_name || profile?.brand_name || "เพื่อนฟรีแลนซ์"} 👋
                    </p>
                    <h1 className="text-sm sm:text-base font-semibold leading-tight truncate">
                      {getSectionTitle(section, sub)}
                    </h1>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <PipelineNewDealButton
                    variant="header-icon"
                    onNavigate={(tab, sub) => updateSection(tab as DashSection, sub)}
                  />
                  <Link
                    to="/labs"
                    className="inline-flex items-center gap-1.5 rounded-full bg-gradient-primary text-primary-foreground px-3 py-1.5 text-xs font-semibold border border-primary/30 shadow-soft hover:shadow-elevated hover:-translate-y-0.5 transition-all"
                    aria-label="เปิด So1o Creative Labs"
                  >
                    <FlaskConical className="h-3.5 w-3.5" /> Labs
                  </Link>
                  <NotificationBell />
                </div>
              </div>
            </header>

            <div className="flex-1 flex min-w-0">
              <main className="relative flex-1 min-w-0 overflow-x-hidden">
                <div className="ambient-blobs" aria-hidden="true" />
                <div className="relative z-10 mx-auto w-full max-w-6xl px-3 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
                  <DashboardBannerSlider />
                  <div className="animate-fade-in">
                    {section === "home" && (
                      <React.Suspense fallback={<OverviewSkeleton />}>
                        <HomeTab />
                      </React.Suspense>
                    )}
                    {section === "overview" && (
                      <React.Suspense fallback={<OverviewSkeleton />}>
                        <OverviewTab onGo={(t, s) => updateSection(t as DashSection, s)} />
                      </React.Suspense>
                    )}
                    {section === "finance" && (
                      <React.Suspense fallback={<FinanceSkeleton />}>
                        <FinanceTab
                          sub={(sub as any) ?? "quotations"}
                          onMoneySubChange={(s) => updateSection("finance", s)}
                          onSubChange={(s) => updateSection("finance", s)}
                          onGoTab={updateSection}
                        />
                      </React.Suspense>
                    )}
                    {section === "planner" && (
                      <React.Suspense fallback={<PlannerSkeleton />}>
                        <PlannerTab sub={(sub as any) ?? "content"} />
                      </React.Suspense>
                    )}
                    {section === "mydata" && (
                      <React.Suspense fallback={<MyDataSkeleton />}>
                        <MyDataTab sub={(sub as any) ?? "clients"} onNavigate={updateSection} />
                      </React.Suspense>
                    )}
                    {section === "settings" && (
                      <React.Suspense fallback={<SettingsSkeleton />}>
                        <SettingsTab />
                      </React.Suspense>
                    )}
                  </div>
                  <div className="mt-6">
                    <AnnouncementBanner />
                  </div>
                </div>
                {/* Bottom safe-area spacer so content isn't hidden behind BottomNav on mobile */}
                <div
                  className="md:hidden h-[calc(env(safe-area-inset-bottom)+64px)]"
                  aria-hidden="true"
                />
              </main>
            </div>
          </SidebarInset>

          {/* Mobile bottom navigation (PWA-friendly) */}
          <BottomNav
            active={section}
            activeSub={sub}
            onSelect={(s, nextSub) => updateSection(s, nextSub)}
          />
          <DashboardCommandMenu onNavigate={updateSection} />

          {/* AI chat FAB: DraggableFabDock in __root. Support + สร้างดีล: sidebar footer */}

          <Toaster position="top-center" richColors />
        </div>
      </SidebarProvider>
    </FinanceProvider>
  );
}
