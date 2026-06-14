import { useMemo, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { WorkItemRow } from "@/components/WorkItemRow";
import { ActivityFeed } from "@/components/ActivityFeed";
import { useHubView } from "@/contexts/HubViewContext";
import { useWorkItemDrawer } from "@/contexts/WorkItemDrawerContext";
import { useWorkItemMutations } from "@/hooks/useWorkItemMutations";
import { useWorkItems } from "@/hooks/useWorkItems";
import { filterByHubView, inboxItems, isPersistedWorkItem } from "@/lib/work-items";
import { friendlyError } from "@/lib/friendly-error";

export default function InboxPage() {
  const { view } = useHubView();
  const { open } = useWorkItemDrawer();
  const { data, isLoading, isFetching, refetch, error } = useWorkItems();
  const { bulkUpdateStatus } = useWorkItemMutations();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const items = inboxItems(filterByHubView(data?.items ?? [], view));
  const mutableItems = useMemo(() => items.filter(isPersistedWorkItem), [items]);
  const selectedItems = useMemo(
    () => mutableItems.filter((i) => selected.has(i.id)),
    [mutableItems, selected],
  );

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selected.size === mutableItems.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(mutableItems.map((i) => i.id)));
    }
  };

  const bulkMove = async (column: "in_progress" | "done") => {
    if (selectedItems.length === 0) return;
    await bulkUpdateStatus.mutateAsync({ items: selectedItems, column });
    setSelected(new Set());
  };

  return (
    <div className="flex min-h-screen flex-col">
      <PageHeader
        title={`กล่องขาเข้า (${items.length})`}
        subtitle="งานใหม่ที่ต้องจัดการ — เลือกหลายรายการเพื่อย้ายสถานะพร้อมกัน"
        actions={
          <button
            type="button"
            onClick={() => refetch()}
            className="rounded-lg border border-border p-2 text-muted hover:text-ink"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          </button>
        }
      />
      <div className="grid flex-1 gap-6 p-6 lg:grid-cols-3">
        <div className="space-y-2 lg:col-span-2">
          {mutableItems.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-surface/30 px-3 py-2 text-xs">
              <button type="button" onClick={selectAll} className="font-medium text-brand hover:underline">
                {selected.size === mutableItems.length ? "ยกเลิกเลือกทั้งหมด" : "เลือกทั้งหมด"}
              </button>
              {selectedItems.length > 0 ? (
                <>
                  <span className="text-muted">· เลือก {selectedItems.length} รายการ</span>
                  <button
                    type="button"
                    disabled={bulkUpdateStatus.isPending}
                    onClick={() => void bulkMove("in_progress")}
                    className="rounded-lg border border-border bg-white px-2 py-1 hover:bg-surface"
                  >
                    ย้าย → กำลังทำ
                  </button>
                  <button
                    type="button"
                    disabled={bulkUpdateStatus.isPending}
                    onClick={() => void bulkMove("done")}
                    className="rounded-lg border border-border bg-white px-2 py-1 hover:bg-surface"
                  >
                    ย้าย → เสร็จแล้ว
                  </button>
                </>
              ) : null}
            </div>
          ) : null}

          {error ? (
            <p className="text-sm text-red-600">{friendlyError("โหลดกล่องขาเข้าไม่สำเร็จ")}</p>
          ) : isLoading ? (
            <div className="flex justify-center py-12 text-muted">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : items.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border py-12 text-center text-sm text-muted">
              ไม่มีงานค้าง — ทุกอย่างเรียบร้อยแล้ว
            </p>
          ) : (
            items.map((item) => (
              <WorkItemRow
                key={item.id}
                item={item}
                selected={selected.has(item.id)}
                onToggleSelect={isPersistedWorkItem(item) ? toggle : undefined}
                onClick={() => open(item)}
              />
            ))
          )}
        </div>
        <div>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">
            กิจกรรมล่าสุด
          </h2>
          <ActivityFeed compact />
        </div>
      </div>
    </div>
  );
}
