import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { opsDb, supabase } from "@/integrations/supabase/db";

export type RadarItem = {
  id: string;
  title: string;
  summary: string | null;
  source: string;
  category: string;
  impact: string;
  effort: string;
  status: string;
  url: string | null;
  issue_id: string | null;
  created_at: string;
  updated_at: string;
};

export function useRadarItems() {
  return useQuery({
    queryKey: ["radar-items"],
    queryFn: async () => {
      const { data, error } = await opsDb
        .from("radar_items")
        .select("*")
        .order("updated_at", { ascending: false });
      if (error?.code === "PGRST205") return [] as RadarItem[];
      if (error) throw error;
      return (data ?? []) as RadarItem[];
    },
    refetchInterval: 60_000,
  });
}

export function useUpdateRadarStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; status: string }) => {
      const { error } = await opsDb
        .from("radar_items")
        .update({ status: input.status, updated_at: new Date().toISOString() })
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["radar-items"] }),
  });
}

export function useCreateRadarItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      title: string;
      summary?: string;
      category?: string;
      impact?: string;
      effort?: string;
    }) => {
      const { error } = await opsDb.from("radar_items").insert({
        title: input.title,
        summary: input.summary ?? null,
        category: input.category ?? "product",
        impact: input.impact ?? "medium",
        effort: input.effort ?? "medium",
        source: "manual",
        status: "new",
      });
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["radar-items"] }),
  });
}

export function usePromoteRadarToIssue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (item: RadarItem) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("ไม่ได้ login");

      const { data: issue, error: issueError } = await opsDb
        .from("issues")
        .insert({
          title: item.title,
          description: item.summary,
          priority: "medium",
          status: "backlog",
          labels: [`radar:${item.id}`],
          source_type: "radar",
          source_id: item.id,
          created_by: user.user.id,
        })
        .select()
        .single();

      if (issueError) throw issueError;

      const { error: radarError } = await opsDb
        .from("radar_items")
        .update({
          issue_id: issue.id,
          status: "accepted",
          updated_at: new Date().toISOString(),
        })
        .eq("id", item.id);

      if (radarError) throw radarError;
      return issue;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["radar-items"] });
      void qc.invalidateQueries({ queryKey: ["ops-issues"] });
      void qc.invalidateQueries({ queryKey: ["work-items"] });
    },
  });
}
