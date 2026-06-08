import { AlertCircle, ChevronRight } from "lucide-react";
import type { WorkItem } from "@/lib/work-items";
import { SOURCE_LABELS } from "@/lib/work-items";

const PRIORITY_STYLES: Record<string, string> = {
  urgent: "text-red-600",
  high: "text-orange-600",
  medium: "text-muted",
  low: "text-muted/70",
};

const APP_BADGE: Record<string, string> = {
  so1o: "bg-brand/10 text-brand",
  an1hem: "bg-an1hem/10 text-an1hem",
  ecosystem: "bg-ink/10 text-ink",
};

export function WorkItemRow({
  item,
  onClick,
}: {
  item: WorkItem;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-xl border border-border bg-white px-4 py-3 text-left transition hover:border-brand/40 hover:shadow-sm"
    >
      {(item.priority === "urgent" || item.priority === "high") && (
        <AlertCircle className={`h-4 w-4 shrink-0 ${PRIORITY_STYLES[item.priority]}`} />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs text-muted">{item.key}</span>
          <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${APP_BADGE[item.app]}`}>
            {item.app === "so1o" ? "So1o" : item.app === "an1hem" ? "an1hem" : "Eco"}
          </span>
          <span className="text-[10px] text-muted">{SOURCE_LABELS[item.source]}</span>
        </div>
        <p className="truncate text-sm font-medium">{item.title}</p>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted" />
    </button>
  );
}
