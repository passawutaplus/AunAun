import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { DBProject } from "@/hooks/useProjects";
import { MAX_PINNED_PROJECTS } from "@/lib/portfolioSort";

export function usePortfolioOrder(userId: string | undefined) {
  const qc = useQueryClient();

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["my-projects", userId] });
    qc.invalidateQueries({ queryKey: ["public-projects"] });
  };

  const pin = useMutation({
    mutationFn: async ({ id, projects }: { id: string; projects: DBProject[] }) => {
      const pinned = projects.filter((p) => p.is_pinned && p.id !== id);
      if (pinned.length >= MAX_PINNED_PROJECTS) {
        throw new Error(`ปักหมุดได้สูงสุด ${MAX_PINNED_PROJECTS} ผลงาน`);
      }
      const { error } = await supabase.from("projects").update({ is_pinned: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const unpin = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("projects").update({ is_pinned: false }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const reorder = useMutation({
    mutationFn: async (orderedIds: string[]) => {
      const updates = orderedIds.map((id, index) =>
        supabase.from("projects").update({ sort_order: index }).eq("id", id),
      );
      const results = await Promise.all(updates);
      const err = results.find((r) => r.error)?.error;
      if (err) throw err;
    },
    onSuccess: invalidate,
  });

  return { pin, unpin, reorder };
}
