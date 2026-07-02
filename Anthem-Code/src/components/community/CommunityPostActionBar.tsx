import { Bookmark, MessageCircle, Share2 } from "lucide-react";
import { PlusOneControl } from "@/components/brand/PlusOneControl";
import { useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { scrollToPostComments } from "@/lib/communityCommentsNav";
import {
  useCommunityPostBookmark,
  useCommunityPostLike,
} from "@/hooks/useCommunityPostInteractions";
import CommunityShareButton from "@/components/community/CommunityShareButton";

export type CommunityPostLikeControl = {
  isLiked: boolean;
  likes: number;
  toggle: () => void;
  isPending: boolean;
};

type Props = {
  postId: string;
  authorId: string;
  title: string;
  likeCount: number;
  replyCount: number;
  viewCount?: number;
  className?: string;
  compact?: boolean;
  /** Pass from parent on detail page to avoid duplicate like hooks/mutations. */
  likeControl?: CommunityPostLikeControl;
};

const CommunityPostActionBar = ({
  postId,
  authorId,
  title,
  likeCount,
  replyCount,
  viewCount = 0,
  className,
  compact,
  likeControl,
}: Props) => {
  const internalLike = useCommunityPostLike(
    likeControl ? undefined : postId,
    likeCount,
    likeControl ? undefined : { authorId, title },
  );
  const { isLiked, toggle: toggleLike, isPending: liking, likes } = likeControl ?? internalLike;
  const { isBookmarked, toggle: toggleBookmark, isPending: saving } = useCommunityPostBookmark(postId);
  const navigate = useNavigate();
  const location = useLocation();
  const onDetailPage = location.pathname === `/community/${postId}`;

  const openComments = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onDetailPage) {
      scrollToPostComments();
      return;
    }
    navigate(`/community/${postId}#comments`);
  };

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-2 px-4 py-2 border-t border-border/50",
        className,
      )}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center gap-1">
        <PlusOneControl
          active={isLiked}
          count={likes}
          disabled={liking}
          size="md"
          ariaLabel={isLiked ? "เลิกถูกใจ" : "ถูกใจ"}
          className={cn(
            "rounded-full px-2.5 py-1.5 transition-colors",
            isLiked ? "text-primary bg-primary/10" : "hover:bg-muted/50",
          )}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleLike();
          }}
        />
        <button
          type="button"
          aria-label={replyCount > 0 ? `${replyCount} ความคิดเห็น` : "ไปที่ความคิดเห็น"}
          onClick={openComments}
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground hover:bg-muted/50",
          )}
        >
          <MessageCircle className="w-5 h-5 shrink-0" />
          {replyCount > 0 && <span className="tabular-nums">{replyCount}</span>}
        </button>
        {!compact && viewCount > 0 && (
          <span className="text-[11px] text-muted-foreground px-2">{viewCount.toLocaleString()} views</span>
        )}
      </div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          aria-label={isBookmarked ? "เอาออกจากที่บันทึก" : "บันทึกโพสต์"}
          disabled={saving}
          onClick={() => toggleBookmark()}
          className={cn(
            "inline-flex items-center justify-center rounded-full p-2 transition-colors",
            isBookmarked ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
          )}
        >
          <Bookmark className={cn("w-4 h-4", isBookmarked && "fill-current")} />
        </button>
        <CommunityShareButton postId={postId} title={title}>
          <button
            type="button"
            aria-label="แชร์โพสต์"
            className="inline-flex items-center justify-center rounded-full p-2 text-muted-foreground hover:text-foreground hover:bg-muted/50"
          >
            <Share2 className="w-4 h-4" />
          </button>
        </CommunityShareButton>
      </div>
    </div>
  );
};

export default CommunityPostActionBar;
