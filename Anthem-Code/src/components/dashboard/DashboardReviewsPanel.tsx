import { useMemo, useState } from "react";
import { Loader2, MessageSquareQuote } from "lucide-react";
import { WorkReviewManageCard } from "@/components/reviews/WorkReviewManageCard";
import { useSubjectWorkReviews } from "@/hooks/useWorkReviews";
import { reviewHasPackageOrigin, type WorkReviewKind } from "@/lib/workReviews";
import { cn } from "@/lib/utils";

type Props = {
  subjectUserId: string;
  kind: WorkReviewKind;
  className?: string;
};

type OriginFilter = "all" | "package" | "other";

export function DashboardReviewsPanel({ subjectUserId, kind, className }: Props) {
  const { data = [], isLoading, isError } = useSubjectWorkReviews(subjectUserId, kind);
  const [originFilter, setOriginFilter] = useState<OriginFilter>("all");
  const title = kind === "hire" ? "รีวิวจ้างงานที่ได้รับ" : "รีวิวคอลแลปที่ได้รับ";

  const packageCount = useMemo(() => data.filter(reviewHasPackageOrigin).length, [data]);
  const otherCount = useMemo(() => data.filter((r) => !reviewHasPackageOrigin(r)).length, [data]);

  const filtered = useMemo(() => {
    if (originFilter === "package") return data.filter(reviewHasPackageOrigin);
    if (originFilter === "other") return data.filter((r) => !reviewHasPackageOrigin(r));
    return data;
  }, [data, originFilter]);

  return (
    <section className={cn("space-y-3", className)}>
      <div className="flex items-start gap-2">
        <MessageSquareQuote className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            แยกตามแหล่งที่มาจากแพ็กเกจได้ — แล้วตอบกลับหรือรายงานได้
          </p>
        </div>
      </div>

      {data.length > 0 ? (
        <div className="flex flex-wrap gap-1 rounded-2xl border border-border/60 p-0.5 text-xs">
          {(
            [
              { id: "all" as const, label: `ทั้งหมด (${data.length})` },
              { id: "package" as const, label: `แพ็กเกจ (${packageCount})` },
              { id: "other" as const, label: `อื่น ๆ (${otherCount})` },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setOriginFilter(tab.id)}
              className={cn(
                "rounded-full px-2.5 py-1.5 font-medium transition-colors",
                originFilter === tab.id
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      ) : null}

      {isLoading ? (
        <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          กำลังโหลดรีวิว…
        </div>
      ) : isError ? (
        <p className="rounded-2xl border border-dashed border-border/70 px-4 py-6 text-sm text-muted-foreground">
          โหลดรีวิวไม่สำเร็จ — ลองรีเฟรชหน้าอีกครั้ง
        </p>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/70 px-4 py-8 text-center">
          <p className="text-sm font-medium text-foreground">ยังไม่มีรีวิวในหมวดนี้</p>
          <p className="mt-1 text-sm text-muted-foreground">
            เมื่อมีคนรีวิวหลังจบงาน จะโผล่ที่นี่พร้อมแหล่งที่มาจากแพ็กเกจ
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {filtered.map((review) => (
            <WorkReviewManageCard key={review.id} review={review} />
          ))}
        </ul>
      )}
    </section>
  );
}

export default DashboardReviewsPanel;
