import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { opsDb } from "@/integrations/supabase/opsDb";

export type OpsDevTask = {
  id: string;
  issue_number: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  labels: string[];
  source_type: string | null;
  updated_at: string;
  created_at: string;
};

const APP_SCOPE = "an1hem" as const;

export function useOpsDevTasks() {
  return useQuery({
    queryKey: ["ops-dev-tasks", APP_SCOPE],
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data: project, error: projectError } = await opsDb
        .from("projects")
        .select("id, name")
        .eq("app_scope", APP_SCOPE)
        .maybeSingle();
      if (projectError) throw projectError;
      if (!project?.id) return { project: null, tasks: [] as OpsDevTask[] };

      const { data, error } = await opsDb
        .from("issues")
        .select(
          "id, issue_number, title, description, status, priority, labels, source_type, updated_at, created_at",
        )
        .eq("project_id", project.id)
        .not("status", "eq", "cancelled")
        .order("updated_at", { ascending: false });

      if (error) throw error;
      return {
        project: project as { id: string; name: string },
        tasks: (data ?? []) as OpsDevTask[],
      };
    },
  });
}

export function useUpdateOpsDevTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await opsDb.from("issues").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["ops-dev-tasks", APP_SCOPE] });
    },
  });
}
