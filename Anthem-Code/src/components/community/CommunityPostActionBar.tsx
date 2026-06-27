import { Bookmark, Heart, MessageCircle, Share2 } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  useCommunityPostBookmark,
  useCommunityPostLike,
} from "@/hooks/useCommunityPostInteractions";
import CommunityShareButton from "@/components/community/CommunityShareButton";

type Props = {
  postId: string;
  authorId: string;
  title: string;
  likeCount: number;
  replyCount: number;
  viewCount?: number;
  className?: string;
  compact?: boolean;
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
}: Props) => {
  const { isLiked, toggle: toggleLike, isPending: liking, likes } = useCommunityPostLike(postId, likeCount, {
    authorId,
    title,
  });
  const { isBookmarked, toggle: toggleBookmark, isPending: saving } = useCommunityPostBookmark(postId);

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-2 px-4 py-2 border-t border-border/50",
        className,
      )}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center gap-1">
        <button
          type="button"
          aria-label={isLiked ? "เลิกถูกใจ" : "ถูกใจ"}
          disabled={liking}
          onClick={() => toggleLike()}
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs transition-colors",
            isLiked ? "text-destructive bg-destructive/10" : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
          )}
        >
          <Heart className={cn("w-4 h-4", isLiked && "fill-current")} />
          {likes > 0 && <span>{likes}</span>}
        </button>
        <Link
          to={`/community/${postId}#comments`}
          className="inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50"
        >
          <MessageCircle className="w-4 h-4" />
          {replyCount > 0 ? replyCount : compact ? null : <span className="hidden sm:inline">ตอบ</span>}
        </Link>
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
