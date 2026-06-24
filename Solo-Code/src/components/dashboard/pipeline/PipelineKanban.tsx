import * as React from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { cn } from "@/lib/utils";
import { PIPELINE_COLUMNS, PIPELINE_LABELS, type PipelineColumn } from "@/lib/pipelineStatus";
import type { PipelineDeal } from "@/store/pipeline";
import { DealCard } from "./DealCard";

function DraggableDeal({
  deal,
  onSelect,
}: {
  deal: PipelineDeal;
  onSelect: (d: PipelineDeal) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: deal.quotation.id,
  });
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      <DealCard deal={deal} onClick={() => onSelect(deal)} dragging={isDragging} />
    </div>
  );
}

function PipelineColumn({
  column,
  deals,
  onSelect,
}: {
  column: PipelineColumn;
  deals: PipelineDeal[];
  onSelect: (d: PipelineDeal) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex-shrink-0 w-[200px] sm:w-[220px] rounded-xl border bg-muted/30 flex flex-col max-h-[calc(100vh-280px)]",
        isOver && "ring-2 ring-[#FF5F05]/40",
      )}
    >
      <div className="px-3 py-2 border-b shrink-0">
        <p className="text-xs font-semibold">{PIPELINE_LABELS[column]}</p>
        <p className="text-[10px] text-muted-foreground">{deals.length} ดีล</p>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {deals.map((d) => (
          <DraggableDeal key={d.quotation.id} deal={d} onSelect={onSelect} />
        ))}
      </div>
    </div>
  );
}

export function PipelineKanban({
  deals,
  onColumnChange,
  onSelect,
}: {
  deals: PipelineDeal[];
  onColumnChange: (dealId: string, to: PipelineColumn) => void;
  onSelect: (d: PipelineDeal) => void;
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const active = deals.find((d) => d.quotation.id === activeId);

  const byColumn = React.useMemo(() => {
    const map = new Map<PipelineColumn, PipelineDeal[]>();
    for (const c of PIPELINE_COLUMNS) map.set(c, []);
    for (const d of deals) map.get(d.column)!.push(d);
    return map;
  }, [deals]);

  const onDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    const overId = e.over?.id;
    if (!overId || !e.active.id) return;
    const dealId = String(e.active.id);
    const newCol = String(overId) as PipelineColumn;
    if (!PIPELINE_COLUMNS.includes(newCol)) return;
    const deal = deals.find((d) => d.quotation.id === dealId);
    if (!deal || deal.column === newCol) return;
    onColumnChange(dealId, newCol);
  };

  return (
    <DndContext
      sensors={sensors}
      onDragStart={(e: DragStartEvent) => setActiveId(String(e.active.id))}
      onDragEnd={onDragEnd}
    >
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
        {PIPELINE_COLUMNS.map((col) => (
          <PipelineColumn
            key={col}
            column={col}
            deals={byColumn.get(col) ?? []}
            onSelect={onSelect}
          />
        ))}
      </div>
      <DragOverlay>
        {active ? <DealCard deal={active} onClick={() => {}} dragging /> : null}
      </DragOverlay>
    </DndContext>
  );
}
