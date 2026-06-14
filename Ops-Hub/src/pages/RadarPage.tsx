import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Briefcase, Loader2, Plus, Radar } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import {
  useCreateRadarItem,
  usePromoteRadarToIssue,
  useRadarItems,
  useUpdateRadarStatus,
} from "@/hooks/useRadarItems";
import { NAV_LABELS } from "@/lib/labels-th";

const STATUS_LABEL: Record<string, string> = {
  new: "ใหม่",
  reviewing: "กำลังพิจารณา",
  accepted: "รับแล้ว",
  rejected: "ไม่ทำ",
  shipped: "ปล่อยแล้ว",
};

const CATEGORY_LABEL: Record<string, string> = {
  product: "Product",
  tech: "Tech",
  infra: "Infra",
  market: "Market",
  compliance: "Compliance",
};

const CATEGORY_FILTERS = ["all", "product", "tech", "infra", "market", "compliance"] as const;

export default function RadarPage() {
  const { data, isLoading, error } = useRadarItems();
  const updateStatus = useUpdateRadarStatus();
  const createItem = useCreateRadarItem();
  const promote = usePromoteRadarToIssue();
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<(typeof CATEGORY_FILTERS)[number]>("all");

  const filtered = useMemo(() => {
    if (categoryFilter === "all") return data ?? [];
    return (data ?? []).filter((i) => i.category === categoryFilter);
  }, [data, categoryFilter]);

  const addItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    await createItem.mutateAsync({ title: title.trim(), summary: summary.trim() || undefined });
    setTitle("");
    setSummary("");
  };

  return (
    <div className="flex min-h-screen flex-col">
      <PageHeader
        title={NAV_LABELS.radar}
        subtitle="Product intel & เทรนด์ — นำมาปรับใช้กับ ecosystem"
      />

      <main className="space-y-6 p-6">
        <div className="rounded-xl border border-border bg-surface/40 px-4 py-3 text-sm text-muted">
          รายการจาก roadmap deferred, infra alerts และ notes ทีม —{" "}
          <Link to="/roadmap" className="text-brand hover:underline">
            ดู Ecosystem Roadmap
          </Link>
          {" · "}
          promote เป็น Hub Issue ได้ด้วยปุ่มด้านล่าง
        </div>

        <div className="flex flex-wrap gap-2">
          {CATEGORY_FILTERS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategoryFilter(c)}
              className={`rounded-lg px-3 py-1 text-xs font-medium ${
                categoryFilter === c ? "bg-brand text-white" : "border border-border bg-white text-muted"
              }`}
            >
              {c === "all" ? "ทั้งหมด" : (CATEGORY_LABEL[c] ?? c)}
            </button>
          ))}
        </div>

        <form onSubmit={(e) => void addItem(e)} className="rounded-xl border border-border bg-white p-4">
          <p className="mb-2 text-sm font-semibold">เพิ่มรายการ Radar</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="หัวข้อ"
              className="flex-1 rounded-lg border border-border px-3 py-2 text-sm"
            />
            <input
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="สรุป (optional)"
              className="flex-1 rounded-lg border border-border px-3 py-2 text-sm"
            />
            <button
              type="submit"
              disabled={createItem.isPending}
              className="inline-flex items-center justify-center gap-1 rounded-lg bg-brand px-4 py-2 text-sm text-white disabled:opacity-50"
            >
              {createItem.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              เพิ่ม
            </button>
          </div>
        </form>

        {error ? (
          <p className="text-sm text-red-600">โหลด Radar ไม่สำเร็จ — รัน migration ops.radar_items</p>
        ) : isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted" />
          </div>
        ) : (
          <ul className="space-y-3">
            {filtered.map((item) => (
              <li key={item.id} className="rounded-xl border border-border bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex items-start gap-2">
                    <Radar className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                    <div>
                      <p className="font-semibold">{item.title}</p>
                      {item.summary ? <p className="mt-1 text-sm text-muted">{item.summary}</p> : null}
                      <p className="mt-1 text-[10px] text-muted">
                        {CATEGORY_LABEL[item.category] ?? item.category} · impact {item.impact} · effort{" "}
                        {item.effort} · {item.source}
                      </p>
                      {item.issue_id ? (
                        <Link to="/work" className="mt-1 inline-block text-[10px] text-brand hover:underline">
                          มี Hub Issue แล้ว →
                        </Link>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {!item.issue_id ? (
                      <button
                        type="button"
                        disabled={promote.isPending}
                        onClick={() => void promote.mutateAsync(item)}
                        className="inline-flex items-center gap-1 rounded-lg border border-brand px-2 py-1 text-xs font-medium text-brand hover:bg-brand-soft"
                      >
                        {promote.isPending ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Briefcase className="h-3 w-3" />
                        )}
                        สร้าง Hub Issue
                      </button>
                    ) : null}
                    <select
                      value={item.status}
                      onChange={(e) =>
                        void updateStatus.mutateAsync({ id: item.id, status: e.target.value })
                      }
                      className="rounded-lg border border-border px-2 py-1 text-xs"
                    >
                      {Object.entries(STATUS_LABEL).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
