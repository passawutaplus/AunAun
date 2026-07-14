import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2, Plus } from "lucide-react";
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
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import { ModuleImageWithCrop } from "@/components/project/ModuleImageWithCrop";
import { cn } from "@/lib/utils";

type Props = {
  urls: string[];
  disabled?: boolean;
  uploading?: boolean;
  onUploadMany: (files: File[]) => void;
  onReplaceAt?: (index: number, file: File) => void;
  onCropAt?: (index: number, url: string) => void;
  onReorder?: (urls: string[]) => void;
};

function pickImageFiles(list: FileList | File[] | null | undefined): File[] {
  if (!list) return [];
  return Array.from(list).filter((f) => /^image\/(jpeg|png|webp)$/i.test(f.type));
}

function thumbId(index: number) {
  return `slide-thumb-${index}`;
}

function SortableThumb({
  src,
  index,
  active,
  disabled,
  onSelect,
}: {
  src: string;
  index: number;
  active: boolean;
  disabled?: boolean;
  onSelect: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: thumbId(index),
    disabled,
  });

  return (
    <button
      ref={setNodeRef}
      type="button"
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      onClick={() => {
        if (!isDragging) onSelect();
      }}
      aria-label={`สไลด์ที่ ${index + 1} — ลากเพื่อเรียงลำดับ`}
      title="จิ้มค้างลากเพื่อสลับตำแหน่ง"
      className={cn(
        "h-14 w-20 shrink-0 overflow-hidden rounded-none border-2 transition-all touch-none",
        "cursor-grab active:cursor-grabbing",
        active ? "border-primary" : "border-transparent opacity-60 hover:opacity-100",
        isDragging && "z-20 opacity-100 shadow-lg ring-2 ring-primary/50",
        disabled && "cursor-default",
      )}
      {...attributes}
      {...listeners}
    >
      <img src={src} alt="" className="pointer-events-none h-full w-full object-cover" draggable={false} />
    </button>
  );
}

export function GallerySlideBlockEditor({
  urls,
  disabled,
  uploading,
  onUploadMany,
  onReplaceAt,
  onCropAt,
  onReorder,
}: Props) {
  const filled = urls.map((u) => u.trim()).filter(Boolean);
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const multiInputRef = useRef<HTMLInputElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  useEffect(() => {
    if (!api) return;
    setCurrent(api.selectedScrollSnap());
    const onSelect = () => setCurrent(api.selectedScrollSnap());
    api.on("select", onSelect);
    return () => {
      api.off("select", onSelect);
    };
  }, [api]);

  const handleThumbDragEnd = (event: DragEndEvent) => {
    if (!onReorder || disabled) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = filled.findIndex((_, i) => thumbId(i) === String(active.id));
    const newIndex = filled.findIndex((_, i) => thumbId(i) === String(over.id));
    if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return;
    const next = arrayMove(filled, oldIndex, newIndex);
    onReorder(next);
    // Keep preview on the image the user moved (same asset, new index).
    requestAnimationFrame(() => api?.scrollTo(newIndex));
  };

  if (!filled.length) {
    return (
      <div className="space-y-2">
        <button
          type="button"
          disabled={disabled || uploading}
          onClick={() => multiInputRef.current?.click()}
          className="flex min-h-[160px] w-full flex-col items-center justify-center gap-2 rounded-none bg-muted/70 hover:bg-muted"
        >
          {uploading ? (
            <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
          ) : (
            <Plus className="h-8 w-8 text-muted-foreground/50" strokeWidth={1.25} />
          )}
          <span className="text-xs text-muted-foreground">อัปโหลดภาพสไลด์</span>
        </button>
        <input
          ref={multiInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="sr-only"
          disabled={disabled || uploading}
          onChange={(e) => {
            const files = pickImageFiles(e.target.files);
            if (files.length) onUploadMany(files);
            e.target.value = "";
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <Carousel setApi={setApi} className="overflow-hidden rounded-none bg-transparent">
          <CarouselContent>
            {filled.map((src, i) => (
              <CarouselItem key={`${src}-${i}`}>
                <div className="relative w-full bg-transparent">
                  <ModuleImageWithCrop
                    src={src}
                    disabled={disabled}
                    onCrop={onCropAt ? () => onCropAt(i, src) : undefined}
                    onReplace={onReplaceAt ? (file) => onReplaceAt(i, file) : undefined}
                    imgClassName="max-h-[min(80vh,720px)] w-full object-contain"
                  />
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
        {filled.length > 1 ? (
          <>
            <button
              type="button"
              aria-label="ภาพก่อนหน้า"
              disabled={disabled}
              onClick={() => api?.scrollPrev()}
              className="absolute left-2 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-background/20 text-foreground/55 shadow-none backdrop-blur-[2px] hover:bg-background/40 hover:text-foreground/80"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="ภาพถัดไป"
              disabled={disabled}
              onClick={() => api?.scrollNext()}
              className="absolute right-2 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-background/20 text-foreground/55 shadow-none backdrop-blur-[2px] hover:bg-background/40 hover:text-foreground/80"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </>
        ) : null}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-0.5">
        {onReorder && filled.length > 1 && !disabled ? (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleThumbDragEnd}>
            <SortableContext items={filled.map((_, i) => thumbId(i))} strategy={horizontalListSortingStrategy}>
              {filled.map((src, i) => (
                <SortableThumb
                  key={`${src}-thumb-${i}`}
                  src={src}
                  index={i}
                  active={current === i}
                  disabled={disabled}
                  onSelect={() => api?.scrollTo(i)}
                />
              ))}
            </SortableContext>
          </DndContext>
        ) : (
          filled.map((src, i) => (
            <button
              key={`${src}-thumb-${i}`}
              type="button"
              onClick={() => api?.scrollTo(i)}
              className={cn(
                "h-14 w-20 shrink-0 overflow-hidden rounded-none border-2 transition-all",
                current === i ? "border-primary" : "border-transparent opacity-60 hover:opacity-100",
              )}
            >
              <img src={src} alt="" className="h-full w-full object-cover" draggable={false} />
            </button>
          ))
        )}
        <button
          type="button"
          disabled={disabled || uploading}
          onClick={() => multiInputRef.current?.click()}
          className="flex h-14 w-20 shrink-0 flex-col items-center justify-center gap-0.5 rounded-none border border-dashed border-border/80 bg-muted/40 text-muted-foreground hover:bg-muted"
          aria-label="เพิ่มภาพ"
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          <span className="text-[9px]">เพิ่ม</span>
        </button>
      </div>

      <input
        ref={multiInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="sr-only"
        disabled={disabled || uploading}
        onChange={(e) => {
          const files = pickImageFiles(e.target.files);
          if (files.length) onUploadMany(files);
          e.target.value = "";
        }}
      />
    </div>
  );
}
