import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PROJECT_FEED_SELECT } from "@/lib/dbSelects";

export type ChatPortfolioProject = {
  id: string;
  title: string;
  cover_url: string | null;
  category: string | null;
  tags?: string[] | null;
};

const FETCH_LIMIT = 60;

export function useChatPortfolio(userId: string | undefined) {
  return useQuery({
    queryKey: ["chat-portfolio-all", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select(PROJECT_FEED_SELECT)
        .eq("owner_id", userId!)
        .eq("status", "Published")
        .order("is_pinned", { ascending: false })
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false })
        .limit(FETCH_LIMIT);
      if (error) throw error;
      return (data ?? []) as ChatPortfolioProject[];
    },
  });
}
