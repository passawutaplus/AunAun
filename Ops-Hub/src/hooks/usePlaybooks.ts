import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { opsDb } from "@/integrations/supabase/db";

export type PlaybookRun = {
  id: string;
  playbook_id: string;
  status: string;
  notes: string | null;
  completed_at: string | null;
  created_at: string;
};

export function usePlaybookRuns() {
  return useQuery({
    queryKey: ["playbook-runs"],
    queryFn: async () => {
      const { data, error } = await opsDb
        .from("playbook_runs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error?.code === "PGRST205") return [] as PlaybookRun[];
      if (error) throw error;
      return (data ?? []) as PlaybookRun[];
    },
  });
}

export function useCompletePlaybookRun() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { playbookId: string; notes?: string }) => {
      const { error } = await opsDb.from("playbook_runs").insert({
        playbook_id: input.playbookId,
        status: "done",
        notes: input.notes ?? null,
        completed_at: new Date().toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["playbook-runs"] }),
  });
}

export function useEcosystemSettings() {
  return useQuery({
    queryKey: ["ecosystem-settings"],
    queryFn: async () => {
      const { data, error } = await opsDb.from("settings").select("key, value").in("key", [
        "ecosystem_flags",
        "sso_baseline",
      ]);
      if (error?.code === "PGRST205") return {};
      if (error) throw error;
      const out: Record<string, unknown> = {};
      for (const row of data ?? []) {
        out[String(row.key)] = row.value;
      }
      return out;
    },
  });
}
