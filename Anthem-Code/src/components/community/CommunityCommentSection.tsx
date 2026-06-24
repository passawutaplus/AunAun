import { useState } from "react";
import { MessageCircle, Send, Reply } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import {
  useCommunityComments,
  useCreateCommunityComment,
  type CommunityCommentTree,
  type CommunityComment,
} from "@/hooks/useCommunityPosts";
import { commentSchema } from "@/lib/validators";
import { toast } from "sonner";
import { formatThaiDate } from "@/lib/format";
import ModerationBanBanner from "@/components/moderation/ModerationBanBanner";
import ReportTrigger from "@/components/report/ReportTrigger";
import { profilePublicPath } from "@/lib/profileRoutes";
import { Link } from "react-router-dom";
import CommunityProfanityHint from "@/components/community/CommunityProfanityHint";
import { cn } from "@/lib/utils";

interface Props {
  postId: string;
}

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
            {canReply && userId && (
              <button type="button" onClick={() => onReply(c)} className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1">
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
          <p className="text-sm mt-1 whitespace-pre-wrap break-words">{c.content}</p>
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
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<CommunityComment | null>(null);
  const { data: tree = [], isLoading } = useCommunityComments(postId);
  const createMut = useCreateCommunityComment();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const parsed = commentSchema.safeParse({ content: text });
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
      });
      setText("");
      setReplyTo(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "ส่งไม่สำเร็จ");
    }
  };

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-medium flex items-center gap-2">
        <MessageCircle className="w-5 h-5 text-primary" /> ความคิดเห็น
      </h2>
      {user && (
        <>
          <ModerationBanBanner />
          <form onSubmit={handleSubmit} className="rounded-2xl glass-panel p-4 space-y-3">
            {replyTo && (
              <div className="flex justify-between text-xs bg-muted/60 rounded-lg px-3 py-2">
                <span>ตอบกลับ <strong>{replyTo.profile?.display_name}</strong></span>
                <button type="button" onClick={() => setReplyTo(null)} className="text-primary">ยกเลิก</button>
              </div>
            )}
            <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} maxLength={800} placeholder="แชร์ความเห็นหรือตอบคำถาม..." />
            <CommunityProfanityHint text={text} className="mt-1" compact />
            <Button type="submit" size="sm" disabled={!text.trim() || createMut.isPending} className="rounded-full">
              <Send className="w-4 h-4 mr-1" /> ส่ง
            </Button>
          </form>
        </>
      )}
      <div className="space-y-3">
        {isLoading && <p className="text-sm text-muted-foreground">กำลังโหลด...</p>}
        {tree.map((node) => (
          <Row key={node.comment.id} node={node} depth={0} userId={user?.id} postId={postId} onReply={setReplyTo} />
        ))}
      </div>
    </section>
  );
};

export default CommunityCommentSection;
