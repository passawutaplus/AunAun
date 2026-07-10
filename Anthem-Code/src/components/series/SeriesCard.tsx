import { Link } from "react-router-dom";
import { FolderKanban, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProjectSeries } from "@/hooks/useProjectSeries";

interface Props {
  series: ProjectSeries;
  to?: string;
  className?: string;
  compact?: boolean;
}

export function SeriesCard({ series, to, className, compact = false }: Props) {
  const href = to ?? `/series/${series.id}`;
  const covers = series.covers ?? [];
  const placeholders = Array.from({ length: 4 - covers.length });
  const count = series.published_count ?? series.item_count ?? 0;

  return (
    <Link
      to={href}
      className={cn(
        "group block rounded-xl overflow-hidden glass-panel hover:shadow-lg transition-all",
        className,
      )}
    >
      <div className="relative aspect-[4/3] bg-muted overflow-hidden">
        {covers.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center text-primary">
            <FolderKanban className="w-10 h-10" strokeWidth={2.25} />
          </div>
        ) : (
          <div className="grid grid-cols-2 grid-rows-2 gap-0.5 absolute inset-0">
            {covers.map((url, i) => (
              <img
                key={i}
                src={url}
                alt=""
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                loading="lazy"
              />
            ))}
            {placeholders.map((_, i) => (
              <div key={`p-${i}`} className="bg-muted" />
            ))}
          </div>
        )}
        {!series.is_public && (
          <span className="absolute top-2 left-2 inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-background/70 backdrop-blur-md text-foreground/80">
            <Lock className="w-3 h-3" /> ส่วนตัว
          </span>
        )}
      </div>
      <div className={cn("px-2 py-2 sm:px-3 sm:py-2.5")}>
        <h3
          className={cn(
            "font-medium text-foreground thai-body leading-snug",
            compact ? "text-xs sm:text-sm line-clamp-2" : "text-sm font-semibold line-clamp-1",
          )}
        >
          {series.title}
        </h3>
        <div
          className={cn(
            "flex items-center justify-between text-muted-foreground mt-0.5 gap-2",
            compact ? "text-[10px] sm:text-[11px]" : "text-[11px]",
          )}
        >
          <span>{count} ชิ้น</span>
          {series.client_label ? <span className="truncate">{series.client_label}</span> : null}
        </div>
      </div>
    </Link>
  );
}
