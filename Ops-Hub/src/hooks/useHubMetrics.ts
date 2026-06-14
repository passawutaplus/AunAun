import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/db";
import { safeCount } from "@/lib/resilient-query";
import { anthemAdmin, so1oAdmin } from "@/lib/links";

export type HubView = "all" | "so1o" | "an1hem";

export interface HubAlert {
  id: string;
  app: "so1o" | "an1hem" | "ecosystem";
  severity: "high" | "medium";
  label: string;
  count: number;
  href: string;
  external?: boolean;
}

export interface HubMetrics {
  so1o: {
    totalUsers: number;
    proUsers: number;
    newUsers24h: number;
    openTickets: number;
    earlyAccessPending: number;
    quotations7d: number;
  };
  an1hem: {
    publishedProjects: number;
    openJobs: number;
    pendingHiring: number;
    pendingCollabs: number;
    openReports: number;
    pendingCashouts: number;
    pendingKyc: number;
    openAml: number;
    openFeedback: number;
  };
  alerts: HubAlert[];
  degradedSources?: string[];
  partial?: boolean;
}

const since = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString();
const sinceDays = (d: number) => new Date(Date.now() - d * 86_400_000).toISOString();

function buildAlerts(
  m: Omit<HubMetrics, "alerts" | "degradedSources" | "partial">,
  funnel?: { stuck_48h: number; clicks_7d: number; converted_7d: number },
): HubAlert[] {
  const out: HubAlert[] = [];
  const push = (a: HubAlert) => {
    if (a.count > 0) out.push(a);
  };

  push({
    id: "so1o-tickets",
    app: "so1o",
    severity: "high",
    label: "ตั๋ว Support เปิดอยู่",
    count: m.so1o.openTickets,
    href: so1oAdmin("tickets"),
  });
  push({
    id: "so1o-early",
    app: "so1o",
    severity: "medium",
    label: "Early Access รออนุมัติ",
    count: m.so1o.earlyAccessPending,
    href: so1oAdmin("early_access"),
  });
  push({
    id: "an1hem-reports",
    app: "an1hem",
    severity: "high",
    label: "รายงานเนื้อหา",
    count: m.an1hem.openReports,
    href: anthemAdmin("/reports"),
  });
  push({
    id: "an1hem-cashout",
    app: "an1hem",
    severity: "high",
    label: "คำขอถอน Pixel",
    count: m.an1hem.pendingCashouts,
    href: anthemAdmin("/gifts"),
  });
  push({
    id: "an1hem-kyc",
    app: "an1hem",
    severity: "high",
    label: "KYC รอตรวจ",
    count: m.an1hem.pendingKyc,
    href: anthemAdmin("/kyc"),
  });
  push({
    id: "an1hem-aml",
    app: "an1hem",
    severity: "high",
    label: "AML ต้องดู",
    count: m.an1hem.openAml,
    href: anthemAdmin("/aml"),
  });
  push({
    id: "an1hem-hiring",
    app: "an1hem",
    severity: "medium",
    label: "คำขอจ้างใหม่",
    count: m.an1hem.pendingHiring,
    href: anthemAdmin("/hiring"),
  });
  push({
    id: "an1hem-collab",
    app: "an1hem",
    severity: "medium",
    label: "คำขอร่วมงาน",
    count: m.an1hem.pendingCollabs,
    href: anthemAdmin("/collabs"),
  });
  push({
    id: "an1hem-feedback",
    app: "an1hem",
    severity: "medium",
    label: "ฟีดแบ็กใหม่",
    count: m.an1hem.openFeedback,
    href: anthemAdmin("/feedback"),
  });

  if (funnel?.stuck_48h) {
    push({
      id: "eco-stuck",
      app: "ecosystem",
      severity: funnel.stuck_48h >= 5 ? "high" : "medium",
      label: "Cross-link ค้าง >48h",
      count: funnel.stuck_48h,
      href: "/connections",
      external: false,
    });
  }

  const rate =
    funnel && funnel.clicks_7d > 0 ? (funnel.converted_7d / funnel.clicks_7d) * 100 : 100;
  if (funnel && funnel.clicks_7d >= 5 && rate < 15) {
    push({
      id: "eco-conversion",
      app: "ecosystem",
      severity: "medium",
      label: "Flywheel conversion ต่ำ",
      count: Math.round(rate),
      href: "/connections",
      external: false,
    });
  }

  return out.sort((a, b) => (a.severity === "high" ? -1 : 1) - (b.severity === "high" ? -1 : 1));
}

export function useHubMetrics() {
  return useQuery<HubMetrics>({
    queryKey: ["hub-metrics"],
    refetchInterval: 30_000,
    queryFn: async () => {
      const results = await Promise.all([
        safeCount("profiles", supabase.from("profiles").select("*", { count: "exact", head: true })),
        safeCount(
          "profiles_pro",
          supabase.from("profiles").select("*", { count: "exact", head: true }).eq("subscription_tier", "pro"),
        ),
        safeCount(
          "profiles_new",
          supabase.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", since(24)),
        ),
        safeCount(
          "support_tickets",
          supabase
            .from("support_tickets")
            .select("*", { count: "exact", head: true })
            .or("status.eq.new,status.eq.in_progress,status.eq.qa,status.eq.resolved"),
        ),
        safeCount(
          "tester_applications",
          supabase.from("tester_applications").select("*", { count: "exact", head: true }),
        ),
        safeCount(
          "quotations",
          supabase.from("quotations").select("*", { count: "exact", head: true }).gte("created_at", sinceDays(7)),
        ),
        safeCount(
          "projects",
          supabase.from("projects").select("*", { count: "exact", head: true }).eq("status", "Published"),
        ),
        safeCount(
          "job_posts",
          supabase.from("job_posts").select("*", { count: "exact", head: true }).eq("status", "open"),
        ),
        safeCount(
          "hiring_requests",
          supabase.from("hiring_requests").select("*", { count: "exact", head: true }).eq("status", "ใหม่"),
        ),
        safeCount(
          "collab_requests",
          supabase.from("collab_requests").select("*", { count: "exact", head: true }).eq("status", "ใหม่"),
        ),
        safeCount(
          "user_reports",
          supabase
            .from("user_reports")
            .select("*", { count: "exact", head: true })
            .in("status", ["open", "reviewing"]),
        ),
        safeCount(
          "cashout_requests",
          supabase.from("cashout_requests").select("*", { count: "exact", head: true }).eq("status", "pending"),
        ),
        safeCount(
          "kyc_requests",
          supabase.from("kyc_requests").select("*", { count: "exact", head: true }).eq("status", "pending"),
        ),
        safeCount(
          "aml_flags",
          supabase.from("aml_flags").select("*", { count: "exact", head: true }).eq("status", "open"),
        ),
        safeCount(
          "app_feedback",
          supabase.from("app_feedback").select("*", { count: "exact", head: true }),
        ),
      ]);

      const degradedSources = results.filter((r) => r.error).map((r) => r.source);
      const n = (i: number) => results[i]?.data ?? 0;

      const core = {
        so1o: {
          totalUsers: n(0),
          proUsers: n(1),
          newUsers24h: n(2),
          openTickets: n(3),
          earlyAccessPending: n(4),
          quotations7d: n(5),
        },
        an1hem: {
          publishedProjects: n(6),
          openJobs: n(7),
          pendingHiring: n(8),
          pendingCollabs: n(9),
          openReports: n(10),
          pendingCashouts: n(11),
          pendingKyc: n(12),
          openAml: n(13),
          openFeedback: n(14),
        },
      };

      let funnelTotals: { stuck_48h: number; clicks_7d: number; converted_7d: number } | undefined;
      try {
        const { data: funnelData } = await supabase.rpc("admin_ecosystem_funnel", { _days: 7 });
        if (funnelData?.totals) {
          funnelTotals = {
            stuck_48h: Number(funnelData.totals.stuck_48h ?? 0),
            clicks_7d: Number(funnelData.totals.clicks_7d ?? 0),
            converted_7d: Number(funnelData.totals.converted_7d ?? 0),
          };
        }
      } catch {
        /* optional */
      }

      return {
        ...core,
        alerts: buildAlerts(core, funnelTotals),
        degradedSources: degradedSources.length ? degradedSources : undefined,
        partial: degradedSources.length > 0,
      };
    },
  });
}

export function filterAlerts(alerts: HubAlert[], view: HubView) {
  if (view === "all") return alerts;
  if (view === "so1o") return alerts.filter((a) => a.app === "so1o");
  return alerts.filter((a) => a.app === "an1hem");
}
