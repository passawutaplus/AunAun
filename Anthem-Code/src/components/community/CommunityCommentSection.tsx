import { useRef, useState } from "react";
import { ImagePlus, MessageCircle, Send, Reply, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import {
  useCommunityComments,
  useCreateCommunityComment,
  type CommunityCommentTree,
  type CommunityComment,
} from "@/hooks/useCommunityPosts";
import { useCommunityCommentLike } from "@/hooks/useCommunityPostInteractions";
import { commentSchema } from "@/lib/validators";
import { toast } from "sonner";
import { formatThaiDate } from "@/lib/format";
import ModerationBanBanner from "@/components/moderation/ModerationBanBanner";
import ReportTrigger from "@/components/report/ReportTrigger";
import { profilePublicPath } from "@/lib/profileRoutes";
import { Link } from "react-router-dom";
import CommunityProfanityHint from "@/components/community/CommunityProfanityHint";
import {
  sortCommunityCommentTree,
  type CommunityCommentSort,
} from "@/lib/communityCommentSort";
import { formatCommunityActionError } from "@/lib/communityRateLimit";
import { uploadProjectImage } from "@/lib/uploadImage";
import { useSubscription } from "@/core/subscription";
import { cn } from "@/lib/utils";
import { PlusOneMark } from "@/components/brand/PlusOneMark";

interface Props {
  postId: string;
}

const CommentLikeButton = ({ commentId, likeCount }: { commentId: string; likeCount: number }) => {
  const { isLiked, toggle, isPending, likes } = useCommunityCommentLike(commentId, likeCount);
  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => toggle()}
      className={cn(
        "inline-flex items-center gap-0.5 text-xs transition-colors",
        isLiked ? "text-destructive" : "text-muted-foreground hover:text-destructive",
      )}
    >
      <PlusOneMark filled={isLiked} className={cn("text-[10px]", isLiked && "text-primary")} />
      {likes > 0 && <span>{likes}</span>}
    </button>
  );
};

const Row = ({
  node,
  depth,
  userId,
  postId,
  onReply,
}: {
  node: CommunityCommentTree;
  depth: number;
  userId?: string;
  postId: string;
  onReply: (c: CommunityComment) => void;
}) => {
  const c = node.comment;
  const canReply = depth < 2;
  return (
    <div className={cn(depth > 0 && "ml-4 md:ml-8 border-l-2 border-border/60 pl-3")}>
      <div className="rounded-2xl glass-panel p-4 flex gap-3">
        <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center text-sm font-medium text-primary shrink-0">
          {(c.profile?.display_name ?? "?")[0]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {c.profile ? (
              <Link
                to={profilePublicPath({ user_id: c.user_id, username: c.profile.username })}
                className="text-sm font-semibold hover:text-primary"
              >
                {c.profile.display_name ?? "ผู้ใช้"}
              </Link>
            ) : (
              <p className="text-sm font-semibold">ผู้ใช้</p>
            )}
            <span className="text-xs text-muted-foreground">{formatThaiDate(c.created_at)}</span>
            <CommentLikeButton commentId={c.id} likeCount={c.like_count ?? 0} />
            {canReply && userId && (
              <button
                type="button"
                onClick={() => onReply(c)}
                className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
              >
                <Reply className="w-3 h-3" /> ตอบกลับ
              </button>
            )}
            <ReportTrigger
              targetType="community_comment"
              targetId={c.id}
              targetOwnerId={c.user_id}
              className="ml-auto"
            />
          </div>
          <p className="text-base mt-1 whitespace-pre-wrap break-words">{c.content}</p>
          {(c.image_urls?.length ?? 0) > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {c.image_urls!.map((url) => (
                <a key={url} href={url} target="_blank" rel="noopener noreferrer" className="block">
                  <img src={url} alt="" className="max-h-40 rounded-lg border border-border/60 object-cover" />
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
      {node.replies.map((child) => (
        <div key={child.comment.id} className="mt-3">
          <Row node={child} depth={depth + 1} userId={userId} postId={postId} onReply={onReply} />
        </div>
      ))}
    </div>
  );
};

const CommunityCommentSection = ({ postId }: Props) => {
  const { user } = useAuth();
  const { tier } = useSubscription();
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<CommunityComment | null>(null);
  const [sort, setSort] = useState<CommunityCommentSort>("new");
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { data: tree = [], isLoading } = useCommunityComments(postId);
  const createMut = useCreateCommunityComment();
  const sortedTree = sortCommunityCommentTree(tree, sort);

  const handleImagePick = async (file: File) => {
    if (!user || imageUrls.length >= 1) return;
    setUploadingImage(true);
    try {
      const url = await uploadProjectImage(file, user.id, `community-comments/${postId}`, tier, {
        fastQuotaCheck: true,
      });
      setImageUrls((prev) => [...prev, url].slice(0, 1));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "อัปโหลดรูปไม่สำเร็จ");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const parsed = commentSchema.safeParse({ content: text, imageUrls });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "ข้อความไม่ถูกต้อง");
      return;
    }
    const depth = replyTo ? Math.min((replyTo.depth ?? 0) + 1, 2) : 0;
    try {
      await createMut.mutateAsync({
        post_id: postId,
        user_id: user.id,
        content: parsed.data.content,
        parent_id: replyTo?.id ?? null,
        depth,
        image_urls: parsed.data.imageUrls,
      });
      setText("");
      setReplyTo(null);
      setImageUrls([]);
    } catch (err) {
      toast.error(formatCommunityActionError(err));
    }
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-lg font-medium flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-primary" /> ความคิดเห็น
        </h2>
        <div className="flex rounded-full border border-border p-0.5 text-xs">
          <button
            type="button"
            onClick={() => setSort("new")}
            className={cn(
              "rounded-full px-3 py-1 transition-colors",
              sort === "new" ? "bg-primary text-primary-foreground" : "text-muted-foreground",
            )}
          >
            ใหม่ล่าสุด
          </button>
          <button
            type="button"
            onClick={() => setSort("top")}
            className={cn(
              "rounded-full px-3 py-1 transition-colors",
              sort === "top" ? "bg-primary text-primary-foreground" : "text-muted-foreground",
            )}
          >
            ยอดนิยม
          </button>
        </div>
      </div>
      {user && (
        <>
          <ModerationBanBanner />
          <form onSubmit={handleSubmit} className="rounded-2xl glass-panel p-4 space-y-3">
            {replyTo && (
              <div className="flex justify-between text-xs bg-muted/60 rounded-lg px-3 py-2">
                <span>
                  ตอบกลับ <strong>{replyTo.profile?.display_name}</strong>
                </span>
                <button type="button" onClick={() => setReplyTo(null)} className="text-primary">
                  ยกเลิก
                </button>
              </div>
            )}
            <Textarea
              id="community-comment-input"
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={3}
              maxLength={800}
              placeholder="แชร์ความเห็นหรือตอบคำถาม..."
            />
            {imageUrls.length > 0 && (
              <div className="relative inline-block">
                <img src={imageUrls[0]} alt="" className="max-h-32 rounded-lg border border-border/60" />
                <button
                  type="button"
                  onClick={() => setImageUrls([])}
                  className="absolute -top-2 -right-2 rounded-full bg-background border border-border p-0.5"
                  aria-label="ลบรูป"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            <CommunityProfanityHint text={text} className="mt-1" compact />
            <div className="flex items-center gap-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void handleImagePick(f);
                  e.target.value = "";
                }}
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="rounded-full"
                disabled={uploadingImage || imageUrls.length >= 1}
                onClick={() => fileRef.current?.click()}
              >
                <ImagePlus className="w-4 h-4 mr-1" />
                {uploadingImage ? "กำลังอัป..." : "แนบรูป"}
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={!text.trim() || createMut.isPending}
                className="rounded-full ml-auto"
              >
                <Send className="w-4 h-4 mr-1" /> ส่ง
              </Button>
            </div>
          </form>
        </>
      )}
      <div className="space-y-3">
        {isLoading && <p className="text-sm text-muted-foreground">กำลังโหลด...</p>}
        {sortedTree.map((node) => (
          <Row
            key={node.comment.id}
            node={node}
            depth={0}
            userId={user?.id}
            postId={postId}
            onReply={setReplyTo}
          />
        ))}
      </div>
    </section>
  );
};

export default CommunityCommentSection;
