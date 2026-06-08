import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { opsDb, supabase } from "@/integrations/supabase/db";
import type { WorkItem } from "@/lib/work-items";

export type OpsProject = {
  id: string;
  name: string;
  slug: string;
  app_scope: "ecosystem" | "so1o" | "an1hem";
  color: string | null;
};

export type OpsCycle = {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  status: "planned" | "active" | "completed";
};

export type OpsIssue = {
  id: string;
  issue_number: string;
  project_id: string | null;
  cycle_id: string | null;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  assignee_id: string | null;
  labels: string[];
  source_type: string | null;
  source_id: string | null;
  due_date: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  projects?: OpsProject | null;
};

export type RoadmapItem = {
  id: string;
  title: string;
  description: string | null;
  project_id: string | null;
  quarter: string;
  status: string;
  issue_id: string | null;
  projects?: OpsProject | null;
};

export function useOpsProjects() {
  return useQuery({
    queryKey: ["ops-projects"],
    queryFn: async () => {
      const { data, error } = await opsDb.from("projects").select("*").order("name");
      if (error) throw error;
      return (data ?? []) as OpsProject[];
    },
  });
}

export function useOpsCycles() {
  return useQuery({
    queryKey: ["ops-cycles"],
    queryFn: async () => {
      const { data, error } = await opsDb
        .from("cycles")
        .select("*")
        .order("start_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as OpsCycle[];
    },
  });
}

export function useOpsIssues() {
  return useQuery({
    queryKey: ["ops-issues"],
    queryFn: async () => {
      const { data, error } = await opsDb
        .from("issues")
        .select("*, projects(*)")
        .order("updated_at", { ascending: false });

      // #region agent log
      fetch("http://127.0.0.1:7706/ingest/3280a2f8-8fa2-40c7-88fc-16d5430418e8", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "88285d" },
        body: JSON.stringify({
          sessionId: "88285d",
          runId: "post-fix",
          hypothesisId: "C",
          location: "useOpsIssues.ts:useOpsIssues",
          message: "ops issues query",
          data: { code: error?.code ?? null, message: error?.message ?? null },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion

      if (error) throw error;
      return (data ?? []) as OpsIssue[];
    },
    refetchInterval: 30_000,
  });
}

export function useRoadmapItems() {
  return useQuery({
    queryKey: ["ops-roadmap"],
    queryFn: async () => {
      const [roadmap, suggestions] = await Promise.all([
        opsDb.from("roadmap_items").select("*, projects(*)").order("quarter"),
        supabase
          .from("feature_suggestions")
          .select("*")
          .eq("status", "planned")
          .order("created_at", { ascending: false }),
      ]);
      if (roadmap.error) throw roadmap.error;
      return {
        items: (roadmap.data ?? []) as RoadmapItem[],
        plannedSuggestions: suggestions.data ?? [],
      };
    },
  });
}

export function useCreateOpsIssue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      title: string;
      description?: string;
      project_id?: string;
      cycle_id?: string;
      priority?: string;
      status?: string;
    }) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("ไม่ได้ login");
      const { data, error } = await opsDb
        .from("issues")
        .insert({
          title: input.title,
          description: input.description ?? null,
          project_id: input.project_id ?? null,
          cycle_id: input.cycle_id ?? null,
          priority: input.priority ?? "medium",
          status: input.status ?? "backlog",
          created_by: user.user.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data as OpsIssue;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["ops-issues"] });
      void qc.invalidateQueries({ queryKey: ["work-items"] });
    },
  });
}

export function usePromoteWorkItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ item }: { item: WorkItem }) => {
      const { data, error } = await supabase.rpc("ops_promote_work_item", {
        p_source_type: item.source,
        p_source_id: item.sourceId,
        p_title: item.title,
        p_description: item.description,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["ops-issues"] });
      void qc.invalidateQueries({ queryKey: ["work-items"] });
    },
  });
}

export function useUpdateOpsIssue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      patch,
    }: {
      id: string;
      patch: Partial<Pick<OpsIssue, "status" | "priority" | "cycle_id" | "project_id" | "title" | "description">>;
    }) => {
      const { error } = await opsDb.from("issues").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["ops-issues"] });
      void qc.invalidateQueries({ queryKey: ["work-items"] });
    },
  });
}
