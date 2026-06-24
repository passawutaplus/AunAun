import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { communityHeroImageUrl } from "@/lib/communityMedia";
import { enrichCommunityPosts, type CommunityPost } from "@/hooks/useCommunityPosts";

const POST_SELECT =
  "id, author_id, post_kind, title, body, category, tags, gallery_urls, video_urls, question_topic, status, reply_count, like_count, view_count, created_at, updated_at";

function engagementScore(post: CommunityPost): number {
  return (post.like_count ?? 0) * 3 + (post.view_count ?? 0) + (post.reply_count ?? 0) * 2;
}

/** Top community post with media for Area hero background. */
export function useCommunityHeroPost() {
  return useQuery({
    queryKey: ["community-hero-post"],
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<CommunityPost | null> => {
      const { data, error } = await supabase
        .from("community_posts")
        .select(POST_SELECT)
        .eq("status", "published")
        .order("like_count", { ascending: false })
        .limit(40);
      if (error) throw error;
      const rows = await enrichCommunityPosts((data ?? []) as CommunityPost[]);
      const withCover = rows
        .map((post) => ({
          post,
          cover: communityHeroImageUrl(post.gallery_urls, post.video_urls),
        }))
        .filter((x): x is { post: CommunityPost; cover: string } => !!x.cover);
      if (!withCover.length) return null;
      withCover.sort((a, b) => engagementScore(b.post) - engagementScore(a.post));
      return withCover[0].post;
    },
  });
}

export function communityHeroCover(post: CommunityPost | null | undefined): string | null {
  if (!post) return null;
  return communityHeroImageUrl(post.gallery_urls, post.video_urls);
}
