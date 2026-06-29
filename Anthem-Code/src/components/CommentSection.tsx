import { useState } from "react";
import { MessageCircle, Trash2, Send, Reply } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import {
  useCreateComment,
  useDeleteComment,
  useProjectComments,
  type CommentTree,
  type CommentWithProfile,
} from "@/hooks/useProjectComments";
import { commentSchema } from "@/lib/validators";
import { mapWriteFlowError } from "@/lib/writeFlowErrors";
import { toast } from "sonner";
import { formatThaiDate } from "@/lib/format";
import { useAuthDialog } from "@/stores/authDialogStore";
import ReportTrigger from "@/components/report/ReportTrigger";
import ModerationBanBanner from "@/components/moderation/ModerationBanBanner";
import { countThread } from "@/lib/commentTree";
import { cn } from "@/lib/utils";
import UserAvatar from "@/components/UserAvatar";

interface Props {
  projectId: string | undefined;
}

const CommentRow = ({
  node,
  depth,
  userId,
  projectId,
  onReply,
  onDelete,
}: {
  node: CommentTree;
  depth: number;
  userId?: string;
  projectId: string;
  onReply: (c: CommentWithProfile) => void;
  onDelete: (id: string) => void;
}) => {
  const c = node.comment;
  const canReply = depth < 2;

  return (
    <div className={cn(depth > 0 && "ml-4 md:ml-8 border-l-2 border-border/60 pl-3")}>
      <div className="rounded-2xl glass-panel p-4 flex gap-3">
        <UserAvatar
          src={c.profile?.avatar_url}
          name={c.profile?.display_name ?? "?"}
          className="w-10 h-10 shrink-0"
          fallbackClassName="bg-primary/15 text-primary"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-foreground">{c.profile?.display_name ?? "ผู้ใช้"}</p>
            <span className="text-xs text-muted-foreground">{formatThaiDate(c.created_at)}</span>
            {canReply && userId && (
              <button
                type="button"
                onClick={() => onReply(c)}
                className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
              >
                <Reply className="w-3 h-3" /> ตอบกลับ
              </button>
            )}
            {userId === c.user_id ? (
              <button
                onClick={() => onDelete(c.id)}
                className="ml-auto text-muted-foreground hover:text-destructive transition-colors"
                aria-label="ลบคอมเมนต์"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            ) : (
              userId && (
                <ReportTrigger targetType="comment" targetId={c.id} targetOwnerId={c.user_id} className="ml-auto" />
              )
            )}
          </div>
          <p className="text-base text-foreground mt-1 whitespace-pre-wrap break-words">{c.content}</p>
        </div>
      </div>
      {node.replies.map((child) => (
        <div key={child.comment.id} className="mt-3">
          <CommentRow
            node={child}
            depth={depth + 1}
            userId={userId}
            projectId={projectId}
            onReply={onReply}
            onDelete={onDelete}
          />
        </div>
      ))}
    </div>
  );
};

const CommentSection = ({ projectId }: Props) => {
  const { user } = useAuth();
  const openAuth = useAuthDialog((s) => s.openSignup);
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<CommentWithProfile | null>(null);
  const { data: tree = [], isLoading } = useProjectComments(projectId);
  const createMut = useCreateComment();
  const deleteMut = useDeleteComment();
  const totalCount = countThread(tree);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !projectId) return;
    const parsed = commentSchema.safeParse({ content: text });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "ข้อความไม่ถูกต้อง");
      return;
    }
    const depth = replyTo ? Math.min((replyTo.depth ?? 0) + 1, 2) : 0;
    try {
      await createMut.mutateAsync({
        project_id: projectId,
        user_id: user.id,
        content: parsed.data.content,
        parent_id: replyTo?.id ?? null,
        depth,
      });
      setText("");
      setReplyTo(null);
    } catch (err) {
      toast.error(mapWriteFlowError(err, "คอมเมนต์ไม่สำเร็จ"));
    }
  };

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-medium text-foreground flex items-center gap-2">
        <MessageCircle className="w-5 h-5 text-primary" />
        ความคิดเห็น {totalCount > 0 && <span className="text-muted-foreground text-sm font-normal">({totalCount})</span>}
      </h2>

      {!user ? (
        <div className="rounded-2xl glass-panel p-6 text-center space-y-3">
          <p className="text-sm text-muted-foreground">เข้าสู่ระบบเพื่อร่วมแสดงความคิดเห็น</p>
          <Button onClick={openAuth} className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90">
            เข้าสู่ระบบ
          </Button>
        </div>
      ) : (
        <>
          <ModerationBanBanner />
          <form onSubmit={handleSubmit} className="rounded-2xl glass-panel p-4 space-y-3">
            {replyTo && (
              <div className="flex items-center justify-between text-xs bg-muted/60 rounded-lg px-3 py-2">
                <span>
                  ตอบกลับ <strong>{replyTo.profile?.display_name ?? "ผู้ใช้"}</strong>
                </span>
                <button type="button" onClick={() => setReplyTo(null)} className="text-primary hover:underline">
                  ยกเลิก
                </button>
              </div>
            )}
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={replyTo ? "เขียนคำตอบ..." : "แชร์ความคิดเห็นเกี่ยวกับผลงานนี้..."}
              rows={3}
              maxLength={800}
              className="resize-none"
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{text.length}/800</span>
              <Button
                type="submit"
                disabled={createMut.isPending || !text.trim()}
                className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
                size="sm"
              >
                <Send className="w-4 h-4 mr-1" />
                {createMut.isPending ? "กำลังส่ง..." : replyTo ? "ส่งคำตอบ" : "ส่งคอมเมนต์"}
              </Button>
            </div>
          </form>
        </>
      )}

      <div className="space-y-3">
        {isLoading && <p className="text-sm text-muted-foreground">กำลังโหลด...</p>}
        {!isLoading && tree.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-6">ยังไม่มีคอมเมนต์ — มาเป็นคนแรกกันเถอะ</p>
        )}
        {tree.map((node) => (
          <CommentRow
            key={node.comment.id}
            node={node}
            depth={0}
            userId={user?.id}
            projectId={projectId!}
            onReply={setReplyTo}
            onDelete={(id) => deleteMut.mutate({ id, project_id: projectId! })}
          />
        ))}
      </div>
    </section>
  );
};

export default CommentSection;
