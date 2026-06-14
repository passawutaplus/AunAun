import { Link } from "react-router-dom";
import { useOpsCycles, useOpsIssues, useRoadmapItems, useUpdateOpsIssue } from "@/hooks/useOpsIssues";
import type { WorkItem } from "@/lib/work-items";

const OPS_STATUS: Record<string, string> = {
  backlog: "คิวรอ",
  todo: "รอเริ่ม",
  in_progress: "กำลังทำ",
  in_review: "รอตรวจ",
  done: "เสร็จแล้ว",
  cancelled: "ยกเลิก",
};

export function OpsIssueFields({
  item,
  busy,
  onPatch,
}: {
  item: WorkItem;
  busy: boolean;
  onPatch: (fn: () => Promise<unknown>) => void;
}) {
  const updateIssue = useUpdateOpsIssue();
  const { data: cycles } = useOpsCycles();
  const { data: issues } = useOpsIssues();
  const { data: roadmap } = useRoadmapItems();

  const opsRow = (issues ?? []).find((i) => i.id === item.sourceId);
  const linkedRoadmap = (roadmap?.items ?? []).find((r) => r.issue_id === item.sourceId);

  return (
    <div className="space-y-3 border-t border-border pt-4">
      <label className="block text-xs font-semibold text-muted">
        สถานะ Hub Issue
        <select
          disabled={busy}
          value={item.rawStatus}
          onChange={(e) =>
            onPatch(() =>
              updateIssue.mutateAsync({
                id: item.sourceId,
                patch: { status: e.target.value },
              }),
            )
          }
          className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
        >
          {Object.entries(OPS_STATUS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </label>

      <label className="block text-xs font-semibold text-muted">
        รอบงาน (Cycle)
        <select
          disabled={busy}
          value={opsRow?.cycle_id ?? ""}
          onChange={(e) =>
            onPatch(() =>
              updateIssue.mutateAsync({
                id: item.sourceId,
                patch: { cycle_id: e.target.value || null },
              }),
            )
          }
          className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm"
        >
          <option value="">ไม่ระบุ</option>
          {(cycles ?? []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>

      {linkedRoadmap ? (
        <p className="text-xs text-muted">
          แผนงาน:{" "}
          <Link to="/roadmap" className="text-brand hover:underline">
            {linkedRoadmap.title} ({linkedRoadmap.quarter})
          </Link>
        </p>
      ) : null}
    </div>
  );
}
