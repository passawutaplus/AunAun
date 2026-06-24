import { Bot } from "lucide-react";
import { triageReport, REPORT_REC_LABEL } from "@/lib/reportAiTriage";

type ReportAiFields = {
  ai_priority?: number | null;
  ai_summary?: string | null;
  ai_recommendation?: string | null;
};

export function enrichReportRow<T extends ReportAiFields & {
  reason: string;
  target_type: string;
  details?: string;
  evidence_files?: unknown[];
}>(row: T): T & { ai_priority: number; ai_summary: string; ai_recommendation: string } {
  if (row.ai_summary) {
    return row as T & { ai_priority: number; ai_summary: string; ai_recommendation: string };
  }
  const ev = Array.isArray(row.evidence_files) ? row.evidence_files.length : 0;
  const triage = triageReport({
    reason: row.reason,
    target_type: row.target_type,
    details: row.details,
    evidence_count: ev,
  });
  return {
    ...row,
    ai_priority: triage.priority_score,
    ai_summary: triage.summary,
    ai_recommendation: triage.recommendation,
  };
}

export function ReportAiSummaryCard({
  priority,
  summary,
  recommendation,
  compact,
}: {
  priority?: number | null;
  summary?: string | null;
  recommendation?: string | null;
  compact?: boolean;
}) {
  if (!summary) return null;
  const urgent = (priority ?? 0) >= 70 || recommendation === "urgent";
  return (
    <div
      className={`rounded-lg border p-2 space-y-0.5 ${
        urgent
          ? "border-destructive/30 bg-destructive/5"
          : "border-admin-border bg-admin-hover/20"
      } ${compact ? "text-[11px]" : "text-xs"}`}
    >
      <p className="font-medium flex items-center gap-1 text-admin-accent">
        <Bot className={compact ? "w-3 h-3" : "w-3.5 h-3.5"} />
        AI สรุป · ไม่ auto-resolve
      </p>
      <p className="text-admin-muted">
        ลำดับ {priority ?? "—"}/100
        {recommendation ? ` · ${REPORT_REC_LABEL[recommendation] ?? recommendation}` : ""}
      </p>
      {!compact && <p className="text-sm text-admin-fg">{summary}</p>}
      {compact && <p className="line-clamp-2 text-admin-fg">{summary}</p>}
    </div>
  );
}
