import { Link } from "react-router-dom";
import { Briefcase, ImageIcon } from "lucide-react";
import type { WorkReviewWithAuthor } from "@/lib/workReviews";
import { cn } from "@/lib/utils";

type Props = {
  review: WorkReviewWithAuthor;
  className?: string;
  /** When false, hide “จากผลงาน” badge (package-only origin). Default true. */
  showProject?: boolean;
};

/** Badges showing whether a review came from a package and/or portfolio project. */
export function ReviewOriginBadges({ review, className, showProject = true }: Props) {
  const serviceId = review.service_id || review.origin?.serviceId || null;
  const serviceTitle = review.origin?.serviceTitle?.trim() || null;
  const projectId = showProject ? review.project_id || review.origin?.projectId || null : null;
  const projectTitle = showProject ? review.origin?.projectTitle?.trim() || null : null;

  if (!serviceId && !projectId) return null;

  return (
    <div className={cn("mt-2 flex flex-wrap gap-1.5", className)}>
      {serviceId ? (
        <Link
          to={`/service/${serviceId}`}
          className="inline-flex max-w-full items-center gap-1 rounded-full border border-primary/20 bg-primary/5 px-2 py-0.5 text-[10px] font-medium text-primary hover:bg-primary/10"
        >
          <Briefcase className="h-3 w-3 shrink-0" />
          <span className="truncate">
            จากแพ็กเกจ{serviceTitle ? ` · ${serviceTitle}` : ""}
          </span>
        </Link>
      ) : null}
      {projectId ? (
        <Link
          to={`/project/${projectId}`}
          className="inline-flex max-w-full items-center gap-1 rounded-full border border-border/70 bg-muted/50 px-2 py-0.5 text-[10px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted"
        >
          <ImageIcon className="h-3 w-3 shrink-0" />
          <span className="truncate">
            จากผลงาน{projectTitle ? ` · ${projectTitle}` : ""}
          </span>
        </Link>
      ) : null}
    </div>
  );
}
