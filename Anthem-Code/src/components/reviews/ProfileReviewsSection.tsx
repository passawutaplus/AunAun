import { useMemo, useState } from "react";
import { MessageSquareHeart } from "lucide-react";
import { StarAverageLabel, StarRating } from "@/components/reviews/StarRating";
import { ReviewCategoryBreakdown } from "@/components/reviews/ReviewCategoryBreakdown";
import UserAvatar from "@/components/UserAvatar";
import { useSubjectWorkReviews } from "@/hooks/useWorkReviews";
import { averageRating, hasCategoryScores, type WorkReviewKind } from "@/lib/workReviews";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { th } from "date-fns/locale";

type Props = {
  subjectUserId: string;
  className?: string;
};

export function ProfileReviewsSection({ subjectUserId, className }: Props) {
  const [kind, setKind] = useState<WorkReviewKind | "all">("all");
  const hireQ = useSubjectWorkReviews(subjectUserId, "hire");
  const collabQ = useSubjectWorkReviews(subjectUserId, "collab");

  const hire = hireQ.data ?? [];
  const collab = collabQ.data ?? [];
  const all = useMemo(() => [...hire, ...collab].sort((a, b) => b.created_at.localeCompare(a.created_at)), [hire, collab]);

  const list = kind === "hire" ? hire : kind === "collab" ? collab : all;
  const avgSource = kind === "hire" ? hire : kind === "collab" ? collab : all;
  const avg = averageRating(avgSource);

  const loading = hireQ.isLoading || collabQ.isLoading;
  const errored = hireQ.isError || collabQ.isError;

  return (
    <div className={cn("space-y-5", className)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <StarAverageLabel average={avg} count={avgSource.length} />
        <div className="flex rounded-full border border-border/60 p-0.5 text-xs">
          {(
            [
              { id: "all" as const, label: `ทั้งหมด (${all.length})` },
              { id: "hire" as const, label: `จ้างงาน (${hire.length})` },
              { id: "collab" as const, label: `คอลแลป (${collab.length})` },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setKind(tab.id)}
              className={cn(
                "rounded-full px-3 py-1.5 font-medium transition-colors",
                kind === tab.id
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">กำลังโหลดรีวิว…</p>
      ) : errored ? (
        <p className="text-sm text-destructive">โหลดรีวิวไม่สำเร็จ — อาจยังไม่ได้สร้างตารางบนเซิร์ฟเวอร์</p>
      ) : list.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/70 px-5 py-10 text-center">
          <MessageSquareHeart className="mx-auto h-8 w-8 text-muted-foreground/50" aria-hidden />
          <p className="mt-3 text-sm font-medium text-foreground">ยังไม่มีรีวิว</p>
          <p className="mt-1 text-sm text-muted-foreground">
            รีวิวจะโผล่หลังมีงานจบกับคนอื่น — เริ่มจากผลงานและคุยโอกาสได้เลย
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {list.map((r) => (
            <li
              key={r.id}
              className="rounded-2xl border border-border/60 bg-background/50 px-4 py-3.5 sm:px-5"
            >
              <div className="flex items-start gap-3">
                <UserAvatar
                  src={r.author?.avatar_url}
                  name={r.author?.display_name}
                  username={r.author?.username}
                  className="h-9 w-9 shrink-0"
                  fallbackClassName="text-xs"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="text-sm font-semibold text-foreground">
                      {r.author?.display_name || r.author?.username || "ผู้ใช้"}
                    </span>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-medium",
                        r.kind === "hire"
                          ? "bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      {r.kind === "hire" ? "จ้างงาน" : "คอลแลป"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(r.created_at), { addSuffix: true, locale: th })}
                    </span>
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    <StarRating value={Number(r.rating)} readOnly size="sm" />
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {Number(r.rating).toFixed(1)}
                    </span>
                  </div>
                  {hasCategoryScores(r) ? <ReviewCategoryBreakdown review={r} /> : null}
                  {r.tags?.length ? (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {r.tags.map((t) => (
                        <span
                          key={t}
                          className="rounded-full bg-muted/80 px-2 py-0.5 text-[10px] text-muted-foreground"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  {r.body ? (
                    <p className="mt-2 text-sm leading-relaxed text-foreground/90">{r.body}</p>
                  ) : null}
                  {r.reply_body ? (
                    <div className="mt-3 rounded-xl border border-border/50 bg-muted/30 px-3 py-2.5">
                      <p className="text-[11px] font-medium text-muted-foreground">คำตอบจากเจ้าของโปรไฟล์</p>
                      <p className="mt-1 text-sm leading-relaxed text-foreground/90">{r.reply_body}</p>
                    </div>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
