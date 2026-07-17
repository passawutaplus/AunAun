import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface AdminAlertCounts {
  openReports: number;
  pendingCashouts: number;
  pendingKyc: number;
  openAml: number;
  highRiskKyc: number;
  urgentReports: number;
  /** Omise payout queue + failed */
  financePayoutQueue: number;
  /** Unprocessed / errored provider webhooks */
  financeWebhookIssues: number;
  openFinanceDisputes: number;
}

export function useAdminAlertCounts() {
  return useQuery<AdminAlertCounts>({
    queryKey: ["admin-alert-counts"],
    refetchInterval: 30_000,
    queryFn: async () => {
      const [reports, cashouts, kyc, aml, kycHigh, urgent, financeOv] = await Promise.all([
        supabase.from("user_reports" as never).select("*", { count: "exact", head: true }).in("status", ["open", "reviewing"]),
        supabase.from("cashout_requests").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("kyc_requests").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("aml_flags").select("*", { count: "exact", head: true }).eq("status", "open"),
        supabase
          .from("kyc_requests")
          .select("*", { count: "exact", head: true })
          .eq("status", "pending")
          .gt("ai_risk_score", 40),
        supabase
          .from("user_reports" as never)
          .select("*", { count: "exact", head: true })
          .in("status", ["open", "reviewing"])
          .or("ai_priority.gte.70,ai_recommendation.eq.urgent"),
        supabase.rpc("admin_finance_overview" as never),
      ]);

      let financePayoutQueue = 0;
      let financeWebhookIssues = 0;
      let openFinanceDisputes = 0;
      if (!financeOv.error && financeOv.data && typeof financeOv.data === "object") {
        const o = financeOv.data as {
          payout_queued_count?: number;
          payout_failed_count?: number;
          webhook_unprocessed_count?: number;
          open_disputes?: number;
        };
        financePayoutQueue = (o.payout_queued_count ?? 0) + (o.payout_failed_count ?? 0);
        financeWebhookIssues = o.webhook_unprocessed_count ?? 0;
        openFinanceDisputes = o.open_disputes ?? 0;
      }

      return {
        openReports: reports.count ?? 0,
        pendingCashouts: cashouts.count ?? 0,
        pendingKyc: kyc.count ?? 0,
        openAml: aml.count ?? 0,
        highRiskKyc: kycHigh.count ?? 0,
        urgentReports: urgent.count ?? 0,
        financePayoutQueue,
        financeWebhookIssues,
        openFinanceDisputes,
      };
    },
  });
}

/** Toast + invalidate when new report/cashout admin notifications arrive. */
export function useAdminAlertWatcher() {
  const qc = useQueryClient();
  const seenRef = useRef<Set<string>>(new Set());
  const [banner, setBanner] = useState<{ title: string; link: string } | null>(null);

  useEffect(() => {
    const ch = supabase
      .channel("admin-alerts")
      .on("postgres_changes", { event: "INSERT", schema: "shared", table: "notifications" }, (payload) => {
        const n = payload.new as { id: string; kind: string; title: string; link: string };
        if (!n.kind?.startsWith("admin_")) return;
        if (seenRef.current.has(n.id)) return;
        seenRef.current.add(n.id);
        toast.info(n.title, { description: "เปิดหน้าแอดมินเพื่อดูรายละเอียด", duration: 8000 });
        setBanner({ title: n.title, link: n.link || "/admin" });
        qc.invalidateQueries({ queryKey: ["admin-alert-counts"] });
        qc.invalidateQueries({ queryKey: ["admin-stats"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  return { banner, dismissBanner: () => setBanner(null) };
}
