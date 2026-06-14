import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/db";

export type FunnelFlow = {
  id: string;
  label: string;
  direction: string;
  clicks: number;
  converted: number;
  stuck: number;
};

export type EcosystemFunnelData = {
  days: number;
  since: string;
  flows: FunnelFlow[];
  totals: {
    clicks_24h: number;
    clicks_7d: number;
    converted_7d: number;
    stuck_48h: number;
  };
};

async function fetchLinksFallback(days: number): Promise<EcosystemFunnelData> {
  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  const { data, error } = await supabase
    .from("ecosystem_links")
    .select("id, source_app, source_page, meta, created_at")
    .eq("event_type", "cross_link_click")
    .gte("created_at", new Date(Date.now() - 90 * 86_400_000).toISOString())
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) throw error;

  const rows = data ?? [];
  const flowMap = new Map<string, FunnelFlow>();

  const classify = (sourceApp: string, sourcePage: string | null) => {
    if (sourceApp === "anthem" && (sourcePage ?? "").includes("hire")) {
      return { id: "anthem_hire_quotation", label: "an1hem จ้าง → So1o ใบเสนอราคา", direction: "anthem_to_so1o" };
    }
    if (sourceApp === "anthem") {
      return { id: "anthem_to_so1o", label: "an1hem → So1o", direction: "anthem_to_so1o" };
    }
    if (sourceApp === "so1o" && (sourcePage ?? "").includes("post_anthem")) {
      return { id: "so1o_job_portfolio", label: "So1o งานเสร็จ → an1hem โพสต์", direction: "so1o_to_anthem" };
    }
    if (sourceApp === "so1o") {
      return { id: "so1o_to_anthem", label: "So1o → an1hem", direction: "so1o_to_anthem" };
    }
    return { id: "other", label: "อื่นๆ", direction: "other" };
  };

  const now = Date.now();
  let clicks24h = 0;
  let clicks7d = 0;
  let converted7d = 0;
  let stuck48h = 0;

  for (const row of rows) {
    const created = new Date(String(row.created_at)).getTime();
    const meta = (row.meta ?? {}) as Record<string, unknown>;
    const converted = meta.converted_at != null;
    const ageH = (now - created) / 3_600_000;

    if (ageH <= 24) clicks24h++;
    if (ageH <= 168) {
      clicks7d++;
      if (converted) converted7d++;
    }
    if (!converted && ageH >= 48 && ageH <= 720) stuck48h++;

    const c = classify(String(row.source_app), row.source_page ? String(row.source_page) : null);
    const existing = flowMap.get(c.id) ?? { ...c, clicks: 0, converted: 0, stuck: 0 };
    if (created >= new Date(since).getTime()) {
      existing.clicks++;
      if (converted) existing.converted++;
      if (!converted && ageH >= 48) existing.stuck++;
    }
    flowMap.set(c.id, existing);
  }

  return {
    days,
    since,
    flows: [...flowMap.values()],
    totals: {
      clicks_24h: clicks24h,
      clicks_7d: clicks7d,
      converted_7d: converted7d,
      stuck_48h: stuck48h,
    },
  };
}

export function useEcosystemFunnel(days = 7) {
  return useQuery({
    queryKey: ["ecosystem-funnel", days],
    queryFn: async (): Promise<EcosystemFunnelData> => {
      const { data, error } = await supabase.rpc("admin_ecosystem_funnel", { _days: days });
      if (!error && data) {
        const parsed = data as {
          days: number;
          since: string;
          flows: FunnelFlow[];
          totals: EcosystemFunnelData["totals"];
        };
        return {
          days: parsed.days ?? days,
          since: parsed.since ?? "",
          flows: (parsed.flows ?? []).map((f) => ({
            id: f.id,
            label: f.label,
            direction: f.direction,
            clicks: Number(f.clicks ?? 0),
            converted: Number(f.converted ?? 0),
            stuck: Number(f.stuck ?? 0),
          })),
          totals: {
            clicks_24h: Number(parsed.totals?.clicks_24h ?? 0),
            clicks_7d: Number(parsed.totals?.clicks_7d ?? 0),
            converted_7d: Number(parsed.totals?.converted_7d ?? 0),
            stuck_48h: Number(parsed.totals?.stuck_48h ?? 0),
          },
        };
      }
      return fetchLinksFallback(days);
    },
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}

export function useSsoMetrics() {
  return useQuery({
    queryKey: ["sso-metrics"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_sso_metrics");
      if (error) throw error;
      return data as {
        dual_app_users: number;
        pro_dual_app_users: number;
        anthem_only_users: number;
        so1o_only_users: number;
        sso_status: string;
        note: string;
      };
    },
    refetchInterval: 120_000,
    retry: 1,
  });
}
