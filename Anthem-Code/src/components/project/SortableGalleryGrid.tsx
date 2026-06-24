import { useEffect, useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
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
import { ArrowDown, ArrowUp, Film, GripVertical, Star, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PortfolioMediaItem } from "@/lib/portfolioMedia";
import { cn } from "@/lib/utils";

const REORDER_HINT_KEY = "anthem-gallery-reorder-hint-seen";

export type GalleryLayout = "grid" | "list";

interface SortableGalleryGridProps {
  items: PortfolioMediaItem[];
  coverUrl: string;
  onReorder: (items: PortfolioMediaItem[]) => void;
  onSetCover: (url: string) => void;
  onRemove: (index: number) => void;
  layout?: GalleryLayout;
}

export function SortableGalleryGrid({
  items,
  coverUrl,
  onReorder,
  onSetCover,
  onRemove,
  layout = "grid",
}: SortableGalleryGridProps) {
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    if (items.length < 2) return;
    try {
      if (!localStorage.getItem(REORDER_HINT_KEY)) setShowHint(true);
    } catch {
      /* ignore */
    }
  }, [items.length]);

  const dismissHint = () => {
    setShowHint(false);
    try {
      localStorage.setItem(REORDER_HINT_KEY, "1");
    } catch {
      /* ignore */
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 300, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((m) => m.id === active.id);
    const newIndex = items.findIndex((m) => m.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    onReorder(arrayMove(items, oldIndex, newIndex));
    dismissHint();
  };

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= items.length) return;
    onReorder(arrayMove(items, i, j));
  };

  if (items.length === 0) return null;

  return (
    <div className="space-y-2">
      {showHint && (
        <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
          จิ้มค้างแล้วลากเพื่อสลับลำดับ · กดดาวเพื่อตั้งภาพปก (เฉพาะรูป)
        </p>
      )}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={items.map((m) => m.id)} strategy={rectSortingStrategy}>
          <div
            className={cn(
              layout === "grid"
                ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3"
                : "space-y-3",
            )}
          >
            {items.map((item, i) => (
              <SortableThumb
                key={item.id}
                item={item}
                index={i}
                isCover={item.kind === "image" && coverUrl === item.url}
                layout={layout}
                total={items.length}
                onSetCover={() => onSetCover(item.url)}
                onRemove={() => onRemove(i)}
                onMoveUp={() => move(i, -1)}
                onMoveDown={() => move(i, 1)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}

function SortableThumb({
  item,
  index,
  isCover,
  layout,
  total,
  onSetCover,
  onRemove,
  onMoveUp,
  onMoveDown,
}: {
  item: PortfolioMediaItem;
  index: number;
  isCover: boolean;
  layout: GalleryLayout;
  total: number;
  onSetCover: () => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const label = item.kind === "video" ? `วิดีโอ ${index + 1}` : `ภาพที่ ${index + 1}`;

  if (layout === "list") {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className={cn(
          "group relative rounded-2xl overflow-hidden border border-border bg-card",
          isDragging && "opacity-60 shadow-lg z-10",
        )}
      >
        {item.kind === "video" ? (
          <video src={item.url} className="w-full max-h-[600px] object-contain bg-black" controls playsInline />
        ) : (
          <img src={item.url} alt={label} className="w-full max-h-[600px] object-contain bg-muted/30" loading="lazy" />
        )}
        <div className="absolute top-2 left-2 flex items-center gap-1 bg-background/80 backdrop-blur-sm rounded-full px-2 py-1 text-xs">
          <button type="button" className="touch-none cursor-grab active:cursor-grabbing" {...attributes} {...listeners}>
            <GripVertical className="w-3 h-3" />
          </button>
          {item.kind === "video" && <Film className="w-3 h-3 text-muted-foreground" />}
          {label}
          {isCover && <span className="text-primary font-semibold ml-1">· ปก</span>}
        </div>
        <div className="absolute top-2 right-2 flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
          {item.kind === "image" && (
            <Button size="icon" variant="secondary" className="h-8 w-8 rounded-full" onClick={onSetCover} title="ตั้งเป็นภาพปก">
              <Star className={cn("w-4 h-4", isCover && "fill-primary text-primary")} />
            </Button>
          )}
          <Button size="icon" variant="secondary" className="h-8 w-8 rounded-full" onClick={onMoveUp} disabled={index === 0}>
            <ArrowUp className="w-4 h-4" />
          </Button>
          <Button size="icon" variant="secondary" className="h-8 w-8 rounded-full" onClick={onMoveDown} disabled={index === total - 1}>
            <ArrowDown className="w-4 h-4" />
          </Button>
          <Button size="icon" variant="destructive" className="h-8 w-8 rounded-full" onClick={onRemove}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative aspect-square rounded-xl overflow-hidden border bg-muted/30",
        isCover ? "border-primary ring-2 ring-primary/30" : "border-border",
        isDragging && "opacity-60 shadow-lg z-10",
      )}
    >
      {item.kind === "video" ? (
        <>
          <video src={item.url} className="w-full h-full object-cover bg-black" muted playsInline />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <Film className="w-8 h-8 text-white/90 drop-shadow" />
          </div>
        </>
      ) : (
        <img src={item.url} alt={label} className="w-full h-full object-cover" loading="lazy" />
      )}
      <button
        type="button"
        className="absolute top-1.5 left-1.5 p-1 rounded-md bg-background/80 backdrop-blur-sm touch-none cursor-grab active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="w-3.5 h-3.5 text-muted-foreground" />
      </button>
      {isCover && (
        <span className="absolute top-1.5 right-1.5 text-[10px] font-semibold bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full">
          ปก
        </span>
      )}
      {item.kind === "video" && !isCover && (
        <span className="absolute top-1.5 right-1.5 text-[10px] font-semibold bg-black/70 text-white px-1.5 py-0.5 rounded-full">
          วิดีโอ
        </span>
      )}
      <div className="absolute bottom-0 inset-x-0 flex justify-center gap-0.5 p-1.5 bg-gradient-to-t from-black/60 to-transparent opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
        {item.kind === "image" && (
          <Button size="icon" variant="secondary" className="h-7 w-7 rounded-full" onClick={onSetCover} title="ตั้งเป็นภาพปก">
            <Star className={cn("w-3.5 h-3.5", isCover && "fill-primary text-primary")} />
          </Button>
        )}
        <Button size="icon" variant="destructive" className="h-7 w-7 rounded-full" onClick={onRemove}>
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
      <span className="absolute bottom-1 left-1.5 text-[10px] text-white/90 font-medium sm:group-hover:opacity-0">
        {index + 1}
      </span>
    </div>
  );
}
