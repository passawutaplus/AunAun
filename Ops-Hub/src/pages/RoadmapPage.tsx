import { Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { useRoadmapItems } from "@/hooks/useOpsIssues";
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

export default function RoadmapPage() {
  const { data, isLoading, error } = useRoadmapItems();

  const quarters = [...new Set((data?.items ?? []).map((i) => i.quarter))].sort();
  const plannedFs = data?.plannedSuggestions ?? [];

  return (
    <div className="flex min-h-screen flex-col">
      <PageHeader
        title="แผนงาน"
        subtitle="Timeline ไตรมาส + ข้อเสนอผู้ใช้ + Ecosystem deferred items"
      />
      <div className="space-y-8 p-6">
        {error ? (
          <div className="text-sm text-red-600">
            <p>โหลดแผนงานไม่สำเร็จ</p>
            <p className="mt-1 text-xs text-muted">ฟีเจอร์นี้ต้องตั้งค่าฐานข้อมูลก่อน — ติดต่อทีมเทคนิค</p>
          </div>
        ) : isLoading ? (
          <div className="flex justify-center py-12 text-muted">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <>
            {quarters.length === 0 && plannedFs.length === 0 ? (
              <p className="text-sm text-muted">ยังไม่มีรายการในแผนงาน</p>
            ) : null}
            {quarters.map((q) => (
              <section key={q}>
                <h2 className="mb-3 text-sm font-semibold">ไตรมาส {q}</h2>
                <div className="space-y-2">
                  {(data?.items ?? [])
                    .filter((i) => i.quarter === q)
                    .map((item) => (
                      <div
                        key={item.id}
                        className="rounded-xl border border-border bg-white px-4 py-3"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{item.title}</span>
                          <span className="rounded bg-surface px-2 py-0.5 text-[10px]">
                            {ROADMAP_STATUS[item.status] ?? item.status}
                          </span>
                          {item.projects?.name ? (
                            <span className="text-[10px] text-muted">{item.projects.name}</span>
                          ) : null}
                        </div>
                        {item.description ? (
                          <p className="mt-1 text-xs text-muted">{item.description}</p>
                        ) : null}
                      </div>
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
