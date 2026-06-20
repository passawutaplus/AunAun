import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/db";
import { triageReport, KYC_HIGH_RISK_THRESHOLD } from "@/lib/report-ai-triage";

export type TriageKycPreview = {
  id: string;
  user_id: string;
  legal_name: string | null;
  ai_risk_score: number | null;
  ai_summary: string | null;
  ai_recommendation: string | null;
  submitted_at: string;
};

export type TriageReportPreview = {
  id: string;
  reason: string;
  target_type: string;
  ai_priority: number | null;
  ai_summary: string | null;
  ai_recommendation: string | null;
  created_at: string;
};

export type AdminTriageSnapshot = {
  highRiskKyc: number;
  urgentReports: number;
  pendingKyc: number;
  openReports: number;
  kycPreview: TriageKycPreview[];
  reportPreview: TriageReportPreview[];
};

type RpcSnapshot = {
  high_risk_kyc?: number;
  urgent_reports?: number;
  pending_kyc?: number;
  open_reports?: number;
  kyc_preview?: TriageKycPreview[];
  report_preview?: TriageReportPreview[];
};

async function fetchViaRpc(): Promise<AdminTriageSnapshot | null> {
  const { data, error } = await supabase.rpc("admin_triage_snapshot");
  if (error || !data) return null;
  const s = data as RpcSnapshot;
  return {
    highRiskKyc: Number(s.high_risk_kyc ?? 0),
    urgentReports: Number(s.urgent_reports ?? 0),
    pendingKyc: Number(s.pending_kyc ?? 0),
    openReports: Number(s.open_reports ?? 0),
    kycPreview: (s.kyc_preview ?? []) as TriageKycPreview[],
    reportPreview: (s.report_preview ?? []) as TriageReportPreview[],
  };
}

async function fetchViaQueries(): Promise<AdminTriageSnapshot> {
  const [kycHigh, kycList, reports, reportList] = await Promise.all([
    supabase
      .from("kyc_requests")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending")
      .gt("ai_risk_score", KYC_HIGH_RISK_THRESHOLD),
    supabase
      .from("kyc_requests")
      .select("id, user_id, legal_name, ai_risk_score, ai_summary, ai_recommendation, submitted_at")
      .eq("status", "pending")
      .gt("ai_risk_score", KYC_HIGH_RISK_THRESHOLD)
      .order("ai_risk_score", { ascending: false })
      .limit(5),
    supabase
      .from("user_reports")
      .select("*", { count: "exact", head: true })
      .in("status", ["open", "reviewing"]),
    supabase
      .from("user_reports")
      .select("id, reason, target_type, details, evidence_files, ai_priority, ai_summary, ai_recommendation, created_at")
      .in("status", ["open", "reviewing"])
      .order("created_at", { ascending: true })
      .limit(20),
  ]);

  const rawReports = (reportList.data ?? []) as Array<
    TriageReportPreview & { details?: string; evidence_files?: unknown[] }
  >;

  const enriched = rawReports.map((r) => {
    if (r.ai_summary) return r;
    const ev = Array.isArray(r.evidence_files) ? r.evidence_files.length : 0;
    const triage = triageReport({
      reason: r.reason,
      target_type: r.target_type,
      details: r.details,
      evidence_count: ev,
    });
    return {
      ...r,
      ai_priority: triage.priority_score,
      ai_summary: triage.summary,
      ai_recommendation: triage.recommendation,
    };
  });

  enriched.sort((a, b) => (b.ai_priority ?? 0) - (a.ai_priority ?? 0));

  const urgentReports = enriched.filter(
    (r) => (r.ai_priority ?? 0) >= 70 || r.ai_recommendation === "urgent",
  ).length;

  return {
    highRiskKyc: kycHigh.count ?? 0,
    urgentReports,
    pendingKyc: 0,
    openReports: reports.count ?? 0,
    kycPreview: (kycList.data ?? []) as TriageKycPreview[],
    reportPreview: enriched.slice(0, 5),
  };
}

export function useAdminTriage() {
  return useQuery({
    queryKey: ["admin-triage"],
    refetchInterval: 30_000,
    queryFn: async (): Promise<AdminTriageSnapshot> => {
      const rpc = await fetchViaRpc();
      if (rpc) return rpc;
      return fetchViaQueries();
    },
  });
}
