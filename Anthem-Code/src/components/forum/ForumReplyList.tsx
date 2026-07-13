import { useMemo, useState } from "react";
import { Check } from "lucide-react";
import { ForumAttachmentComposer } from "@/components/forum/ForumAttachmentComposer";
import { ForumAttachmentList } from "@/components/forum/ForumAttachmentList";
import { ForumRankChip, ForumUserAvatar } from "@/components/forum/ForumUserAvatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import ReportTrigger from "@/components/report/ReportTrigger";
import {
  useAcceptForumReply,
  useCreateForumReply,
  useForumReplyAttachments,
  type ForumReply,
  type ForumTopic,
} from "@/hooks/useForum";
import { useAuth } from "@/hooks/useAuth";
import type { ForumAttachment } from "@/lib/forumAttachments";
import { formatRelativeTh } from "@/lib/forum";
import { cn } from "@/lib/utils";

type Props = {
  topic: ForumTopic;
  replies: ForumReply[];
};

export function ForumReplyList({ topic, replies }: Props) {
  const { user } = useAuth();
  const createReply = useCreateForumReply();
  const accept = useAcceptForumReply();
  const [body, setBody] = useState("");
  const [quoteId, setQuoteId] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<ForumAttachment[]>([]);

  const replyIds = useMemo(() => replies.map((r) => r.id), [replies]);
  const { data: attachByReply } = useForumReplyAttachments(replyIds);

  const canAccept = user?.id === topic.author_id;
  const quote = quoteId ? replies.find((r) => r.id === quoteId) : null;
  const canSend = (body.trim().length > 0 || attachments.length > 0) && !createReply.isPending;

  const submit = async () => {
    if (!canSend) return;
    const text = body.trim() || (attachments.length ? "📎 แนบไฟล์" : "");
    if (!text) return;
    await createReply.mutateAsync({
      topicId: topic.id,
      body: text,
      parentId: quoteId,
      attachmentIds: attachments.map((a) => a.id),
    });
    setBody("");
    setQuoteId(null);
    setAttachments([]);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {replies.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">ยังไม่มีความเห็น — เป็นคนแรกที่ช่วยตอบได้</p>
        ) : (
          replies.map((r) => {
            const name = r.profile?.display_name || "สมาชิก";
            const parent = r.parent_id ? replies.find((p) => p.id === r.parent_id) : null;
            const replyAttach = attachByReply?.get(r.id) ?? [];
            return (
              <div
                key={r.id}
                className={cn(
                  "rounded-xl border border-border p-4 space-y-3",
                  r.is_accepted && "border-emerald-300 bg-emerald-50/40",
                )}
              >
                <div className="flex items-start gap-3">
                  <ForumUserAvatar
                    src={r.profile?.avatar_url}
                    name={name}
                    isAdmin={r.author_is_admin}
                    rank={r.author_rank}
                    size="md"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="font-medium">{name}</span>
                      <ForumRankChip isAdmin={r.author_is_admin} rank={r.author_rank} />
                      <time className="text-xs text-muted-foreground" dateTime={r.created_at}>
                        {formatRelativeTh(r.created_at)}
                      </time>
                      {r.is_accepted ? (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-700 font-medium">
                          <Check className="h-3.5 w-3.5" /> คำตอบที่ยอมรับ
                        </span>
                      ) : null}
                    </div>
                    {parent ? (
                      <blockquote className="mt-2 border-l-2 border-border pl-3 text-xs text-muted-foreground line-clamp-2">
                        {parent.body}
                      </blockquote>
                    ) : null}
                    {r.body !== "📎 แนบไฟล์" ? (
                      <p className="mt-2 text-sm whitespace-pre-wrap leading-relaxed">{r.body}</p>
                    ) : null}
                    <ForumAttachmentList attachments={replyAttach} className="mt-3" />
                    <div className="mt-3 flex flex-wrap gap-2">
                      {!topic.is_locked ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-8 text-xs"
                          onClick={() => setQuoteId(r.id)}
                        >
                          อ้างอิง
                        </Button>
                      ) : null}
                      {canAccept && !r.is_accepted ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs"
                          disabled={accept.isPending}
                          onClick={() => accept.mutate(r.id)}
                        >
                          เลือกเป็นคำตอบ
                        </Button>
                      ) : null}
                      {user?.id !== r.author_id ? (
                        <ReportTrigger
                          targetType="forum_reply"
                          targetId={r.id}
                          targetOwnerId={r.author_id}
                          variant="text"
                          className="h-8"
                        />
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {!topic.is_locked ? (
        <div className="rounded-xl border border-border p-4 space-y-3">
          <h3 className="text-sm font-semibold">ตอบกระทู้</h3>
          {quote ? (
            <div className="flex items-start justify-between gap-2 rounded-lg bg-muted/60 px-3 py-2 text-xs">
              <span className="line-clamp-2 text-muted-foreground">อ้างอิง: {quote.body}</span>
              <button type="button" className="text-primary shrink-0" onClick={() => setQuoteId(null)}>
                ยกเลิก
              </button>
            </div>
          ) : null}
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="เขียนคำตอบ…"
            rows={4}
            className="resize-y"
          />
          <ForumAttachmentComposer
            value={attachments}
            onChange={setAttachments}
            variant="reply"
            disabled={createReply.isPending}
          />
          <div className="flex justify-end">
            <Button type="button" disabled={!canSend} onClick={() => void submit()}>
              {createReply.isPending ? "กำลังส่ง…" : "ส่งคำตอบ"}
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">กระทู้นี้ถูกล็อกแล้ว ไม่สามารถตอบเพิ่มได้</p>
      )}
    </div>
  );
}
