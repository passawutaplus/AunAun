import { ThumbsDown, ThumbsUp } from "lucide-react";
import { useProjectCommentVote } from "@/hooks/useProjectCommentVote";
import { cn } from "@/lib/utils";

type Props = {
  commentId: string;
};

export function CommentVoteButtons({ commentId }: Props) {
  const { likes, dislikes, mine, setVote, isPending } = useProjectCommentVote(commentId);

  return (
    <div className="flex items-center">
      <button
        type="button"
        disabled={isPending}
        aria-label="ชอบความคิดเห็นนี้"
        aria-pressed={mine === 1}
        onClick={() => setVote(1)}
        className={cn(
          "inline-flex items-center gap-0.5 p-2 min-h-11 min-w-11 rounded-md text-muted-foreground/70 hover:bg-muted/30 hover:text-foreground transition-colors",
          mine === 1 && "text-primary",
        )}
      >
        <ThumbsUp className={cn("w-4 h-4", mine === 1 && "fill-current")} />
        {likes > 0 ? <span className="text-xs tabular-nums">{likes}</span> : null}
      </button>
      <button
        type="button"
        disabled={isPending}
        aria-label="ไม่ชอบความคิดเห็นนี้"
        aria-pressed={mine === -1}
        onClick={() => setVote(-1)}
        className={cn(
          "inline-flex items-center gap-0.5 p-2 min-h-11 min-w-11 rounded-md text-muted-foreground/70 hover:bg-muted/30 hover:text-foreground transition-colors",
          mine === -1 && "text-foreground",
        )}
      >
        <ThumbsDown className={cn("w-4 h-4", mine === -1 && "fill-current")} />
        {dislikes > 0 ? <span className="text-xs tabular-nums">{dislikes}</span> : null}
      </button>
    </div>
  );
}
