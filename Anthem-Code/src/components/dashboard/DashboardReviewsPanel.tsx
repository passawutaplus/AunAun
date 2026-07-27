import { useState } from "react";
import { Loader2, MessageSquareQuote, Reply } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { th } from "date-fns/locale";
import { toast } from "sonner";
import { StarRating } from "@/components/reviews/StarRating";
import { ReviewCategoryBreakdown } from "@/components/reviews/ReviewCategoryBreakdown";
import UserAvatar from "@/components/UserAvatar";
import ReportTrigger from "@/components/report/ReportTrigger";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useReplyWorkReview, useSubjectWorkReviews } from "@/hooks/useWorkReviews";
import { hasCategoryScores, type WorkReviewKind, type WorkReviewWithAuthor } from "@/lib/workReviews";
import { cn } from "@/lib/utils";

type Props = {
  subjectUserId: string;
  kind: WorkReviewKind;
  className?: string;
};

function ReviewManageCard({ review }: { review: WorkReviewWithAuthor }) {
  const replyMut = useReplyWorkReview();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(review.reply_body ?? "");

  const openEdit = () => {
    setDraft(review.reply_body ?? "");
    setEditing(true);
  };

  const save = async () => {
    const trimmed = draft.trim();
    if (!trimmed) {
      toast.error("พิมพ์คำตอบกลับก่อน หรือกดยกเลิก");
      return;
    }
    if (trimmed.length > 500) {
      toast.error("คำตอบกลับยาวได้ไม่เกิน 500 ตัวอักษร");
      return;
    }
    try {
      await replyMut.mutateAsync({ reviewId: review.id, replyBody: trimmed });
      toast.success(review.reply_body ? "อัปเดตคำตอบแล้ว" : "ตอบกลับรีวิวแล้ว");
      setEditing(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "ตอบกลับไม่สำเร็จ");
    }
  };

  return (
    <li className="rounded-2xl border border-border/60 bg-card/40 px-4 py-3.5 sm:px-5">
      <div className="flex items-start gap-3">
        <UserAvatar
          src={review.author?.avatar_url}
          name={review.author?.display_name}
          username={review.author?.username}
          className="h-9 w-9 shrink-0"
          fallbackClassName="text-xs"
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-sm font-semibold text-foreground">
              {review.author?.display_name || review.author?.username || "ผู้ใช้"}
            </span>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(review.created_at), { addSuffix: true, locale: th })}
            </span>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <StarRating value={Number(review.rating)} readOnly size="sm" />
            <span className="text-xs tabular-nums text-muted-foreground">
              {Number(review.rating).toFixed(1)}
            </span>
          </div>
          {hasCategoryScores(review) ? <ReviewCategoryBreakdown review={review} /> : null}
          {review.tags?.length ? (
            <div className="mt-2 flex flex-wrap gap-1">
              {review.tags.map((t) => (
                <span
                  key={t}
                  className="rounded-full bg-muted/80 px-2 py-0.5 text-[10px] text-muted-foreground"
                >
                  {t}
                </span>
              ))}
            </div>
          ) : null}
          {review.body ? (
            <p className="mt-2 text-sm leading-relaxed text-foreground/90">{review.body}</p>
          ) : null}

          {review.reply_body && !editing ? (
            <div className="mt-3 rounded-xl border border-border/50 bg-muted/30 px-3 py-2.5">
              <p className="text-[11px] font-medium text-muted-foreground">คำตอบของคุณ</p>
              <p className="mt-1 text-sm leading-relaxed text-foreground/90">{review.reply_body}</p>
            </div>
          ) : null}

          {editing ? (
            <div className="mt-3 space-y-2">
              <Textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="ขอบคุณสำหรับรีวิว…"
                rows={3}
                maxLength={500}
                className="resize-none text-sm"
              />
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] text-muted-foreground">{draft.trim().length}/500</span>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditing(false)}
                    disabled={replyMut.isPending}
                  >
                    ยกเลิก
                  </Button>
                  <Button type="button" size="sm" onClick={() => void save()} disabled={replyMut.isPending}>
                    {replyMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "บันทึก"}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-3 flex flex-wrap items-center gap-1">
              <Button type="button" variant="outline" size="sm" className="h-9 gap-1.5" onClick={openEdit}>
                <Reply className="h-3.5 w-3.5" />
                {review.reply_body ? "แก้ไขคำตอบ" : "ตอบกลับ"}
              </Button>
              <ReportTrigger
                targetType="work_review"
                targetId={review.id}
                targetOwnerId={review.author_user_id}
                variant="text"
                label="รายงานรีวิว"
                className="h-9"
              />
            </div>
          )}
        </div>
      </div>
    </li>
  );
}

export function DashboardReviewsPanel({ subjectUserId, kind, className }: Props) {
  const { data = [], isLoading, isError } = useSubjectWorkReviews(subjectUserId, kind);
  const title = kind === "hire" ? "รีวิวจ้างงานที่ได้รับ" : "รีวิวคอลแลปที่ได้รับ";

  return (
    <section className={cn("space-y-3", className)}>
      <div className="flex items-start gap-2">
        <MessageSquareQuote className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
        <div>
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            ตอบกลับรีวิวสาธารณะ หรือรายงานรีวิวที่ไม่เหมาะสม
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          กำลังโหลดรีวิว…
        </div>
      ) : isError ? (
        <p className="rounded-2xl border border-dashed border-border/70 px-4 py-6 text-sm text-muted-foreground">
          โหลดรีวิวไม่สำเร็จ — ลองรีเฟรชหน้าอีกครั้ง
        </p>
      ) : data.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/70 px-4 py-8 text-center">
          <p className="text-sm font-medium text-foreground">ยังไม่มีรีวิวในโหมดนี้</p>
          <p className="mt-1 text-sm text-muted-foreground">
            เมื่อมีคนรีวิวหลังจบงาน จะโผล่ที่นี่ให้ตอบกลับหรือรายงานได้
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {data.map((r) => (
            <ReviewManageCard key={r.id} review={r} />
          ))}
        </ul>
      )}
    </section>
  );
}

export default DashboardReviewsPanel;
