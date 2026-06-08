import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/db";
import {
  mapAppFeedback,
  mapFeatureSuggestion,
  mapOpsIssue,
  mapSupportTicket,
  mapUserReport,
  type WorkItem,
} from "@/lib/work-items";

async function fetchWorkItems(): Promise<WorkItem[]> {
  const [tickets, suggestions, feedback, reports, opsIssues] = await Promise.all([
    supabase
      .from("support_tickets")
      .select("*")
      .in("status", ["new", "in_progress", "qa", "resolved"])
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("feature_suggestions")
      .select("*")
      .in("status", ["new", "reviewing", "planned"])
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("app_feedback")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("user_reports")
      .select("*")
      .in("status", ["open", "reviewing"])
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("issues")
      .select("*, projects(app_scope, name)")
      .in("status", ["backlog", "todo", "in_progress", "in_review"])
      .order("created_at", { ascending: false })
      .limit(200),
  ]);

  // #region agent log
  fetch("http://127.0.0.1:7706/ingest/3280a2f8-8fa2-40c7-88fc-16d5430418e8", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "88285d" },
    body: JSON.stringify({
      sessionId: "88285d",
      runId: "post-fix",
      hypothesisId: "A",
      location: "useWorkItems.ts:fetchWorkItems",
      message: "work item query errors",
      data: {
        tickets: tickets.error?.message ?? null,
        suggestions: suggestions.error?.message ?? null,
        feedback: feedback.error?.message ?? null,
        reports: reports.error?.message ?? null,
        opsIssues: opsIssues.error?.message ?? null,
      },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion

  const coreErrors = [tickets.error, suggestions.error, feedback.error, reports.error].filter(Boolean);
  if (coreErrors.length > 0) throw new Error(coreErrors[0]!.message);

  const items: WorkItem[] = [
    ...(tickets.data ?? []).map((r) => mapSupportTicket(r as Record<string, unknown>)),
    ...(suggestions.data ?? []).map((r) => mapFeatureSuggestion(r as Record<string, unknown>)),
    ...(feedback.data ?? []).map((r) => mapAppFeedback(r as Record<string, unknown>)),
    ...(reports.data ?? []).map((r) => mapUserReport(r as Record<string, unknown>)),
  ];

  if (!opsIssues.error && opsIssues.data) {
    for (const row of opsIssues.data) {
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
  }

  return items.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

export function useWorkItems() {
  return useQuery({
    queryKey: ["work-items"],
    queryFn: fetchWorkItems,
    refetchInterval: 30_000,
    staleTime: 15_000,
  });
}
