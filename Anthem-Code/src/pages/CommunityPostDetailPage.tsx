import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import PageLoader from "@/components/ui/PageLoader";
import { useCommunityPost } from "@/hooks/useCommunityPosts";
import { useCommunityPostView } from "@/hooks/useCommunityPostView";
import CommunityCommentSection from "@/components/community/CommunityCommentSection";
import CommunityPostMedia from "@/components/community/CommunityPostMedia";
import CommunityPostMenu from "@/components/community/CommunityPostMenu";
import CommunityPostActionBar from "@/components/community/CommunityPostActionBar";
import { formatThaiDate } from "@/lib/format";
import { questionTopicLabel } from "@/data/communityTopics";
import BoostButton from "@/components/boost/BoostButton";
import FollowButton from "@/components/FollowButton";
import Footer from "@/components/Footer";
import UserAvatar from "@/components/UserAvatar";
import { MOBILE_PAGE_BOTTOM_CLASS } from "@/lib/mobileLayout";
import { profilePublicPath } from "@/lib/profileRoutes";
import { cn } from "@/lib/utils";

const CommunityPostDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: post, isLoading } = useCommunityPost(id);
  useCommunityPostView(id);

  if (isLoading) return <PageLoader label="กำลังโหลด..." />;
  if (!post) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">ไม่พบโพสต์</p>
      </div>
    );
  }

  const isTip = post.post_kind === "tip";
  const hasMedia = (post.gallery_urls?.length ?? 0) > 0 || (post.video_urls?.length ?? 0) > 0;
  const authorPath = profilePublicPath({
    user_id: post.author_id,
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
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary" className="rounded-full">{isTip ? "Tips" : "Q&A"}</Badge>
              {!isTip && post.question_topic && (
                <Badge variant="outline" className="rounded-full text-[10px]">
                  {questionTopicLabel(post.question_topic)}
                </Badge>
              )}
            </div>
            <h1 className="text-2xl font-semibold leading-snug">{post.title}</h1>
            <p className="text-foreground/90 whitespace-pre-wrap leading-relaxed">{post.body}</p>
            {post.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {post.tags.map((t) => (
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
