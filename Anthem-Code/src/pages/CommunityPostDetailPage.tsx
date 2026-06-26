import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import PageLoader from "@/components/ui/PageLoader";
import { HttpErrorPage } from "@/components/HttpErrorPage";
import { useCommunityPost } from "@/hooks/useCommunityPosts";
import { useCommunityPostView } from "@/hooks/useCommunityPostView";
import CommunityCommentSection from "@/components/community/CommunityCommentSection";
import CommunityPostMedia from "@/components/community/CommunityPostMedia";
import CommunityPostMenu from "@/components/community/CommunityPostMenu";
import CommunityPostActionBar from "@/components/community/CommunityPostActionBar";
import { formatThaiDate } from "@/lib/format";
import { titlesMatch } from "@/lib/classifyCommunityPost";
import { exploreProjectsUrl } from "@/lib/exploreRoutes";
import ToolIcon from "@/components/ToolIcon";
import BoostButton from "@/components/boost/BoostButton";
import FollowButton from "@/components/FollowButton";
import Footer from "@/components/Footer";
import UserAvatar from "@/components/UserAvatar";
import { MOBILE_PAGE_BOTTOM_CLASS } from "@/lib/mobileLayout";
import { profilePublicPath } from "@/lib/profileRoutes";
import { communityDisplayTags, hasCommunityQaBadge } from "@/lib/communityQaTag";
import { CommunityQaBadge } from "@/components/community/CommunityQaBadge";
import { cn } from "@/lib/utils";

const CommunityPostDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: post, isLoading } = useCommunityPost(id);
  useCommunityPostView(id);

  if (isLoading) return <PageLoader label="กำลังโหลด..." />;
  if (!post) return <HttpErrorPage kind="404" homeTo="/community" />;

  const hasMedia = (post.gallery_urls?.length ?? 0) > 0 || (post.video_urls?.length ?? 0) > 0;
  const showTitle = !titlesMatch(post.title, post.body);
  const authorPath = profilePublicPath({    user_id: post.author_id,
    username: post.profile?.username,
  });

  return (
    <main className={cn("min-h-screen bg-app-ambient", MOBILE_PAGE_BOTTOM_CLASS)}>
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" /> กลับ
        </button>

        <article className="rounded-2xl glass-panel overflow-hidden">
          <div className="flex items-center gap-3 px-4 pt-4 pb-2">
            <Link to={authorPath}>
              <UserAvatar
                src={post.profile?.avatar_url}
                name={post.profile?.display_name ?? "?"}
                className="w-10 h-10"
              />
            </Link>
            <div className="flex-1 min-w-0">
              <Link to={authorPath} className="text-sm font-medium hover:text-primary">
                {post.profile?.display_name ?? "ผู้ใช้"}
              </Link>
              <p className="text-xs text-muted-foreground">
                {formatThaiDate(post.created_at)}
                {post.category ? ` · ${post.category}` : ""}
                {post.view_count > 0 ? ` · ${post.view_count.toLocaleString()} views` : ""}
              </p>
            </div>
            <FollowButton freelancerId={post.author_id} size="sm" variant="compact" />
            <BoostButton
              targetType="community_post"
              targetId={post.id}
              targetTitle={post.title}
              ownerId={post.author_id}
              size="sm"
            />
            <CommunityPostMenu
              postId={post.id}
              authorId={post.author_id}
              title={post.title}
              onDeleted={() => navigate("/?mode=community")}
            />
          </div>

          {hasMedia && (
            <CommunityPostMedia
              galleryUrls={post.gallery_urls}
              videoUrls={post.video_urls}
              title={post.title}
              variant="detail"
            />
          )}

          <CommunityPostActionBar
            postId={post.id}
            authorId={post.author_id}
            title={post.title}
            likeCount={post.like_count ?? 0}
            replyCount={post.reply_count}
            viewCount={post.view_count ?? 0}
          />

          <div className="px-6 pb-6 pt-4 space-y-4">
            {hasCommunityQaBadge(post.tags) && <CommunityQaBadge />}
            {showTitle && (
              <h1 className="text-2xl font-semibold leading-snug">{post.title}</h1>
            )}
            <p className="text-foreground/90 whitespace-pre-wrap leading-relaxed">{post.body}</p>
            {(post.tools?.length ?? 0) > 0 && (
              <div className="flex flex-wrap gap-2">
                {post.tools!.map((t) => (
                  <Link
                    key={t}
                    to={exploreProjectsUrl("tool", t)}
                    className="inline-flex items-center gap-1 text-xs rounded-full bg-muted px-2.5 py-1 hover:bg-muted/80"
                  >
                    <ToolIcon name={t} size="xs" />
                    {t}
                  </Link>
                ))}
              </div>
            )}
            {communityDisplayTags(post.tags).length > 0 && (
              <div className="flex flex-wrap gap-2">
                {communityDisplayTags(post.tags).map((t) => (
                  <span key={t} className="text-xs text-primary">#{t}</span>
                ))}
              </div>
            )}
          </div>
        </article>

        <div id="comments">
          <CommunityCommentSection postId={post.id} />
        </div>
      </div>
      <Footer />
    </main>
  );
};

export default CommunityPostDetailPage;
