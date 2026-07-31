import { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { StarAverageLabel } from "@/components/reviews/StarRating";
import { WorkReviewManageCard } from "@/components/reviews/WorkReviewManageCard";
import { useSubjectWorkReviews } from "@/hooks/useWorkReviews";
import {
  averageRating,
  reviewHasPackageOrigin,
  type WorkReviewFilter,
} from "@/lib/workReviews";
import { cn } from "@/lib/utils";

type Props = {
  subjectUserId: string;
  className?: string;
};

/** Owner portfolio tab: all received reviews in one place (reply / report). */
export default function PortfolioReviewsManagePanel({ subjectUserId, className }: Props) {
  const [filter, setFilter] = useState<WorkReviewFilter>("all");
  const hireQ = useSubjectWorkReviews(subjectUserId, "hire");
  const collabQ = useSubjectWorkReviews(subjectUserId, "collab");

  const hire = hireQ.data ?? [];
  const collab = collabQ.data ?? [];
  const all = useMemo(
    () => [...hire, ...collab].sort((a, b) => b.created_at.localeCompare(a.created_at)),
    [hire, collab],
  );
  const fromPackage = useMemo(() => all.filter(reviewHasPackageOrigin), [all]);

  const list = useMemo(() => {
    if (filter === "hire") return hire;
    if (filter === "collab") return collab;
    if (filter === "package") return fromPackage;
    return all;
  }, [filter, hire, collab, fromPackage, all]);

  const avg = averageRating(list);
  const loading = hireQ.isLoading || collabQ.isLoading;
  const errored = hireQ.isError || collabQ.isError;

  const tabs: { id: WorkReviewFilter; label: string }[] = [
    { id: "all", label: `ทั้งหมด (${all.length})` },
    { id: "hire", label: `จ้างงาน (${hire.length})` },
    { id: "collab", label: `คอลแลป (${collab.length})` },
    { id: "package", label: `แพ็กเกจ (${fromPackage.length})` },
  ];

  return (
    <section className={cn("space-y-4", className)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <StarAverageLabel average={avg} count={list.length} />
        <div className="flex flex-wrap gap-1 rounded-2xl border border-border/60 p-0.5 text-xs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              className={cn(
                "rounded-full px-2.5 py-1.5 font-medium transition-colors",
                filter === tab.id
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
        <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          กำลังโหลดรีวิว…
        </div>
      ) : errored ? (
        <p className="rounded-2xl border border-dashed border-border/70 px-4 py-6 text-sm text-muted-foreground">
          โหลดรีวิวไม่สำเร็จ — ลองรีเฟรชหน้าอีกครั้ง
        </p>
      ) : list.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/70 px-5 py-10 text-center">
          <p className="text-sm font-medium text-foreground">ยังไม่มีรีวิวในหมวดนี้</p>
          <p className="mt-1 text-sm text-muted-foreground">
            รีวิวจะโผล่หลังจบงานจ้างหรือคอลแลป — และบอกได้ว่ามาจากแพ็กเกจไหน
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {list.map((review) => (
            <WorkReviewManageCard key={review.id} review={review} />
          ))}
        </ul>
      )}
    </section>
  );
}
