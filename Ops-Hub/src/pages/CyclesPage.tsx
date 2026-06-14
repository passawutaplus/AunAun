import { useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import {
  useCreateCycle,
  useOpsCycles,
  useOpsIssues,
  useSetActiveCycle,
  useUpdateCycle,
  useUpdateOpsIssue,
} from "@/hooks/useOpsIssues";

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
  const createCycle = useCreateCycle();
  const updateCycle = useUpdateCycle();
  const setActive = useSetActiveCycle();
  const updateIssue = useUpdateOpsIssue();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const active = (cycles ?? []).find((c) => c.id === selectedId)
    ?? (cycles ?? []).find((c) => c.status === "active")
    ?? (cycles ?? [])[0];

  const cycleIssues = (issues ?? []).filter((i) => i.cycle_id === active?.id);
  const byStatus = Object.keys(STATUS_LABELS).map((status) => ({
    status,
    label: STATUS_LABELS[status],
    count: cycleIssues.filter((i) => i.status === status).length,
  }));

  const loading = loadingCycles || loadingIssues;

  const submitCycle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !startDate || !endDate) return;
    await createCycle.mutateAsync({
      name: name.trim(),
      start_date: startDate,
      end_date: endDate,
    });
    setName("");
    setStartDate("");
    setEndDate("");
    setShowForm(false);
  };

  return (
    <div className="flex min-h-screen flex-col">
      <PageHeader
        title="รอบงาน"
        subtitle="สร้างและจัดการ Sprint — ลากงานเข้ารอบจาก Hub Work หรือเลือกด้านล่าง"
        actions={
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="inline-flex items-center gap-1 rounded-lg bg-brand px-3 py-1.5 text-xs font-medium text-white"
          >
            <Plus className="h-3.5 w-3.5" /> รอบใหม่
          </button>
        }
      />
      <div className="space-y-6 p-6">
        {showForm ? (
          <form onSubmit={(e) => void submitCycle(e)} className="rounded-xl border border-border bg-white p-4">
            <p className="mb-3 text-sm font-semibold">สร้างรอบงาน</p>
            <div className="grid gap-2 sm:grid-cols-3">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="ชื่อรอบ เช่น Cycle 2 — Jul 2026"
                className="rounded-lg border border-border px-3 py-2 text-sm sm:col-span-3"
              />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="rounded-lg border border-border px-3 py-2 text-sm"
              />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="rounded-lg border border-border px-3 py-2 text-sm"
              />
              <button
                type="submit"
                disabled={createCycle.isPending}
                className="rounded-lg bg-brand px-4 py-2 text-sm text-white disabled:opacity-50"
              >
                สร้าง
              </button>
            </div>
          </form>
        ) : null}

        {cyclesErr ? (
          <div className="text-sm text-red-600">
            <p>โหลดข้อมูลรอบงานไม่สำเร็จ</p>
          </div>
        ) : loading ? (
          <div className="flex justify-center py-12 text-muted">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : !active ? (
          <p className="text-sm text-muted">ยังไม่มีรอบงาน — กด รอบใหม่ เพื่อสร้าง</p>
        ) : (
          <>
            <div className="rounded-xl border border-border bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">{active.name}</h2>
                  <p className="text-sm text-muted">
                    {active.start_date} → {active.end_date}
                    <span className="ml-2 rounded bg-brand-soft px-2 py-0.5 text-xs text-brand">
                      {CYCLE_STATUS[active.status] ?? active.status}
                    </span>
                  </p>
                  <p className="mt-2 text-sm">มี {cycleIssues.length} งานในรอบนี้</p>
                </div>
                {active.status !== "active" ? (
                  <button
                    type="button"
                    disabled={setActive.isPending}
                    onClick={() => void setActive.mutateAsync(active.id)}
                    className="rounded-lg border border-brand px-3 py-1.5 text-xs font-medium text-brand hover:bg-brand-soft"
                  >
                    ตั้งเป็นรอบปัจจุบัน
                  </button>
                ) : null}
              </div>
              <label className="mt-3 block text-xs text-muted">
                เปลี่ยนสถานะรอบ
                <select
                  value={active.status}
                  onChange={(e) =>
                    void updateCycle.mutateAsync({
                      id: active.id,
                      patch: { status: e.target.value as "planned" | "active" | "completed" },
                    })
                  }
                  className="mt-1 rounded-lg border border-border px-2 py-1 text-sm"
                >
                  {Object.entries(CYCLE_STATUS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </label>
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
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-white px-4 py-2 text-sm"
                  >
                    <Link to="/work" className="hover:text-brand">
                      <span className="font-mono text-xs text-muted">{i.issue_number}</span> {i.title}
                    </Link>
                    <select
                      value={i.status}
                      onChange={(e) =>
                        void updateIssue.mutateAsync({ id: i.id, patch: { status: e.target.value } })
                      }
                      className="rounded border border-border px-2 py-0.5 text-xs"
                    >
                      {Object.entries(STATUS_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </li>
                ))}
                {cycleIssues.length === 0 ? (
                  <li className="text-sm text-muted">
                    ยังไม่มีงาน — assign จาก{" "}
                    <Link to="/work" className="text-brand hover:underline">
                      Hub Work
                    </Link>
                  </li>
                ) : null}
              </ul>
            </section>

            {(cycles ?? []).length > 1 ? (
              <section>
                <h3 className="mb-2 text-xs font-semibold text-muted">รอบงานทั้งหมด</h3>
                <ul className="space-y-1 text-sm">
                  {(cycles ?? []).map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(c.id)}
                        className={`text-left hover:text-brand ${c.id === active.id ? "font-semibold text-brand" : "text-muted"}`}
                      >
                        {c.name} ({CYCLE_STATUS[c.status] ?? c.status})
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            <section>
              <h3 className="mb-2 text-xs font-semibold text-muted">เพิ่มงานเข้ารอบนี้</h3>
              <ul className="max-h-48 space-y-1 overflow-y-auto text-sm">
                {(issues ?? [])
                  .filter((i) => !i.cycle_id)
                  .slice(0, 20)
                  .map((i) => (
                    <li key={i.id} className="flex items-center justify-between rounded border border-border px-3 py-1.5">
                      <span className="truncate">
                        {i.issue_number} {i.title}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          void updateIssue.mutateAsync({ id: i.id, patch: { cycle_id: active.id } })
                        }
                        className="shrink-0 text-xs text-brand hover:underline"
                      >
                        + เข้ารอบ
                      </button>
                    </li>
                  ))}
              </ul>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
