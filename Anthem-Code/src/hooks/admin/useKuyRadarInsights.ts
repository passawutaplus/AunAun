import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { DEMO_INSIGHTS } from "@/lib/kuy-radar/demo-data";
import { isKuyTableMissing, newLocalId, readLocalKuyStore, writeLocalKuyStore } from "@/lib/kuy-radar/local-store";
import { runKuyAiTask } from "@/lib/kuy-radar/prompts";
import type { KuyAiTask, KuyInsight, KuyInsightType } from "@/lib/kuy-radar/types";
import { kuyInsightsKey } from "./useKuyRadarBusinesses";

function mapInsight(row: Record<string, unknown>): KuyInsight {
  return row as unknown as KuyInsight;
}

const taskByInsight: Partial<Record<KuyInsightType, KuyAiTask>> = {
  customer: "generate_marketing_insight",
  competitor: "summarize_competitor",
  content: "generate_marketing_insight",
  ads: "generate_ads_plan",
  campaign: "generate_marketing_insight",
  outreach: "generate_outreach_message",
  daily_report: "generate_daily_report",
};

export function useKuyRadarInsights(businessId: string | null) {
  const { data: isAdmin } = useIsAdmin();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: kuyInsightsKey(businessId),
    enabled: isAdmin === true && !!businessId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("kuy_insights")
        .select("*")
        .eq("business_id", businessId!)
        .order("created_at", { ascending: false });
      if (error) {
        if (isKuyTableMissing(error)) {
          const store = readLocalKuyStore();
          let local = store.insights.filter((i) => i.business_id === businessId);
          if (local.length === 0) {
            const seeded = DEMO_INSIGHTS.map((i) => ({ ...i, business_id: businessId }));
            store.insights.push(...seeded);
            writeLocalKuyStore(store);
            local = store.insights.filter((i) => i.business_id === businessId);
          }
          return local.map(mapInsight);
        }
        throw error;
      }
      return (data ?? []).map(mapInsight);
    },
  });

  const runMutation = useMutation({
    mutationFn: async ({
      insightType,
      context,
      title,
    }: {
      insightType: KuyInsightType;
      context: Record<string, string>;
      title: string;
    }) => {
      const task = taskByInsight[insightType] ?? "generate_marketing_insight";
      const output = await runKuyAiTask(task, context, insightType);
      const payload = {
        business_id: businessId!,
        insight_type: insightType,
        title,
        summary: output.summary,
        key_findings: output.keyFindings,
        recommendation: output.recommendedAction,
        confidence_score: output.confidenceScore,
        compliance_note: output.riskComplianceNote,
      };
      const { data, error } = await supabase.from("kuy_insights").insert(payload).select().single();
      if (error) {
        if (isKuyTableMissing(error)) {
          const store = readLocalKuyStore();
          const row = { id: newLocalId(), ...payload, created_at: new Date().toISOString() };
          store.insights.unshift(row);
          writeLocalKuyStore(store);
          return mapInsight(row);
        }
        throw error;
      }
      return mapInsight(data as Record<string, unknown>);
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: kuyInsightsKey(businessId) }),
  });

  return { ...query, insights: query.data ?? [], runInsight: runMutation.mutateAsync, isRunning: runMutation.isPending };
}
