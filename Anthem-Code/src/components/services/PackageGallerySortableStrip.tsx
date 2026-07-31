import { useMemo } from "react";
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
import { Trash2, Video } from "lucide-react";
import { isVideoUrl } from "@/lib/videoAccept";
import { cn } from "@/lib/utils";

type Props = {
  urls: string[];
  activeIndex: number;
  disabled?: boolean;
  onSelect: (index: number) => void;
  onRemove: (index: number) => void;
  onReorder: (urls: string[]) => void;
};

function SortableSlideThumb({
  id,
  url,
  index,
  active,
  disabled,
  onSelect,
  onRemove,
}: {
  id: string;
  url: string;
  index: number;
  active: boolean;
  disabled?: boolean;
  onSelect: () => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled,
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={cn(
        "relative shrink-0 touch-none",
        isDragging && "z-10 opacity-90",
      )}
    >
      <button
        type="button"
        disabled={disabled}
        onClick={onSelect}
        className={cn(
          "relative block h-14 w-[4.5rem] overflow-hidden rounded-lg border bg-muted cursor-grab active:cursor-grabbing",
          active ? "border-primary ring-2 ring-primary/30" : "border-border/60",
          isDragging && "ring-2 ring-primary/50 shadow-lg",
        )}
        {...attributes}
        {...listeners}
        aria-label={`สไลด์ที่ ${index + 1} — ลากเพื่อเรียงลำดับ`}
      >
        {isVideoUrl(url) ? (
          <div className="grid h-full place-items-center bg-black/40">
            <Video className="h-4 w-4 text-white" />
          </div>
        ) : (
          <img
            src={url}
            alt=""
            className="h-full w-full object-cover pointer-events-none"
            draggable={false}
          />
        )}
      </button>
      <button
        type="button"
        className="absolute -right-1 -top-1 rounded-full bg-black/75 p-0.5 text-white"
        disabled={disabled}
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        onPointerDown={(e) => e.stopPropagation()}
        aria-label="ลบสไลด์"
      >
        <Trash2 className="h-3 w-3" />
      </button>
    </div>
  );
}

/** Horizontal slide strip with drag-and-drop reorder. */
export default function PackageGallerySortableStrip({
  urls,
  activeIndex,
  disabled,
  onSelect,
  onRemove,
  onReorder,
}: Props) {
  const items = useMemo(
    () => urls.map((url, index) => ({ id: `slide-${index}`, url, index })),
    [urls],
  );
  const sortable = urls.length > 1 && !disabled;

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
    onReorder(arrayMove(urls, oldIndex, newIndex));
  };

  if (urls.length === 0) return null;

  const thumbs = items.map((item) =>
    sortable ? (
      <SortableSlideThumb
        key={item.id}
        id={item.id}
        url={item.url}
        index={item.index}
        active={item.index === activeIndex}
        disabled={disabled}
        onSelect={() => onSelect(item.index)}
        onRemove={() => onRemove(item.index)}
      />
    ) : (
      <div key={item.id} className="relative shrink-0">
        <button
          type="button"
          disabled={disabled}
          onClick={() => onSelect(item.index)}
          className={cn(
            "relative block h-14 w-[4.5rem] overflow-hidden rounded-lg border bg-muted",
            item.index === activeIndex
              ? "border-primary ring-2 ring-primary/30"
              : "border-border/60",
          )}
        >
          {isVideoUrl(item.url) ? (
            <div className="grid h-full place-items-center bg-black/40">
              <Video className="h-4 w-4 text-white" />
            </div>
          ) : (
            <img src={item.url} alt="" className="h-full w-full object-cover" />
          )}
        </button>
        <button
          type="button"
          className="absolute -right-1 -top-1 rounded-full bg-black/75 p-0.5 text-white"
          disabled={disabled}
          onClick={() => onRemove(item.index)}
          aria-label="ลบสไลด์"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
    ),
  );

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
      {sortable ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={items.map((m) => m.id)} strategy={horizontalListSortingStrategy}>
            {thumbs}
          </SortableContext>
        </DndContext>
      ) : (
        thumbs
      )}
    </div>
  );
}
