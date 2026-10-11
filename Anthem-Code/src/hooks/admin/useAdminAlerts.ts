import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { KYC_HIGH_RISK_THRESHOLD } from "@/lib/reportAiTriage";

/** Sources the database does not have yet (undefined table / function). Remembered per page load so we stop calling them. */
const unavailableSources = new Set<string>();

function isMissingObject(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false;
  return (
    ["42P01", "42883", "PGRST200", "PGRST202", "PGRST205"].includes(error.code ?? "") ||
    /does not exist|could not find the (table|function)/i.test(error.message ?? "")
  );
}

/** Run one counter; a missing table/function marks the source unavailable instead of hitting it every 30 s. */
export async function countSource(
  source: string,
  run: () => PromiseLike<{ count: number | null; error: { code?: string; message?: string } | null }>,
): Promise<number> {
  if (unavailableSources.has(source)) return 0;
  const res = await run();
  if (isMissingObject(res.error)) {
    unavailableSources.add(source);
    return 0;
  }
  return res.count ?? 0;
}

export interface AdminAlertCounts {
  openReports: number;
  pendingCashouts: number;
  pendingKyc: number;
  openAml: number;
  highRiskKyc: number;
  urgentReports: number;
  /** Payout queue + failed */
  financePayoutQueue: number;
  /** Unprocessed / errored provider webhooks */
  financeWebhookIssues: number;
  openFinanceDisputes: number;
  /** Counter sources that are not in the database yet (see lib/admin/adminDbGaps.ts). */
  unavailable: string[];
}

export function useAdminAlertCounts() {
  return useQuery<AdminAlertCounts>({
    queryKey: ["admin-alert-counts"],
    refetchInterval: 30_000,
    retry: 1,
    queryFn: async () => {
      const [reports, cashouts, kyc, aml, kycHigh, urgent, financeOv] = await Promise.all([
        countSource("reports", () =>
          supabase.from("user_reports" as never).select("*", { count: "exact", head: true }).in("status", ["open", "reviewing"]),
        ),
        countSource("cashouts", () =>
          supabase.from("cashout_requests").select("*", { count: "exact", head: true }).eq("status", "pending"),
        ),
        countSource("kyc", () => supabase.from("kyc_requests").select("*", { count: "exact", head: true }).eq("status", "pending")),
        countSource("aml", () => supabase.from("aml_flags").select("*", { count: "exact", head: true }).eq("status", "open")),
        countSource("kyc-high-risk", () =>
          supabase
            .from("kyc_requests")
            .select("*", { count: "exact", head: true })
            .eq("status", "pending")
            .lt("ai_risk_score", KYC_HIGH_RISK_THRESHOLD),
        ),
        countSource("reports-urgent", () =>
          supabase
            .from("user_reports" as never)
            .select("*", { count: "exact", head: true })
            .in("status", ["open", "reviewing"])
            .or("ai_priority.gte.70,ai_recommendation.eq.urgent"),
        ),
        unavailableSources.has("finance")
          ? Promise.resolve({ data: null, error: null })
          : supabase.rpc("admin_finance_overview" as never),
      ]);

      let financePayoutQueue = 0;
      let financeWebhookIssues = 0;
      let openFinanceDisputes = 0;
      if (isMissingObject(financeOv.error)) unavailableSources.add("finance");
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
        openReports: reports,
        pendingCashouts: cashouts,
        pendingKyc: kyc,
        openAml: aml,
        highRiskKyc: kycHigh,
        urgentReports: urgent,
        financePayoutQueue,
        financeWebhookIssues,
        openFinanceDisputes,
        unavailable: [...unavailableSources],
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
