import { useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import {
  useCreateRoadmapItem,
  useOpsIssues,
  useOpsProjects,
  useRoadmapItems,
  useUpdateRoadmapItem,
  type RoadmapItem,
} from "@/hooks/useOpsIssues";
import { DEFERRED_ROADMAP, type DeferredRoadmapItem } from "@/lib/ecosystem-roadmap-deferred";

const ROADMAP_STATUS: Record<string, string> = {
  idea: "ไอเดีย",
  planned: "วางแผนแล้ว",
  in_progress: "กำลังทำ",
  shipped: "ปล่อยแล้ว",
};

const DEFERRED_STATUS: Record<string, string> = {
  stub: "Stub",
  deferred: "เลื่อนออก",
  shipped: "ปล่อยแล้ว",
};

const BOARD_COLUMNS: { id: DeferredRoadmapItem["status"]; title: string }[] = [
  { id: "stub", title: "Stub / MVP" },
  { id: "deferred", title: "เลื่อนออก" },
  { id: "shipped", title: "ปล่อยแล้ว" },
];

function RoadmapItemEditor({ item }: { item: RoadmapItem }) {
  const update = useUpdateRoadmapItem();
  const { data: issues } = useOpsIssues();

  return (
    <div className="rounded-xl border border-border bg-white px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <input
          defaultValue={item.title}
          onBlur={(e) => {
            const v = e.target.value.trim();
            if (v && v !== item.title) void update.mutateAsync({ id: item.id, patch: { title: v } });
          }}
          className="flex-1 rounded border border-transparent px-1 py-0.5 text-sm font-medium hover:border-border focus:border-brand"
        />
        <select
          value={item.status}
          onChange={(e) => void update.mutateAsync({ id: item.id, patch: { status: e.target.value } })}
          className="rounded border border-border px-2 py-0.5 text-[10px]"
        >
          {Object.entries(ROADMAP_STATUS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        {item.projects?.name ? (
          <span className="text-[10px] text-muted">{item.projects.name}</span>
        ) : null}
      </div>
      {item.description ? <p className="mt-1 text-xs text-muted">{item.description}</p> : null}
      <label className="mt-2 block text-[10px] text-muted">
        ลิงก์ Hub Issue
        <select
          value={item.issue_id ?? ""}
          onChange={(e) =>
            void update.mutateAsync({
              id: item.id,
              patch: { issue_id: e.target.value || null },
            })
          }
          className="mt-0.5 w-full rounded border border-border px-2 py-1 text-xs"
        >
          <option value="">— ไม่ลิงก์ —</option>
          {(issues ?? []).map((i) => (
            <option key={i.id} value={i.id}>
              {i.issue_number} {i.title}
            </option>
          ))}
        </select>
      </label>
      {item.issue_id ? (
        <Link to="/work" className="mt-1 inline-block text-[10px] text-brand hover:underline">
          เปิด Hub Work →
        </Link>
      ) : null}
    </div>
  );
}

export default function RoadmapPage() {
  const { data, isLoading, error } = useRoadmapItems();
  const { data: projects } = useOpsProjects();
  const createItem = useCreateRoadmapItem();
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [quarter, setQuarter] = useState("2026-Q3");
  const [projectId, setProjectId] = useState("");

  const quarters = [...new Set((data?.items ?? []).map((i) => i.quarter))].sort();
  const plannedFs = data?.plannedSuggestions ?? [];

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    await createItem.mutateAsync({
      title: title.trim(),
      quarter: quarter.trim(),
      project_id: projectId || undefined,
    });
    setTitle("");
    setShowForm(false);
  };

  return (
    <div className="flex min-h-screen flex-col">
      <PageHeader
        title="แผนงาน"
        subtitle="แก้ timeline ได้จาก UI — ลิงก์ Hub Issue และดู Ecosystem deferred"
        actions={
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="inline-flex items-center gap-1 rounded-lg bg-brand px-3 py-1.5 text-xs font-medium text-white"
          >
            <Plus className="h-3.5 w-3.5" /> เพิ่มรายการ
          </button>
        }
      />
      <div className="space-y-8 p-6">
        {showForm ? (
          <form onSubmit={(e) => void submit(e)} className="rounded-xl border border-border bg-white p-4">
            <p className="mb-2 text-sm font-semibold">เพิ่ม roadmap item</p>
            <div className="grid gap-2 sm:grid-cols-3">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="หัวข้อ"
                className="rounded-lg border border-border px-3 py-2 text-sm sm:col-span-2"
              />
              <input
                value={quarter}
                onChange={(e) => setQuarter(e.target.value)}
                placeholder="2026-Q3"
                className="rounded-lg border border-border px-3 py-2 text-sm"
              />
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="rounded-lg border border-border px-3 py-2 text-sm sm:col-span-2"
              >
                <option value="">โปรเจกต์ (ไม่ระบุ)</option>
                {(projects ?? []).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                disabled={createItem.isPending}
                className="rounded-lg bg-brand px-4 py-2 text-sm text-white disabled:opacity-50"
              >
                บันทึก
              </button>
            </div>
          </form>
        ) : null}

        {error ? (
          <div className="text-sm text-red-600">
            <p>โหลดแผนงานไม่สำเร็จ</p>
          </div>
        ) : isLoading ? (
          <div className="flex justify-center py-12 text-muted">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <>
            {quarters.length === 0 && plannedFs.length === 0 ? (
              <p className="text-sm text-muted">ยังไม่มีรายการในแผนงาน — กด เพิ่มรายการ</p>
            ) : null}
            {quarters.map((q) => (
              <section key={q}>
                <h2 className="mb-3 text-sm font-semibold">ไตรมาส {q}</h2>
                <div className="space-y-2">
                  {(data?.items ?? [])
                    .filter((i) => i.quarter === q)
                    .map((item) => (
                      <RoadmapItemEditor key={item.id} item={item} />
                    ))}
                </div>
              </section>
            ))}

            {plannedFs.length > 0 ? (
              <section>
                <h2 className="mb-3 text-sm font-semibold">ข้อเสนอจากผู้ใช้ So1o (วางแผนแล้ว)</h2>
                <div className="space-y-2">
                  {plannedFs.map((fs: Record<string, unknown>) => (
                    <div
                      key={String(fs.id)}
                      className="rounded-xl border border-dashed border-brand/40 bg-brand-soft/20 px-4 py-3"
                    >
                      <p className="text-sm font-medium">{String(fs.title)}</p>
                      <p className="text-[10px] text-muted">
                        โหวต {String(fs.upvotes ?? 0)} ครั้ง
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            <section>
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold">Ecosystem Roadmap Board</h2>
                <Link to="/radar" className="text-xs text-brand hover:underline">
                  ดู Radar →
                </Link>
              </div>
              <div className="grid gap-4 lg:grid-cols-3">
                {BOARD_COLUMNS.map((col) => (
                  <div key={col.id} className="rounded-xl border border-border bg-surface/20 p-3">
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                      {col.title}
                    </h3>
                    <div className="space-y-2">
                      {DEFERRED_ROADMAP.filter((i) => i.status === col.id).map((item) => (
                        <div key={item.id} className="rounded-lg border border-border bg-white px-3 py-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-medium">{item.title}</span>
                            <span className="text-[10px] text-muted">{item.quarter}</span>
                          </div>
                          <p className="mt-1 text-xs text-muted">{item.note}</p>
                          <Link
                            to="/radar"
                            className="mt-1 inline-block text-[10px] text-brand hover:underline"
                          >
                            id: {item.id}
                          </Link>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h2 className="mb-3 text-sm font-semibold">Ecosystem Roadmap (รายการทั้งหมด)</h2>
              <div className="space-y-2">
                {DEFERRED_ROADMAP.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl border border-border bg-white px-4 py-3"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">{item.title}</span>
                      <span className="rounded bg-surface px-2 py-0.5 text-[10px]">
                        {DEFERRED_STATUS[item.status] ?? item.status}
                      </span>
                      <span className="text-[10px] text-muted">{item.quarter}</span>
                    </div>
                    <p className="mt-1 text-xs text-muted">{item.note}</p>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
