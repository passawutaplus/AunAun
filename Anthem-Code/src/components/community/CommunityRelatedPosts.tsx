import { Link } from "react-router-dom";
import type { CommunityPost } from "@/hooks/useCommunityPosts";
import { postHeadline } from "@/lib/classifyCommunityPost";
import { communityCoverUrl } from "@/lib/communityMedia";

type Props = {
  posts: CommunityPost[];
};

export function CommunityRelatedPosts({ posts }: Props) {
  if (!posts.length) return null;

  return (
    <section className="space-y-3">
      <hr className="border-0 border-t border-border/60" />
      <div className="grid grid-cols-2 gap-3">
        {posts.map((post) => {
          const cover = communityCoverUrl(post.gallery_urls, post.video_urls);
          return (
            <Link
              key={post.id}
              to={`/community/${post.id}`}
              className="rounded-xl border border-border/60 overflow-hidden hover:border-primary/30 transition-colors"
            >
              {cover ? (
                <img src={cover} alt="" className="w-full aspect-square object-cover" loading="lazy" />
              ) : (
                <div className="px-3 py-3 min-h-[5rem] bg-muted/30">
                  <p className="text-xs text-foreground line-clamp-4 whitespace-pre-wrap thai-body">
                    {post.body.trim() || postHeadline(post.title, post.body)}
                  </p>
                </div>
              )}
              <p className="p-2 text-xs font-medium line-clamp-2">{postHeadline(post.title, post.body)}</p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
