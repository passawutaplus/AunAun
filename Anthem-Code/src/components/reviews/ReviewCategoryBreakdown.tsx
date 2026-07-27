import { StarRating } from "@/components/reviews/StarRating";
import {
  hasCategoryScores,
  WORK_REVIEW_CATEGORIES,
  type WorkReview,
} from "@/lib/workReviews";
import { cn } from "@/lib/utils";

type Props = {
  review: Pick<
    WorkReview,
    | "rating"
    | "rating_punctuality"
    | "rating_quality"
    | "rating_coop"
    | "rating_brief"
    | "rating_value"
  >;
  className?: string;
};

export function ReviewCategoryBreakdown({ review, className }: Props) {
  if (!hasCategoryScores(review)) return null;

  return (
    <ul className={cn("mt-2 space-y-1", className)}>
      {WORK_REVIEW_CATEGORIES.map((cat) => {
        const value = review[cat.column] as number | null;
        if (value == null) return null;
        return (
          <li key={cat.key} className="flex items-center justify-between gap-2 text-xs">
            <span className="text-muted-foreground">{cat.label}</span>
            <StarRating value={value} readOnly size="sm" aria-label={`${cat.label} ${value} ดาว`} />
          </li>
        );
      })}
      <li className="flex items-center justify-between gap-2 border-t border-border/40 pt-1 text-xs">
        <span className="font-medium text-foreground">เฉลี่ย</span>
        <span className="tabular-nums font-semibold text-foreground">
          {Number(review.rating).toFixed(1)}
        </span>
      </li>
    </ul>
  );
}
