import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/db";
import { safeRows } from "@/lib/resilient-query";
import { buildEcosystemAnomalies } from "@/lib/ecosystem-anomalies";
import type { EcosystemFunnelData } from "@/hooks/useEcosystemFunnel";
import {
  mapAppFeedback,
  mapFeatureSuggestion,
  mapOpsIssue,
  mapSupportTicket,
  mapUserReport,
  type WorkItem,
} from "@/lib/work-items";

export type WorkItemsResult = {
  items: WorkItem[];
  degradedSources: string[];
};

async function fetchEcosystemFunnelBrief(): Promise<EcosystemFunnelData | undefined> {
  try {
    const { data, error } = await supabase.rpc("admin_ecosystem_funnel", { _days: 7 });
    if (error || !data) return undefined;
    const parsed = data as {
      flows: EcosystemFunnelData["flows"];
      totals: EcosystemFunnelData["totals"];
    };
    return {
      days: 7,
      since: "",
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
  } catch {
    return undefined;
  }
}

async function fetchWorkItems(): Promise<WorkItemsResult> {
  const [tickets, suggestions, feedback, reports, opsIssues, funnel] = await Promise.all([
    safeRows(
      "support_tickets",
      supabase
        .from("support_tickets")
        .select("*")
        .in("status", ["new", "in_progress", "qa", "resolved"])
        .order("created_at", { ascending: false })
        .limit(200),
    ),
    safeRows(
      "feature_suggestions",
      supabase
        .from("feature_suggestions")
        .select("*")
        .in("status", ["new", "reviewing", "planned"])
        .order("created_at", { ascending: false })
        .limit(100),
    ),
    safeRows(
      "app_feedback",
      supabase
        .from("app_feedback")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100),
    ),
    safeRows(
      "user_reports",
      supabase
        .from("user_reports")
        .select("*")
        .in("status", ["open", "reviewing"])
        .order("created_at", { ascending: false })
        .limit(100),
    ),
    safeRows(
      "ops_issues",
      supabase
        .from("issues")
        .select("*, projects(app_scope, name)")
        .in("status", ["backlog", "todo", "in_progress", "in_review"])
        .order("created_at", { ascending: false })
        .limit(200),
    ),
    fetchEcosystemFunnelBrief(),
  ]);

  const degradedSources: string[] = [];
  for (const r of [tickets, suggestions, feedback, reports, opsIssues]) {
    if (r.error) degradedSources.push(r.source);
  }

  const items: WorkItem[] = [
    ...(tickets.data ?? []).map((row) => mapSupportTicket(row as Record<string, unknown>)),
    ...(suggestions.data ?? []).map((row) => mapFeatureSuggestion(row as Record<string, unknown>)),
    ...(feedback.data ?? []).map((row) => mapAppFeedback(row as Record<string, unknown>)),
    ...(reports.data ?? []).map((row) => mapUserReport(row as Record<string, unknown>)),
  ];

  for (const row of opsIssues.data ?? []) {
    const r = row as Record<string, unknown>;
    const projects = r.projects as { app_scope?: string } | { app_scope?: string }[] | null;
    const project = Array.isArray(projects) ? projects[0] : projects;
    items.push(
      mapOpsIssue({
        ...r,
        project_app_scope: project?.app_scope ?? "ecosystem",
      }),
    );
  }

  items.push(...buildEcosystemAnomalies(funnel));

  items.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  return { items, degradedSources };
}

export function useWorkItems() {
  return useQuery({
    queryKey: ["work-items"],
    queryFn: fetchWorkItems,
    refetchInterval: 30_000,
    staleTime: 15_000,
  });
}
