import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** Cover image per project id, for notification thumbnails. Missing / hidden projects simply have no entry. */
export function useProjectCovers(ids: string[]) {
  const sortedIds = [...new Set(ids)].sort();
  return useQuery({
    queryKey: ["projects", "covers", sortedIds],
    enabled: sortedIds.length > 0,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("id, cover_url").in("id", sortedIds);
      if (error) throw error;
      const map: Record<string, string> = {};
      for (const row of (data ?? []) as { id: string; cover_url: string | null }[]) {
        if (row.cover_url) map[row.id] = row.cover_url;
      }
      return map;
    },
  });
}
