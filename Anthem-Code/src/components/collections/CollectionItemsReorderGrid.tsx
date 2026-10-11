import { useState } from "react";
import {
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { thumbFeedCoverUrl } from "@/lib/feedProjectCover";
import { cn } from "@/lib/utils";

export type ReorderableWork = {
  id: string;
  title?: string | null;
  cover_url?: string | null;
};

type Props = {
  /** Works in the order they are shown today. */
  projects: ReorderableWork[];
  saving: boolean;
  onSave: (orderedIds: string[]) => void;
  onCancel: () => void;
};

function ReorderTile({ project, position }: { project: ReorderableWork; position: number }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: project.id });
  const title = project.title?.trim() || "ไม่มีชื่อ";
  const cover = thumbFeedCoverUrl(project.cover_url || "");

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      {...attributes}
      {...listeners}
      aria-label={`${position}. ${title}`}
      className={cn(
        "relative aspect-square cursor-grab select-none overflow-hidden rounded-lg bg-muted ring-1 ring-border/60",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        isDragging && "z-10 cursor-grabbing opacity-80 ring-2 ring-primary",
      )}
    >
      {cover ? <img src={cover} alt="" draggable={false} className="h-full w-full object-cover" /> : null}
      <span className="absolute left-1.5 top-1.5 rounded-full bg-background/85 px-2 py-0.5 text-[11px] font-medium tabular-nums text-foreground backdrop-blur">
        {position}
      </span>
      <span className="absolute right-1.5 top-1.5 rounded-full bg-black/45 p-1 text-white">
        <GripVertical className="h-3.5 w-3.5" aria-hidden />
      </span>
      <p className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/65 to-transparent px-2 pb-1.5 pt-6 text-[11px] text-white">
        {title}
      </p>
    </div>
  );
}

/** Drag-to-reorder grid for the works inside one collection (saved as `position`). */
export default function CollectionItemsReorderGrid({ projects, saving, onSave, onCancel }: Props) {
  const [order, setOrder] = useState(() => projects.map((p) => p.id));
  const byId = new Map(projects.map((p) => [p.id, p]));
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    setOrder((ids) => arrayMove(ids, ids.indexOf(String(active.id)), ids.indexOf(String(over.id))));
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">ลากเพื่อจัดลำดับ — คนที่เปิดคอลเลกชันนี้จะเห็นตามลำดับที่คุณจัด</p>
        <div className="flex items-center gap-2">
          <Button type="button" size="sm" variant="ghost" className="rounded-full" disabled={saving} onClick={onCancel}>
            ยกเลิก
          </Button>
          <Button
            type="button"
            size="sm"
            variant="gradient"
            className="rounded-full"
            disabled={saving}
            onClick={() => onSave(order)}
          >
            {saving ? "กำลังบันทึก..." : "เสร็จสิ้น"}
          </Button>
        </div>
      </div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={order} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
            {order.map((id, index) => {
              const project = byId.get(id);
              return project ? <ReorderTile key={id} project={project} position={index + 1} /> : null;
            })}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
