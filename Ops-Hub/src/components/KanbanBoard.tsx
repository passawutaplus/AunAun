import { useMemo, useState } from "react";
import {
  BOARD_COLUMNS,
  filterWorkItems,
  type BoardColumn,
  type WorkItem,
  type WorkItemFilters,
} from "@/lib/work-items";
import { useWorkItemMutations } from "@/hooks/useWorkItemMutations";
import { useWorkItemDrawer } from "@/contexts/WorkItemDrawerContext";

export function KanbanBoard({
  items,
  filters,
}: {
  items: WorkItem[];
  filters?: WorkItemFilters;
}) {
  const { open } = useWorkItemDrawer();
  const { updateStatus } = useWorkItemMutations();
  const [dragId, setDragId] = useState<string | null>(null);
  const [overColumn, setOverColumn] = useState<BoardColumn | null>(null);

  const filtered = useMemo(
    () => (filters ? filterWorkItems(items, filters) : items),
    [items, filters],
  );

  const byColumn = useMemo(() => {
    const map: Record<BoardColumn, WorkItem[]> = {
      triage: [],
      in_progress: [],
      in_review: [],
      done: [],
    };
    for (const item of filtered) {
      map[item.boardColumn].push(item);
    }
    return map;
  }, [filtered]);

  const onDrop = async (column: BoardColumn) => {
    if (!dragId) return;
    const item = filtered.find((i) => i.id === dragId);
    setDragId(null);
    setOverColumn(null);
    if (!item || item.boardColumn === column) return;
    try {
      await updateStatus.mutateAsync({ item, column });
    } catch {
      /* rollback via refetch */
    }
  };

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
      {BOARD_COLUMNS.map((col) => (
        <div
          key={col.id}
          onDragOver={(e) => {
            e.preventDefault();
            setOverColumn(col.id);
          }}
          onDragLeave={() => setOverColumn(null)}
          onDrop={(e) => {
            e.preventDefault();
            void onDrop(col.id);
          }}
          className={`flex min-h-[320px] flex-col rounded-xl border bg-white/60 ${
            overColumn === col.id ? "border-brand bg-brand-soft/30" : "border-border"
          }`}
        >
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted">
              {col.label}
            </span>
            <span className="rounded-full bg-surface px-2 py-0.5 text-[10px] font-bold">
              {byColumn[col.id].length}
            </span>
          </div>
          <div className="flex flex-1 flex-col gap-2 p-2">
            {byColumn[col.id].map((item) => (
              <div
                key={item.id}
                draggable
                onDragStart={() => setDragId(item.id)}
                onDragEnd={() => {
                  setDragId(null);
                  setOverColumn(null);
                }}
                onClick={() => open(item)}
                className={`cursor-grab rounded-lg border border-border bg-white p-3 shadow-sm active:cursor-grabbing ${
                  dragId === item.id ? "opacity-50" : ""
                }`}
              >
                <div className="mb-1 font-mono text-[10px] text-muted">{item.key}</div>
                <p className="line-clamp-2 text-sm font-medium">{item.title}</p>
                <div className="mt-2 flex gap-1">
                  <span className="rounded bg-surface px-1.5 py-0.5 text-[10px] capitalize">
                    {item.priority}
                  </span>
                  <span className="rounded bg-surface px-1.5 py-0.5 text-[10px]">
                    {item.app}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
