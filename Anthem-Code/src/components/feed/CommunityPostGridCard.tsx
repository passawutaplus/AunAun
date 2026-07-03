import { Link, useNavigate } from "react-router-dom";
import { Play } from "lucide-react";
import type { CommunityPost } from "@/hooks/useCommunityPosts";
import { useCommunityPostLike } from "@/hooks/useCommunityPostInteractions";
import UserAvatar from "@/components/UserAvatar";
import { profilePublicPath } from "@/lib/profileRoutes";
import { postHeadline, titlesMatch } from "@/lib/classifyCommunityPost";
import { hasCommunityQaBadge, communityDisplayTags } from "@/lib/communityQaTag";
import { CommunityQaBadge } from "@/components/community/CommunityQaBadge";
import { communityMediaAspectTailwind, normalizeCommunityMediaAspect } from "@/lib/communityMediaAspect";
import { communityMediaFromPost } from "@/lib/communityMedia";
import { CommunityPostGridCarousel } from "@/components/community/CommunityPostGridCarousel";
import { CommunityDoubleTapLike } from "@/components/community/CommunityDoubleTapLike";
import { useDelayedTapNavigate } from "@/hooks/useDoubleTapLike";
import BoostBadge from "@/components/boost/BoostBadge";
import { logBoostEvent } from "@/hooks/useBoost";
import { useEffect, useRef } from "react";
import { formatThaiDate } from "@/lib/format";
import CommunityPostMenu from "@/components/community/CommunityPostMenu";
import CommunityPostActionBar from "@/components/community/CommunityPostActionBar";
import { CommunityTagLink } from "@/components/community/CommunityTagLink";
import { cn } from "@/lib/utils";

interface Props {
  post: CommunityPost;
  boosted?: boolean;
  boostId?: string;
}

const CARD_SHELL =
  "rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden transition-shadow hover:shadow-md flex flex-col";

function postHasMedia(post: CommunityPost): boolean {
  return communityMediaFromPost(post.gallery_urls ?? [], post.video_urls ?? []).length > 0;
}

function PostCardHeader({
  post,
  authorPath,
}: {
  post: CommunityPost;
  authorPath: string;
}) {
  return (
    <div className="flex items-center gap-2.5 px-3 pt-3 pb-2">
      <Link to={authorPath} onClick={(e) => e.stopPropagation()} className="shrink-0">
        <UserAvatar
          src={post.profile?.avatar_url}
          name={post.profile?.display_name ?? "?"}
          className="w-8 h-8"
        />
      </Link>
      <div className="flex-1 min-w-0">
        <Link
          to={authorPath}
          onClick={(e) => e.stopPropagation()}
          className="block hover:text-primary"
        >
          <p className="text-[13px] font-medium truncate leading-tight">
            {post.profile?.display_name ?? "ผู้ใช้"}
          </p>
        </Link>
        <p className="text-[10px] text-muted-foreground truncate">
          {post.profile?.username ? `@${post.profile.username}` : formatThaiDate(post.created_at)}
        </p>
      </div>
      <CommunityPostMenu postId={post.id} authorId={post.author_id} title={post.title} />
    </div>
  );
}

/** Area feed — unified shell: header → body → caption → action bar. */
const CommunityPostGridCard = ({ post, boosted, boostId }: Props) => {
  const navigate = useNavigate();
  const hasMedia = postHasMedia(post);
  const hasVideo = (post.video_urls?.length ?? 0) > 0;
  const cardRef = useRef<HTMLElement>(null);
  const boostImpLogged = useRef(false);
  const authorPath = profilePublicPath({
    user_id: post.author_id,
    username: post.profile?.username,
  });
  const likeControl = useCommunityPostLike(post.id, post.like_count, {
    authorId: post.author_id,
    title: post.title,
  });

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
  const headline = postHeadline(post.title, post.body);
  const displayTags = communityDisplayTags(post.tags);
  const titleMatchesBody = titlesMatch(post.title, post.body);
  const showHeadlineOnText = !titleMatchesBody && !!headline;
  const showCaption = hasMedia && !!headline;

  return (
    <article ref={cardRef} className={cn(CARD_SHELL, hasMedia && "group")}>
      <PostCardHeader post={post} authorPath={authorPath} />

      {hasMedia ? (
        <div className="relative bg-muted/30">
          <CommunityDoubleTapLike
            onLike={likeControl.like}
            isLiked={likeControl.isLiked}
            isPending={likeControl.isPending}
            className="block cursor-pointer"
          >
            <div
              role="button"
              tabIndex={0}
              onClick={openPost}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") openPost(e as unknown as React.MouseEvent);
              }}
            >
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
            <span className="absolute top-2 left-2 z-10">
              <BoostBadge />
            </span>
          ) : hasCommunityQaBadge(post.tags) ? (
            <span className="absolute top-2 left-2 z-10">
              <CommunityQaBadge className="bg-background/90 backdrop-blur-sm" />
            </span>
          ) : null}
        </div>
      ) : (
        <Link to={`/community/${post.id}`} className="block px-3 pb-2 space-y-2 min-w-0">
          {showHeadlineOnText ? (
            <h3 className="text-[13px] font-semibold text-foreground line-clamp-2 leading-snug thai-body">
              {headline}
            </h3>
          ) : null}
          {post.body.trim() ? (
            <p className="text-[12px] text-foreground/90 line-clamp-6 whitespace-pre-wrap thai-body leading-relaxed">
              {post.body.trim()}
            </p>
          ) : null}
          {displayTags.length > 0 ? (
            <div className="flex flex-wrap gap-1" onClick={(e) => e.preventDefault()}>
              {displayTags.slice(0, 4).map((t) => (
                <CommunityTagLink key={t} tag={t} compact className="text-[10px] text-primary/80" />
              ))}
            </div>
          ) : null}
        </Link>
      )}

      {showCaption ? (
        <Link to={`/community/${post.id}`} className="block px-3 pt-2 pb-1">
          <h3 className="text-[13px] font-medium leading-snug text-foreground line-clamp-2 thai-body">
            {headline}
          </h3>
        </Link>
      ) : null}

      <CommunityPostActionBar
        postId={post.id}
        authorId={post.author_id}
        title={post.title}
        likeCount={post.like_count}
        replyCount={post.reply_count}
        viewCount={post.view_count}
        compact
        likeControl={{
          isLiked: likeControl.isLiked,
          likes: likeControl.likes,
          toggle: likeControl.toggle,
          isPending: likeControl.isPending,
        }}
        className="mt-auto border-t border-border/50 px-1 py-1.5"
      />
    </article>
  );
};

export default CommunityPostGridCard;
