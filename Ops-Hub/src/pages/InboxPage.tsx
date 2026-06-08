import { Loader2, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { WorkItemRow } from "@/components/WorkItemRow";
import { ActivityFeed } from "@/components/ActivityFeed";
import { useHubView } from "@/contexts/HubViewContext";
import { useWorkItemDrawer } from "@/contexts/WorkItemDrawerContext";
import { useWorkItems } from "@/hooks/useWorkItems";
import { filterByHubView, inboxItems } from "@/lib/work-items";
import { friendlyError } from "@/lib/friendly-error";

export default function InboxPage() {
  const { view } = useHubView();
  const { open } = useWorkItemDrawer();
  const { data, isLoading, isFetching, refetch, error } = useWorkItems();
  const items = inboxItems(filterByHubView(data ?? [], view));

  return (
    <div className="flex min-h-screen flex-col">
      <PageHeader
        title={`กล่องขาเข้า (${items.length})`}
        subtitle="งานใหม่ที่ต้องจัดการ — เรียงตามความสำคัญและวันที่รับมา"
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
              <WorkItemRow key={item.id} item={item} onClick={() => open(item)} />
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
