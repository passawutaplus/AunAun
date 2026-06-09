import { AlertTriangle } from "lucide-react";
import { useHubMetrics } from "@/hooks/useHubMetrics";
import { useWorkItems } from "@/hooks/useWorkItems";
import { degradedLabels } from "@/lib/resilient-query";

export function SourceDegradedBanner() {
  const { data: metrics } = useHubMetrics();
  const { data: work } = useWorkItems();

  const sources = [
    ...(metrics?.degradedSources ?? []),
    ...(work?.degradedSources ?? []),
  ];
  const unique = [...new Set(sources)];
  if (unique.length === 0) return null;

  const labels = degradedLabels(unique);

  return (
    <div
      role="status"
      className="flex items-start gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-950"
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <p>
        <strong>ข้อมูลบางส่วนโหลดไม่ครบ</strong> — แสดงเฉพาะแหล่งที่พร้อม:{" "}
        {labels.join(", ")}. แอปอื่นใน ecosystem ไม่ได้รับผลกระทบ
      </p>
    </div>
  );
}
