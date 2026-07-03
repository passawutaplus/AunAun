import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  enrichCommunityPosts,
  type CommunityPost,
} from "@/hooks/useCommunityPosts";
import { CATALOG_TEXT_COVER_POST_IDS } from "@/lib/communityCatalogIds";
import { fetchCommunityPostRows } from "@/lib/communityPostQuery";
import { postHasCommunityMedia } from "@/lib/communityFeedShowcase";

/** Fetch catalog text-cover posts from DB (when demo seed has been applied). */
export function useCommunityCatalogShowcase(enabled: boolean) {
  return useQuery({
    queryKey: ["community-catalog-showcase"],
    enabled,
    staleTime: 10 * 60 * 1000,
    queryFn: async (): Promise<CommunityPost[]> => {
      const rows = await fetchCommunityPostRows((select, excludeRepostsByColumn) => {
        let q = supabase
          .from("community_posts")
          .select(select)
          .in("id", CATALOG_TEXT_COVER_POST_IDS)
          .eq("status", "published");
        if (excludeRepostsByColumn) q = q.is("quoted_post_id", null);
        return q;
      });
      const posts = await enrichCommunityPosts(rows as CommunityPost[]);
      return posts.filter((p) => !postHasCommunityMedia(p));
    },
  });
}
