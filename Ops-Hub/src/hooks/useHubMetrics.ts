import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/db";
import { anthemAdmin, so1oAdmin } from "@/lib/links";

export type HubView = "all" | "so1o" | "an1hem";

export interface HubAlert {
  id: string;
  app: "so1o" | "an1hem";
  severity: "high" | "medium";
  label: string;
  count: number;
  href: string;
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
}

const since = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString();
const sinceDays = (d: number) => new Date(Date.now() - d * 86_400_000).toISOString();

function buildAlerts(m: Omit<HubMetrics, "alerts">): HubAlert[] {
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
    label: "AML flags",
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
    label: "คำขอ Collab",
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

  return out.sort((a, b) => (a.severity === "high" ? -1 : 1) - (b.severity === "high" ? -1 : 1));
}

export function useHubMetrics() {
  return useQuery<HubMetrics>({
    queryKey: ["hub-metrics"],
    refetchInterval: 30_000,
    queryFn: async () => {
      const [
        users,
        proUsers,
        newUsers,
        tickets,
        earlyPending,
        quotes7d,
        projects,
        jobs,
        hiring,
        collabs,
        reports,
        cashouts,
        kyc,
        aml,
        feedback,
      ] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("profiles").select("*", { count: "exact", head: true }).eq("subscription_tier", "pro"),
        supabase.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", since(24)),
        supabase
          .from("support_tickets")
          .select("*", { count: "exact", head: true })
          .or("status.eq.new,status.eq.in_progress,status.eq.qa,status.eq.resolved"),
        supabase.from("tester_applications").select("*", { count: "exact", head: true }),
        supabase.from("quotations").select("*", { count: "exact", head: true }).gte("created_at", sinceDays(7)),
        supabase.from("projects").select("*", { count: "exact", head: true }).eq("status", "Published"),
        supabase.from("job_posts").select("*", { count: "exact", head: true }).eq("status", "open"),
        supabase.from("hiring_requests").select("*", { count: "exact", head: true }).eq("status", "ใหม่"),
        supabase.from("collab_requests").select("*", { count: "exact", head: true }).eq("status", "ใหม่"),
        supabase.from("user_reports").select("*", { count: "exact", head: true }).in("status", ["open", "reviewing"]),
        supabase.from("cashout_requests").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("kyc_requests").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("aml_flags").select("*", { count: "exact", head: true }).eq("status", "open"),
        supabase.from("app_feedback").select("*", { count: "exact", head: true }),
      ]);

      const core = {
        so1o: {
          totalUsers: users.count ?? 0,
          proUsers: proUsers.count ?? 0,
          newUsers24h: newUsers.count ?? 0,
          openTickets: tickets.count ?? 0,
          earlyAccessPending: earlyPending.count ?? 0,
          quotations7d: quotes7d.count ?? 0,
        },
        an1hem: {
          publishedProjects: projects.count ?? 0,
          openJobs: jobs.count ?? 0,
          pendingHiring: hiring.count ?? 0,
          pendingCollabs: collabs.count ?? 0,
          openReports: reports.count ?? 0,
          pendingCashouts: cashouts.count ?? 0,
          pendingKyc: kyc.count ?? 0,
          openAml: aml.count ?? 0,
          openFeedback: feedback.count ?? 0,
        },
      };

      // #region agent log
      fetch("http://127.0.0.1:7706/ingest/3280a2f8-8fa2-40c7-88fc-16d5430418e8", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "88285d" },
        body: JSON.stringify({
          sessionId: "88285d",
          runId: "post-fix",
          hypothesisId: "A",
          location: "useHubMetrics.ts:queryFn",
          message: "hub metrics query errors",
          data: {
            feedback: feedback.error?.message ?? null,
            feedbackCount: feedback.count,
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion

      return { ...core, alerts: buildAlerts(core) };
    },
  });
}

export function filterAlerts(alerts: HubAlert[], view: HubView) {
  if (view === "all") return alerts;
  return alerts.filter((a) => a.app === view);
}
