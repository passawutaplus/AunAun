import { Link } from "react-router-dom";
import type { CommunityPost } from "@/hooks/useCommunityPosts";
import { postHeadline } from "@/lib/classifyCommunityPost";
import { communityCoverUrl } from "@/lib/communityMedia";
import { CommunityTextCover } from "@/components/community/CommunityTextCover";

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
                <CommunityTextCover
                  seed={post.id}
                  title={post.title}
                  body={post.body}
                  tags={post.tags}
                  themeId={post.text_cover_theme}
                  aspectClass="aspect-square"
                  compact
                />
              )}
              <p className="p-2 text-xs font-medium line-clamp-2">{postHeadline(post.title, post.body)}</p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
