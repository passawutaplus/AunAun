import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { MessageCircle, Trash2, Send, Reply } from "lucide-react";
import { InlineLoader } from "@/components/ui/BanterLoader";
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

function renderCommentTree({
  nodes,
  depth,
  userId,
  replyToId,
  onReply,
  onDelete,
  replyForm,
}: {
  nodes: CommentTree[];
  depth: number;
  userId?: string;
  replyToId: string | null;
  onReply: (c: CommentWithProfile) => void;
  onDelete: (id: string) => void;
  replyForm: ReactNode;
}) {
  return nodes.map((node) => {
    const c = node.comment;
    const canReply = depth < 2;

    return (
      <div
        key={c.id}
        className={cn(depth > 0 && "ml-4 md:ml-8 border-l-2 border-border/60 pl-3")}
      >
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

        {replyToId === c.id ? <div className="mt-3">{replyForm}</div> : null}

        {node.replies.length > 0 ? (
          <div className="mt-3 space-y-3">
            {renderCommentTree({
              nodes: node.replies,
              depth: depth + 1,
              userId,
              replyToId,
              onReply,
              onDelete,
              replyForm,
            })}
          </div>
        ) : null}
      </div>
    );
  });
}

const CommentSection = ({ projectId }: Props) => {
  const { user } = useAuth();
  const openAuth = useAuthDialog((s) => s.openSignup);
  const [text, setText] = useState("");
  const [replyText, setReplyText] = useState("");
  const [replyTo, setReplyTo] = useState<CommentWithProfile | null>(null);
  const replyInputRef = useRef<HTMLTextAreaElement>(null);
  const { data: tree = [], isLoading } = useProjectComments(projectId);
  const createMut = useCreateComment();
  const deleteMut = useDeleteComment();
  const totalCount = countThread(tree);

  useEffect(() => {
    if (!replyTo) return;
    replyInputRef.current?.focus();
  }, [replyTo]);

  const submitComment = async (content: string, parent: CommentWithProfile | null) => {
    if (!user || !projectId) return;
    const parsed = commentSchema.safeParse({ content });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "ข้อความไม่ถูกต้อง");
      return;
    }
    const depth = parent ? Math.min((parent.depth ?? 0) + 1, 2) : 0;
    try {
      await createMut.mutateAsync({
        project_id: projectId,
        user_id: user.id,
        content: parsed.data.content,
        parent_id: parent?.id ?? null,
        depth,
      });
      if (parent) {
        setReplyText("");
        setReplyTo(null);
      } else {
        setText("");
      }
    } catch (err) {
      toast.error(mapWriteFlowError(err, "คอมเมนต์ไม่สำเร็จ"));
    }
  };

  const handleNewSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await submitComment(text, null);
  };

  const handleReplySubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!replyTo) return;
    await submitComment(replyText, replyTo);
  };

  const replyForm = replyTo ? (
    <form onSubmit={handleReplySubmit} className="rounded-2xl glass-panel p-4 space-y-3">
      <div className="flex items-center justify-between text-xs bg-muted/60 rounded-lg px-3 py-2">
        <span>
          ตอบกลับ <strong>{replyTo.profile?.display_name ?? "ผู้ใช้"}</strong>
        </span>
        <button
          type="button"
          onClick={() => {
            setReplyTo(null);
            setReplyText("");
          }}
          className="text-primary hover:underline"
        >
          ยกเลิก
        </button>
      </div>
      <Textarea
        ref={replyInputRef}
        id="project-comment-reply-input"
        aria-label="เขียนคำตอบความคิดเห็น"
        value={replyText}
        onChange={(e) => setReplyText(e.target.value)}
        placeholder="เขียนคำตอบ..."
        rows={3}
        maxLength={800}
        className="resize-none"
      />
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <span className="text-xs text-muted-foreground">{replyText.length}/800</span>
        <Button
          type="submit"
          disabled={createMut.isPending || !replyText.trim()}
          aria-disabled={createMut.isPending || !replyText.trim()}
          title={!replyText.trim() ? "พิมพ์ข้อความก่อนส่ง" : undefined}
          className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
          size="sm"
        >
          <Send className="w-4 h-4 mr-1" />
          {createMut.isPending ? "กำลังส่ง..." : "ส่งคำตอบ"}
        </Button>
      </div>
    </form>
  ) : null;

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
          <form onSubmit={handleNewSubmit} className="rounded-2xl glass-panel p-4 space-y-3">
            <Textarea
              id="project-comment-input"
              aria-label="เขียนความคิดเห็นเกี่ยวกับผลงาน"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="แชร์ความคิดเห็นเกี่ยวกับผลงานนี้..."
              rows={3}
              maxLength={800}
              className="resize-none"
            />
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <span className="text-xs text-muted-foreground">{text.length}/800</span>
              <Button
                type="submit"
                disabled={createMut.isPending || !text.trim()}
                aria-disabled={createMut.isPending || !text.trim()}
                title={!text.trim() ? "พิมพ์ข้อความก่อนส่ง" : undefined}
                className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
                size="sm"
              >
                <Send className="w-4 h-4 mr-1" />
                {createMut.isPending ? "กำลังส่ง..." : "ส่งคอมเมนต์"}
              </Button>
            </div>
          </form>
        </>
      )}

      <div className="space-y-3">
        {isLoading && <InlineLoader className="py-6" />}
        {!isLoading && tree.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-6">ยังไม่มีคอมเมนต์ — มาเป็นคนแรกกันเถอะ</p>
        )}
        {renderCommentTree({
          nodes: tree,
          depth: 0,
          userId: user?.id,
          replyToId: replyTo?.id ?? null,
          onReply: (c) => {
            setReplyTo(c);
            setReplyText("");
          },
          onDelete: (id) => deleteMut.mutate({ id, project_id: projectId! }),
          replyForm,
        })}
      </div>
    </section>
  );
};

export default CommentSection;
