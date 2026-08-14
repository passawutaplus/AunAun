import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { MessageCircle, Send, Reply } from "lucide-react";
import { InlineLoader } from "@/components/ui/BanterLoader";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import {
  useCreateComment,
  useDeleteComment,
  useProjectComments,
  useUpdateComment,
  type CommentTree,
  type CommentWithProfile,
} from "@/hooks/useProjectComments";
import { commentSchema } from "@/lib/validators";
import { mapWriteFlowError } from "@/lib/writeFlowErrors";
import { toast } from "sonner";
import { formatThaiDate } from "@/lib/format";
import { useAuthDialog } from "@/stores/authDialogStore";
import ModerationBanBanner from "@/components/moderation/ModerationBanBanner";
import { countThread, filterCommentTree } from "@/lib/commentTree";
import { cn } from "@/lib/utils";
import UserAvatar from "@/components/UserAvatar";
import { CommentOwnerMenu } from "@/components/comments/CommentOwnerMenu";
import { CommentViewerMenu } from "@/components/comments/CommentViewerMenu";
import { CommentVoteButtons } from "@/components/comments/CommentVoteButtons";
import { CommentEmojiPicker } from "@/components/comments/CommentEmojiPicker";
import {
  MentionFriendPopup,
  mentionQueryFromText,
} from "@/components/comments/MentionFriendPopup";
import { renderCommentMentions } from "@/lib/commentMentions";
import { insertEmojiAtSelection, restoreTextareaCaret } from "@/lib/twemoji";
import { useHiddenCommentIds } from "@/hooks/useHiddenCommentIds";
import { useUserBlocks } from "@/hooks/useCommunityPostInteractions";

interface Props {
  projectId: string | undefined;
}

function CommentRow({
  node,
  depth,
  userId,
  projectId,
  replyToId,
  onReply,
  replyForm,
}: {
  node: CommentTree;
  depth: number;
  userId?: string;
  projectId: string;
  replyToId: string | null;
  onReply: (c: CommentWithProfile) => void;
  replyForm: React.ReactNode;
}) {
  const c = node.comment;
  const canReply = depth < 2;
  const mine = Boolean(userId && c.user_id === userId);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(c.content);
  const updateMut = useUpdateComment();
  const deleteMut = useDeleteComment();

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
            {mine ? (
              <CommentOwnerMenu
                deleting={deleteMut.isPending}
                onEdit={() => {
                  setDraft(c.content);
                  setEditing(true);
                }}
                onDelete={async () => {
                  try {
                    await deleteMut.mutateAsync({ id: c.id, project_id: projectId });
                    toast.success("ลบความคิดเห็นแล้ว");
                  } catch (err) {
                    toast.error(mapWriteFlowError(err, "ลบไม่สำเร็จ"));
                  }
                }}
              />
            ) : (
              <div className="ml-auto flex items-center">
                <CommentVoteButtons commentId={c.id} />
                <CommentViewerMenu
                  commentId={c.id}
                  authorId={c.user_id}
                  authorName={c.profile?.display_name ?? "ผู้ใช้นี้"}
                  reportType="comment"
                />
              </div>
            )}
          </div>
          {editing ? (
            <div className="mt-2 space-y-2">
              <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={3} maxLength={800} />
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  className="rounded-full"
                  disabled={updateMut.isPending}
                  onClick={() => {
                    void updateMut
                      .mutateAsync({ id: c.id, project_id: projectId, content: draft })
                      .then(
                        () => {
                          setEditing(false);
                          toast.success("แก้ไขความคิดเห็นแล้ว");
                        },
                        (err) => toast.error(mapWriteFlowError(err, "บันทึกไม่สำเร็จ")),
                      );
                  }}
                >
                  บันทึก
                </Button>
                <Button type="button" size="sm" variant="ghost" className="rounded-full" onClick={() => setEditing(false)}>
                  ยกเลิก
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-base text-foreground mt-1 whitespace-pre-wrap break-words">
              {renderCommentMentions(c.content)}
            </p>
          )}
        </div>
      </div>

      {replyToId === c.id ? <div className="mt-3">{replyForm}</div> : null}

      {node.replies.length > 0 ? (
        <div className="mt-3 space-y-3">
          {node.replies.map((child) => (
            <CommentRow
              key={child.comment.id}
              node={child}
              depth={depth + 1}
              userId={userId}
              projectId={projectId}
              replyToId={replyToId}
              onReply={onReply}
              replyForm={replyForm}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

const CommentSection = ({ projectId }: Props) => {
  const { user } = useAuth();
  const openAuth = useAuthDialog((s) => s.openSignup);
  const [text, setText] = useState("");
  const [replyText, setReplyText] = useState("");
  const [replyTo, setReplyTo] = useState<CommentWithProfile | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const replyInputRef = useRef<HTMLTextAreaElement>(null);
  const { data: tree = [], isLoading } = useProjectComments(projectId);
  const hiddenIds = useHiddenCommentIds();
  const { data: blockedSet } = useUserBlocks(user?.id);
  const visibleTree = useMemo(
    () => filterCommentTree(tree, hiddenIds, blockedSet ?? new Set()),
    [tree, hiddenIds, blockedSet],
  );
  const createMut = useCreateComment();
  const totalCount = countThread(visibleTree);

  useEffect(() => {
    if (!replyTo) return;
    replyInputRef.current?.focus();
  }, [replyTo]);

  const pickEmoji = (emoji: string, current: string, setCurrent: (v: string) => void, el: HTMLTextAreaElement | null) => {
    const next = insertEmojiAtSelection(current, emoji, el);
    if (!next) return;
    setCurrent(next.text);
    restoreTextareaCaret(el, next.caret);
  };

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
      <div className="relative">
        <Textarea
          ref={replyInputRef}
          id="project-comment-reply-input"
          aria-label="เขียนคำตอบความคิดเห็น"
          value={replyText}
          onChange={(e) => setReplyText(e.target.value)}
          placeholder="เขียนคำตอบ... พิมพ์ @ เพื่อกล่าวถึงเพื่อนหรือผลงาน"
          rows={3}
          maxLength={800}
          className="resize-none"
        />
        <MentionFriendPopup
          query={mentionQueryFromText(replyText)}
          text={replyText}
          onPick={setReplyText}
        />
      </div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="flex items-center gap-1">
          <CommentEmojiPicker
            onPick={(emoji) => pickEmoji(emoji, replyText, setReplyText, replyInputRef.current)}
          />
          <span className="text-xs text-muted-foreground">{replyText.length}/800</span>
        </div>
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
            <div className="relative">
              <Textarea
                ref={inputRef}
                id="project-comment-input"
                aria-label="เขียนความคิดเห็นเกี่ยวกับผลงาน"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="แชร์ความคิดเห็นเกี่ยวกับผลงานนี้... พิมพ์ @ เพื่อกล่าวถึงเพื่อนหรือผลงาน"
                rows={3}
                maxLength={800}
                className="resize-none"
              />
              <MentionFriendPopup
                query={mentionQueryFromText(text)}
                text={text}
                onPick={setText}
              />
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex items-center gap-1">
                <CommentEmojiPicker onPick={(emoji) => pickEmoji(emoji, text, setText, inputRef.current)} />
                <span className="text-xs text-muted-foreground">{text.length}/800</span>
              </div>
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
        {!isLoading && visibleTree.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-6">ยังไม่มีคอมเมนต์ — มาเป็นคนแรกกันเถอะ</p>
        )}
        {projectId
          ? visibleTree.map((node) => (
              <CommentRow
                key={node.comment.id}
                node={node}
                depth={0}
                userId={user?.id}
                projectId={projectId}
                replyToId={replyTo?.id ?? null}
                onReply={(c) => {
                  setReplyTo(c);
                  const handle = c.profile?.username?.trim();
                  setReplyText(handle ? `@${handle} ` : "");
                }}
                replyForm={replyForm}
              />
            ))
          : null}
      </div>
    </section>
  );
};

export default CommentSection;
