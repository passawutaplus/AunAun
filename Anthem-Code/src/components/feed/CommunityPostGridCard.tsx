import { Link } from "react-router-dom";
import { Heart, MessageCircle, Play } from "lucide-react";
import type { CommunityPost } from "@/hooks/useCommunityPosts";
import { communityCoverUrl } from "@/lib/communityMedia";
import { useCommunityPostLike } from "@/hooks/useCommunityPostInteractions";
import UserAvatar from "@/components/UserAvatar";
import { profilePublicPath } from "@/lib/profileRoutes";
import { cn } from "@/lib/utils";
import BoostBadge from "@/components/boost/BoostBadge";
import { logBoostEvent } from "@/hooks/useBoost";
import { useEffect, useRef } from "react";

interface Props {
  post: CommunityPost;
  boosted?: boolean;
  boostId?: string;
}

/** Lemon8-style compact card for 2-column masonry feed. */
const CommunityPostGridCard = ({ post, boosted, boostId }: Props) => {
  const cover = communityCoverUrl(post.gallery_urls, post.video_urls);
  const hasVideo = (post.video_urls?.length ?? 0) > 0;
  const cardRef = useRef<HTMLElement>(null);
  const boostImpLogged = useRef(false);
  const authorPath = profilePublicPath({
    user_id: post.author_id,
    username: post.profile?.username,
  });
  const { isLiked, toggle: toggleLike, isPending } = useCommunityPostLike(
    post.id,
    post.like_count,
    { authorId: post.author_id, title: post.title },
  );

  useEffect(() => {
    if (!boostId || !cardRef.current || boostImpLogged.current) return;
    const el = cardRef.current;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting && !boostImpLogged.current) {
            boostImpLogged.current = true;
            void logBoostEvent(boostId, "impression");
            obs.disconnect();
            break;
          }
        }
      },
      { threshold: 0.5 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [boostId]);

  const aspectSeed = post.id.charCodeAt(0) % 3;
  const aspectClass =
    aspectSeed === 0 ? "aspect-[3/4]" : aspectSeed === 1 ? "aspect-[4/5]" : "aspect-square";

  return (
    <article ref={cardRef} className="group">
      <Link
        to={`/community/${post.id}`}
        className="block"
        onClick={() => {
          if (boostId) void logBoostEvent(boostId, "click");
        }}
      >
        <div className="relative overflow-hidden rounded-xl bg-muted/50">
          {cover ? (
            <img
              src={cover}
              alt=""
              className={cn("w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]", aspectClass)}
              loading="lazy"
            />
          ) : (
            <div
              className={cn("w-full bg-gradient-brand-soft", aspectClass)}
            />
          )}

          {hasVideo && (
            <span className="absolute top-2 right-2 inline-flex rounded-full bg-black/50 p-1.5 text-white">
              <Play className="w-3.5 h-3.5 fill-current" />
            </span>
          )}
          {boosted ? (
            <span className="absolute top-2 left-2">
              <BoostBadge />
            </span>
          ) : null}
        </div>

        <h3 className="mt-2 text-[13px] font-medium leading-snug text-foreground line-clamp-2 thai-body">
          {post.title}
        </h3>
      </Link>

      <div className="mt-1.5 flex items-center gap-2 min-w-0">
        <Link to={authorPath} className="shrink-0" onClick={(e) => e.stopPropagation()}>
          <UserAvatar
            src={post.profile?.avatar_url}
            name={post.profile?.display_name ?? "?"}
            className="w-5 h-5"
          />
        </Link>
        <Link
          to={authorPath}
          className="flex-1 min-w-0 text-[11px] text-muted-foreground truncate hover:text-primary"
        >
          {post.profile?.display_name ?? "ผู้ใช้"}
        </Link>
        <Link
          to={`/community/${post.id}#comments`}
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center gap-0.5 shrink-0 text-[11px] text-muted-foreground hover:text-foreground"
          aria-label={`${post.reply_count} ความคิดเห็น`}
        >
          <MessageCircle className="w-3.5 h-3.5" />
          {post.reply_count > 0 && <span>{post.reply_count}</span>}
        </Link>
        <button
          type="button"
          aria-label={isLiked ? "เลิกถูกใจ" : "ถูกใจ"}
          disabled={isPending}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleLike();
          }}
          className="inline-flex items-center gap-0.5 shrink-0 text-[11px] text-muted-foreground hover:text-destructive"
        >
          <Heart className={cn("w-3.5 h-3.5", isLiked && "fill-destructive text-destructive")} />
          {post.like_count > 0 && <span>{post.like_count}</span>}
        </button>
      </div>
    </article>
  );
};

export default CommunityPostGridCard;
