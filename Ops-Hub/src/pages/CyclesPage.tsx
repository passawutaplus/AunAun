import { Loader2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { useOpsCycles, useOpsIssues } from "@/hooks/useOpsIssues";

const STATUS_LABELS: Record<string, string> = {
  backlog: "คิวรอ",
  todo: "รอเริ่ม",
  in_progress: "กำลังทำ",
  in_review: "รอตรวจ",
  done: "เสร็จแล้ว",
  cancelled: "ยกเลิก",
};

const CYCLE_STATUS: Record<string, string> = {
  planned: "วางแผน",
  active: "กำลังดำเนินการ",
  completed: "จบแล้ว",
};

export default function CyclesPage() {
  const { data: cycles, isLoading: loadingCycles, error: cyclesErr } = useOpsCycles();
  const { data: issues, isLoading: loadingIssues } = useOpsIssues();

  const active = (cycles ?? []).find((c) => c.status === "active") ?? (cycles ?? [])[0];
  const cycleIssues = (issues ?? []).filter((i) => i.cycle_id === active?.id);
  const byStatus = Object.keys(STATUS_LABELS).map((status) => ({
    status,
    label: STATUS_LABELS[status],
    count: cycleIssues.filter((i) => i.status === status).length,
  }));

  const loading = loadingCycles || loadingIssues;

  return (
    <div className="flex min-h-screen flex-col">
      <PageHeader
        title="รอบงาน"
        subtitle="ดูงานในรอบ Sprint ปัจจุบัน — แยกตามสถานะว่าทำไปถึงไหนแล้ว"
      />
      <div className="space-y-6 p-6">
        {cyclesErr ? (
          <div className="text-sm text-red-600">
            <p>โหลดข้อมูลรอบงานไม่สำเร็จ</p>
            <p className="mt-1 text-xs text-muted">ฟีเจอร์นี้ต้องตั้งค่าฐานข้อมูลก่อน — ติดต่อทีมเทคนิค</p>
          </div>
        ) : loading ? (
          <div className="flex justify-center py-12 text-muted">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : !active ? (
          <p className="text-sm text-muted">ยังไม่มีรอบงาน — รอทีมเทคนิคตั้งค่าให้</p>
        ) : (
          <>
            <div className="rounded-xl border border-border bg-white p-4">
              <h2 className="text-lg font-semibold">{active.name}</h2>
              <p className="text-sm text-muted">
                {active.start_date} → {active.end_date}
                <span className="ml-2 rounded bg-brand-soft px-2 py-0.5 text-xs text-brand">
                  {CYCLE_STATUS[active.status] ?? active.status}
                </span>
              </p>
              <p className="mt-2 text-sm">มี {cycleIssues.length} งานในรอบนี้</p>
            </div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
              {byStatus.map((s) => (
                <div key={s.status} className="rounded-xl border border-border bg-white p-4 text-center">
                  <p className="text-2xl font-bold">{s.count}</p>
                  <p className="text-xs text-muted">{s.label}</p>
                </div>
              ))}
            </div>
            <section>
              <h3 className="mb-2 text-xs font-semibold text-muted">งานในรอบนี้</h3>
              <ul className="space-y-2">
                {cycleIssues.map((i) => (
                  <li
                    key={i.id}
                    className="flex items-center justify-between rounded-lg border border-border bg-white px-4 py-2 text-sm"
                  >
                    <span>
                      <span className="font-mono text-xs text-muted">{i.issue_number}</span> {i.title}
                    </span>
                    <span className="text-xs text-muted">{STATUS_LABELS[i.status] ?? i.status}</span>
                  </li>
                ))}
                {cycleIssues.length === 0 ? (
                  <li className="text-sm text-muted">ยังไม่มีงานในรอบนี้</li>
                ) : null}
              </ul>
            </section>
            {(cycles ?? []).length > 1 ? (
              <section>
                <h3 className="mb-2 text-xs font-semibold text-muted">รอบงานทั้งหมด</h3>
                <ul className="space-y-1 text-sm">
                  {(cycles ?? []).map((c) => (
                    <li key={c.id} className="text-muted">
                      {c.name} ({CYCLE_STATUS[c.status] ?? c.status})
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
