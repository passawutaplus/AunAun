import { FolderKanban } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  coverUrl?: string | null;
  label?: string;
  /** When set, the whole card opens that work / package. */
  to?: string | null;
  className?: string;
  /** Compact chip for inbox header (top-right). */
  compact?: boolean;
};

/** Cover + title chip when hire/collab starts from a specific project. */
const ProjectReferencePreview = ({
  title,
  coverUrl,
  label = "อ้างอิงผลงาน",
  to,
  className,
  compact = false,
}: Props) => {
  if (!title?.trim()) return null;

  const thumb = compact ? "h-11 w-11 rounded-md" : "h-16 w-16 rounded-lg";
  const icon = compact ? "h-4 w-4" : "h-6 w-6";

  const body = (
    <>
      {coverUrl?.trim() ? (
        <img loading="lazy" decoding="async" src={coverUrl} alt="" className={cn("shrink-0 object-cover", thumb)} />
      ) : (
        <div
          className={cn(
            "flex shrink-0 items-center justify-center bg-primary/10 text-primary",
            thumb,
          )}
        >
          <FolderKanban className={icon} />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "font-medium tracking-wider text-muted-foreground",
            compact ? "text-[9px] leading-tight" : "text-[10px] uppercase",
          )}
        >
          {label}
        </p>
        <p
          className={cn(
            "truncate font-medium text-foreground",
            compact ? "text-xs" : "text-sm",
          )}
        >
          {title}
        </p>
      </div>
    </>
  );

  const surface = cn(
    "flex items-center border border-border/60 bg-muted/30",
    compact ? "gap-2 rounded-lg p-1.5 max-w-[11.5rem]" : "w-full gap-3 rounded-xl p-3",
    to && "transition-colors hover:border-primary/40 hover:bg-muted/50",
    className,
  );

  if (to) {
    return (
      <Link to={to} className={surface}>
        {body}
      </Link>
    );
  }

  return <div className={surface}>{body}</div>;
};

export default ProjectReferencePreview;
