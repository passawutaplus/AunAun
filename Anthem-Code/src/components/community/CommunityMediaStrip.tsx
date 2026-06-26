import { useRef } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Loader2, Plus, Play, X } from "lucide-react";
import type { PortfolioMediaItem } from "@/lib/portfolioMedia";
import { cn } from "@/lib/utils";

type Props = {
  items: PortfolioMediaItem[];
  uploading: boolean;
  pickDisabled?: boolean;
  onPickFile: (file: File) => void;
  onRemove: (index: number) => void;
  onReorder: (items: PortfolioMediaItem[]) => void;
};

function SortableMediaThumb({
  item,
  index,
  onRemove,
}: {
  item: PortfolioMediaItem;
  index: number;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative shrink-0 w-20 h-20 rounded-xl overflow-hidden bg-muted touch-none",
        "cursor-grab active:cursor-grabbing",
        isDragging && "z-10 opacity-80 shadow-lg ring-2 ring-primary/40",
      )}
      {...attributes}
      {...listeners}
    >
      {item.kind === "video" ? (
        <div className="w-full h-full grid place-items-center bg-muted">
          <Play className="w-6 h-6 text-muted-foreground" />
        </div>
      ) : (
        <img src={item.url} alt="" className="w-full h-full object-cover pointer-events-none" draggable={false} />
      )}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        onPointerDown={(e) => e.stopPropagation()}
        className="absolute top-1 right-1 z-10 rounded-full bg-black/55 p-0.5 text-white"
        aria-label="ลบสื่อ"
      >
        <X className="w-3 h-3" />
      </button>
      {index === 0 && (
        <span className="absolute bottom-1 left-1 rounded bg-black/50 px-1 py-px text-[9px] font-medium text-white pointer-events-none">
          หลัก
        </span>
      )}
    </div>
  );
}

export function CommunityMediaStrip({
  items,
  uploading,
  pickDisabled,
  onPickFile,
  onRemove,
  onReorder,
}: Props) {
  const mediaRef = useRef<HTMLInputElement>(null);
  const sortable = items.length > 1;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 280, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((m) => m.id === active.id);
    const newIndex = items.findIndex((m) => m.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    onReorder(arrayMove(items, oldIndex, newIndex));
  };

  const thumbs = items.map((item, index) =>
    sortable ? (
      <SortableMediaThumb key={item.id} item={item} index={index} onRemove={() => onRemove(index)} />
    ) : (
      <div key={item.id} className="relative shrink-0 w-20 h-20 rounded-xl overflow-hidden bg-muted">
        {item.kind === "video" ? (
          <div className="w-full h-full grid place-items-center bg-muted">
            <Play className="w-6 h-6 text-muted-foreground" />
          </div>
        ) : (
          <img src={item.url} alt="" className="w-full h-full object-cover" />
        )}
        <button
          type="button"
          onClick={() => onRemove(index)}
          className="absolute top-1 right-1 rounded-full bg-black/55 p-0.5 text-white"
          aria-label="ลบสื่อ"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    ),
  );

  return (
    <div className="px-4 py-3">
      {sortable && (
        <p className="mb-2 text-[11px] text-muted-foreground">กดค้างแล้วลากเพื่อสลับลำดับ</p>
      )}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
        {sortable ? (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={items.map((m) => m.id)} strategy={horizontalListSortingStrategy}>
              {thumbs}
            </SortableContext>
          </DndContext>
        ) : (
          thumbs
        )}

        <button
          type="button"
          onClick={() => mediaRef.current?.click()}
          disabled={uploading || pickDisabled}
          className={cn(
            "shrink-0 w-20 h-20 rounded-xl border-2 border-dashed border-primary/70",
            "flex flex-col items-center justify-center gap-1 text-primary",
            "hover:border-primary hover:bg-primary/5 transition-colors disabled:opacity-50",
          )}
        >
          {uploading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <Plus className="w-5 h-5" />
              <span className="text-[10px] font-medium">เพิ่ม</span>
            </>
          )}
        </button>
      </div>

      <input
        ref={mediaRef}
        type="file"
        accept="image/*,video/*"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onPickFile(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}
