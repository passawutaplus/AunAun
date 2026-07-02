import { useEffect, useMemo, useState } from "react";
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
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type OrderedFile = {
  id: string;
  file: File;
  previewUrl: string;
};

type Props = {
  files: File[];
  open: boolean;
  aspectLocked?: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (files: File[]) => void;
  onCancel: () => void;
};

function SortableThumb({
  item,
  index,
  aspectLocked,
}: {
  item: OrderedFile;
  index: number;
  aspectLocked?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={cn(
        "relative rounded-xl overflow-hidden bg-muted border border-border/70 touch-none",
        "aspect-square",
        isDragging && "z-10 opacity-90 shadow-lg ring-2 ring-primary/40",
      )}
    >
      <img src={item.previewUrl} alt="" className="w-full h-full object-cover pointer-events-none" draggable={false} />
      <button
        type="button"
        className="absolute top-1.5 left-1.5 rounded-md bg-black/55 p-1 text-white cursor-grab active:cursor-grabbing"
        aria-label="ลากเพื่อเรียงลำดับ"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="w-3.5 h-3.5" />
      </button>
      {index === 0 && (
        <span className="absolute bottom-1.5 left-1.5 right-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white text-center leading-tight pointer-events-none">
          {aspectLocked ? "รูปแรกในชุดนี้" : "หลัก — กำหนดสัดส่วน"}
        </span>
      )}
      <span className="absolute top-1.5 right-1.5 rounded-full bg-black/55 px-1.5 py-px text-[10px] font-medium text-white pointer-events-none">
        {index + 1}
      </span>
    </div>
  );
}

export function CommunityImageOrderDialog({
  files,
  open,
  aspectLocked,
  onOpenChange,
  onConfirm,
  onCancel,
}: Props) {
  const [items, setItems] = useState<OrderedFile[]>([]);

  useEffect(() => {
    if (!open || !files.length) {
      setItems([]);
      return;
    }
    const next = files.map((file, i) => ({
      id: `${file.name}-${file.size}-${file.lastModified}-${i}`,
      file,
      previewUrl: URL.createObjectURL(file),
    }));
    setItems(next);
    return () => {
      next.forEach((it) => URL.revokeObjectURL(it.previewUrl));
    };
  }, [open, files]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setItems((prev) => {
      const oldIndex = prev.findIndex((m) => m.id === active.id);
      const newIndex = prev.findIndex((m) => m.id === over.id);
      if (oldIndex < 0 || newIndex < 0) return prev;
      return arrayMove(prev, oldIndex, newIndex);
    });
  };

  const subtitle = useMemo(() => {
    if (aspectLocked) {
      return "ลากเรียงลำดับรูปในชุดนี้ — รูปจะถูกครอปตามสัดส่วนที่ตั้งไว้แล้ว";
    }
    return "ลากเรียงลำดับ — รูปแรกจะกำหนดสัดส่วนทั้งโพสต์ รูปถัดไปใช้สัดส่วนเดียวกัน";
  }, [aspectLocked]);

  const handleConfirm = () => {
    onConfirm(items.map((it) => it.file));
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onCancel();
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-4 pt-4 pb-2">
          <DialogTitle className="text-base">เรียงลำดับรูป ({items.length})</DialogTitle>
          <p className="text-xs text-muted-foreground font-normal">{subtitle}</p>
        </DialogHeader>

        <div className="px-4 pb-4 max-h-[min(60vh,420px)] overflow-y-auto">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={items.map((m) => m.id)} strategy={rectSortingStrategy}>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {items.map((item, index) => (
                  <SortableThumb key={item.id} item={item} index={index} aspectLocked={aspectLocked} />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>

        <DialogFooter className="px-4 pb-4 gap-2 sm:gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            ยกเลิก
          </Button>
          <Button type="button" onClick={handleConfirm} disabled={!items.length}>
            ถัดไป — ครอปรูป
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
