import { Briefcase } from "lucide-react";
import { formatServicePriceRange } from "@/hooks/useCreatorServices";

type Props = {
  title: string;
  priceThb?: number | null;
  priceMinThb?: number | null;
  coverUrl?: string | null;
  summary?: string | null;
  label?: string;
};

/** Cover + title chip when hire starts from a creator service package. */
export default function ServiceReferencePreview({
  title,
  priceThb,
  priceMinThb,
  coverUrl,
  summary,
  label = "Package",
}: Props) {
  if (!title.trim()) return null;
  const max = typeof priceThb === "number" ? priceThb : null;
  const min = typeof priceMinThb === "number" ? priceMinThb : max;

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-muted/30 p-3">
      {coverUrl?.trim() ? (
        <img src={coverUrl} alt="" className="h-16 w-16 shrink-0 rounded-lg object-cover" />
      ) : (
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Briefcase className="h-6 w-6" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <p className="truncate text-sm font-medium text-foreground">{title}</p>
        {max != null ? (
          <p className="text-xs font-semibold text-primary tabular-nums">
            {formatServicePriceRange(min ?? max, max)}
          </p>
        ) : null}
        {summary?.trim() ? (
          <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">{summary}</p>
        ) : null}
      </div>
    </div>
  );
}
