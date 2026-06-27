import { Link, useNavigate } from "react-router-dom";
import { Heart, MessageCircle, Play } from "lucide-react";
import type { CommunityPost } from "@/hooks/useCommunityPosts";
import { useCommunityPostLike } from "@/hooks/useCommunityPostInteractions";
import UserAvatar from "@/components/UserAvatar";
import { profilePublicPath } from "@/lib/profileRoutes";
import { postHeadline } from "@/lib/classifyCommunityPost";
import { hasCommunityQaBadge } from "@/lib/communityQaTag";
import { CommunityQaBadge } from "@/components/community/CommunityQaBadge";
import { communityMediaAspectTailwind, normalizeCommunityMediaAspect } from "@/lib/communityMediaAspect";
import { CommunityPostGridCarousel } from "@/components/community/CommunityPostGridCarousel";
import { CommunityDoubleTapLike } from "@/components/community/CommunityDoubleTapLike";
import { useDelayedTapNavigate } from "@/hooks/useDoubleTapLike";
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
  const navigate = useNavigate();
  const hasVideo = (post.video_urls?.length ?? 0) > 0;
  const cardRef = useRef<HTMLElement>(null);
  const boostImpLogged = useRef(false);
  const authorPath = profilePublicPath({
    user_id: post.author_id,
    username: post.profile?.username,
  });
  const { isLiked, toggle: toggleLike, isPending, likes, like } = useCommunityPostLike(
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

  const aspectClass = communityMediaAspectTailwind(normalizeCommunityMediaAspect(post.media_aspect));
  const openPost = useDelayedTapNavigate(() => {
    if (boostId) void logBoostEvent(boostId, "click");
    navigate(`/community/${post.id}`);
  });

  return (
    <article ref={cardRef} className="group">
      <div className="relative overflow-hidden rounded-xl bg-muted/50">
        <CommunityDoubleTapLike
          onLike={like}
          isLiked={isLiked}
          isPending={isPending}
          className="block cursor-pointer"
        >
          <div role="button" tabIndex={0} onClick={openPost} onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") openPost(e as unknown as React.MouseEvent);
          }}>
            <CommunityPostGridCarousel
              galleryUrls={post.gallery_urls ?? []}
              videoUrls={post.video_urls ?? []}
              aspectClass={aspectClass}
            />
          </div>
        </CommunityDoubleTapLike>

          {hasVideo && (post.gallery_urls?.length ?? 0) === 0 && (post.video_urls?.length ?? 0) === 1 && (
            <span className="absolute top-2 right-2 inline-flex rounded-full bg-black/50 p-1.5 text-white pointer-events-none">
              <Play className="w-3.5 h-3.5 fill-current" />
            </span>
          )}
          {boosted ? (
            <span className="absolute top-2 left-2">
              <BoostBadge />
            </span>
          ) : hasCommunityQaBadge(post.tags) ? (
            <span className="absolute top-2 left-2">
              <CommunityQaBadge className="bg-background/90 backdrop-blur-sm" />
            </span>
          ) : null}
      </div>

      <Link to={`/community/${post.id}`} className="block mt-2">
        <h3 className="text-[13px] font-medium leading-snug text-foreground line-clamp-2 thai-body">
          {postHeadline(post.title, post.body)}
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
          {likes > 0 && <span>{likes}</span>}
        </button>
      </div>
    </article>
  );
};

export default CommunityPostGridCard;
