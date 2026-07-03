import { Eye, MessageCircle, Pencil, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { PlusOneControl } from "@/components/brand/PlusOneControl";
import type { CommunityPost } from "@/hooks/useCommunityPosts";
import { communityCoverUrl } from "@/lib/communityMedia";
import { postHeadline } from "@/lib/classifyCommunityPost";
import { timeAgoTH } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Props = {
  post: CommunityPost;
  onDelete?: (id: string) => void;
  deleting?: boolean;
};

export function ManageCommunityPostCard({ post, onDelete, deleting }: Props) {
  const navigate = useNavigate();
  const cover = communityCoverUrl(post.gallery_urls, post.video_urls);
  const headline = postHeadline(post.title, post.body);
  const isDraft = post.status === "draft";

  return (
    <div className="rounded-xl overflow-hidden glass-panel h-full flex flex-col">
      <div className={cn("relative bg-muted/40", cover ? "h-40" : "min-h-[5rem] px-4 py-3")}>
        {cover ? (
          <img src={cover} alt="" className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <p className="text-sm text-foreground line-clamp-4 whitespace-pre-wrap thai-body">{headline}</p>
        )}
        <div className="absolute top-3 left-3 flex gap-2 flex-wrap">
          <Badge
            className={
              isDraft
                ? "bg-card/90 text-muted-foreground text-xs border border-border"
                : "bg-success text-success-foreground text-xs border-0"
            }
          >
            {isDraft ? "แบบร่าง" : "เผยแพร่"}
          </Badge>
        </div>
      </div>

      <div className="p-4 space-y-3 flex flex-col flex-1">
        <div>
          <h3 className="font-semibold text-foreground line-clamp-2">{headline}</h3>
          <p className="text-xs text-muted-foreground mt-1">{timeAgoTH(post.updated_at ?? post.created_at)}</p>
        </div>

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Eye className="w-3.5 h-3.5" />
            {(post.view_count ?? 0).toLocaleString()}
          </span>
          <PlusOneControl
            active={false}
            count={post.like_count ?? 0}
            showCount
            size="sm"
            className="pointer-events-none text-muted-foreground"
          />
          <span className="inline-flex items-center gap-1">
            <MessageCircle className="w-3.5 h-3.5" />
            {(post.reply_count ?? 0).toLocaleString()}
          </span>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/50 mt-auto">
          {!isDraft && (
            <button
              type="button"
              onClick={() => navigate(`/community/${post.id}`)}
              className="px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            >
              ดูโพสต์
            </button>
          )}
          <button
            type="button"
            onClick={() => navigate(`/community/${post.id}/edit`)}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs text-primary hover:bg-primary/10 transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" />
            แก้ไข
          </button>
          {onDelete && (
            <button
              type="button"
              disabled={deleting}
              onClick={() => onDelete(post.id)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              ลบ
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
