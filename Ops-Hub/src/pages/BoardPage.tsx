import { useState } from "react";
import { Loader2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { KanbanBoard } from "@/components/KanbanBoard";
import { WorkItemFilters } from "@/components/WorkItemFilters";
import { useHubView } from "@/contexts/HubViewContext";
import { useWorkItems } from "@/hooks/useWorkItems";
import { filterByHubView, type WorkItemFilters as Filters } from "@/lib/work-items";
import { friendlyError } from "@/lib/friendly-error";

const DEFAULT_FILTERS: Filters = {
  search: "",
  source: "all",
  priority: "all",
  column: "all",
};

export default function BoardPage() {
  const { view } = useHubView();
  const { data, isLoading, error } = useWorkItems();
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const items = filterByHubView(data?.items ?? [], view);

  return (
    <div className="flex min-h-screen flex-col">
      <PageHeader
        title="บอร์ดงาน"
        subtitle="ลากการ์ดไปคอลัมน์อื่นเพื่อเปลี่ยนสถานะ — รวมงานจาก So1o, an1hem และงานภายใน"
        actions={<WorkItemFilters filters={filters} onChange={setFilters} />}
      />
      <div className="flex-1 overflow-x-auto p-6">
        {error ? (
          <p className="text-sm text-red-600">{friendlyError("โหลดบอร์ดงานไม่สำเร็จ")}</p>
        ) : isLoading ? (
          <div className="flex justify-center py-12 text-muted">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <KanbanBoard items={items} filters={filters} />
        )}
      </div>
    </div>
  );
}
