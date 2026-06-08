import { useState } from "react";
import { Loader2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { WorkItemRow } from "@/components/WorkItemRow";
import { WorkItemFilters } from "@/components/WorkItemFilters";
import { useHubView } from "@/contexts/HubViewContext";
import { useWorkItemDrawer } from "@/contexts/WorkItemDrawerContext";
import { useWorkItems } from "@/hooks/useWorkItems";
import {
  filterByHubView,
  filterWorkItems,
  sortInboxItems,
  type WorkItemFilters as Filters,
} from "@/lib/work-items";
import { friendlyError } from "@/lib/friendly-error";

const DEFAULT_FILTERS: Filters = {
  search: "",
  source: "all",
  priority: "all",
  column: "all",
};

export default function IssuesPage() {
  const { view } = useHubView();
  const { open } = useWorkItemDrawer();
  const { data, isLoading, error } = useWorkItems();
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const items = sortInboxItems(
    filterWorkItems(filterByHubView(data ?? [], view), filters),
  );

  return (
    <div className="flex min-h-screen flex-col">
      <PageHeader
        title="รายการทั้งหมด"
        subtitle="ตั๋วซัพพอร์ต ฟีดแบ็ก รายงานเนื้อหา และงานภายใน — ค้นหาและกรองได้"
        actions={<WorkItemFilters filters={filters} onChange={setFilters} />}
      />
      <div className="space-y-2 p-6">
        {error ? (
          <p className="text-sm text-red-600">{friendlyError("โหลดรายการไม่สำเร็จ")}</p>
        ) : isLoading ? (
          <div className="flex justify-center py-12 text-muted">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted">ไม่พบรายการตามที่ค้นหา — ลองเปลี่ยนตัวกรอง</p>
        ) : (
          items.map((item) => (
            <WorkItemRow key={item.id} item={item} onClick={() => open(item)} />
          ))
        )}
      </div>
    </div>
  );
}
