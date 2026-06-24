import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface RecommendedProject {
  id: string;
  title: string;
  category: string;
  owner_id: string;
  gallery_urls: string[] | null;
  cover_url: string | null;
  similarity: number;
}

/** Recommendations derived from the user's image-like history (centroid of liked-project embeddings) */
export const useRecommendedProjects = (userId: string | undefined, limit = 24) =>
  useQuery({
    queryKey: ["recommended-from-likes", userId, limit],
    enabled: !!userId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("recommend_from_likes", {
        _user_id: userId!,
        _limit: limit,
      });
      if (error) throw error;
      return (data ?? []) as RecommendedProject[];
    },
  });
