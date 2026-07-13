import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** TEMP local preview — set false before ship. */
export const FORCE_SHOW_FIRST_POST_LABEL = true;

/** True once the user has at least one Published project (first-post CTA collapses). */
export function useHasPublishedProject(userId: string | undefined) {
  return useQuery({
    queryKey: ["has-published-project", userId],
    enabled: !!userId,
    staleTime: 30_000,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("projects")
        .select("id", { count: "exact", head: true })
        .eq("owner_id", userId!)
        .eq("status", "Published");
      if (error) throw error;
      return (count ?? 0) > 0;
    },
  });
}

/** Whether create control should show the "ลงผลงานแรก" pill. */
export function useShowFirstPostLabel(userId: string | undefined) {
  const { data: hasPublishedProject } = useHasPublishedProject(userId);
  if (FORCE_SHOW_FIRST_POST_LABEL) return true;
  if (!userId) return true;
  return hasPublishedProject === false;
}
