import { useRef, useState } from "react";
import { Crop, ImagePlus } from "lucide-react";
import {
  endCanvasImageSlotDrag,
  isCanvasImageSlotDrag,
  readCanvasImageSlotDrag,
  writeCanvasImageSlotDrag,
  type CanvasImageSlotRef,
} from "@/lib/canvasImageSlotDnD";
import { cn } from "@/lib/utils";

type Props = {
  src: string;
  alt?: string;
  disabled?: boolean;
  onCrop?: () => void;
  /** Replace this media with a new file (image or video). */
  onReplace?: (file: File) => void;
  accept?: string;
  replaceLabel?: string;
  className?: string;
  imgClassName?: string;
  /** Enable dragging this image to another canvas slot. */
  dragSlot?: CanvasImageSlotRef | null;
  /** Drop another canvas image onto this slot. */
  onSlotDrop?: (from: CanvasImageSlotRef) => void;
};

const TOOL_BTN =
  "flex h-8 w-8 items-center justify-center rounded-md border border-border/60 bg-background/90 text-foreground shadow-sm backdrop-blur transition hover:bg-background";

/** Image with hover crop + replace controls for canvas modules. */
export function ModuleImageWithCrop({
  src,
  alt = "",
  disabled,
  onCrop,
  onReplace,
  accept = "image/jpeg,image/png,image/webp",
  replaceLabel = "เปลี่ยนภาพ",
  className,
  imgClassName,
  dragSlot,
  onSlotDrop,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dropOver, setDropOver] = useState(false);
  const showToolbar = !disabled && (!!onCrop || !!onReplace);
  const canDrag = !disabled && !!dragSlot?.url;
  const canDrop = !disabled && !!onSlotDrop;

  return (
    <div
      className={cn(
        "group/crop relative w-full overflow-hidden",
        canDrag && "cursor-grab active:cursor-grabbing",
        dropOver && "ring-2 ring-primary ring-inset",
        className,
      )}
      draggable={canDrag}
      onDragStart={(e) => {
        if (!canDrag || !dragSlot) return;
        e.stopPropagation();
        writeCanvasImageSlotDrag(e.dataTransfer, dragSlot);
      }}
      onDragEnd={() => endCanvasImageSlotDrag()}
      onDragOver={(e) => {
        if (!canDrop || !isCanvasImageSlotDrag(e.dataTransfer)) return;
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = "move";
        setDropOver(true);
      }}
      onDragLeave={() => setDropOver(false)}
      onDrop={(e) => {
        if (!canDrop) return;
        if (!isCanvasImageSlotDrag(e.dataTransfer)) return;
        e.preventDefault();
        e.stopPropagation();
        setDropOver(false);
        const from = readCanvasImageSlotDrag(e.dataTransfer);
        endCanvasImageSlotDrag();
        if (from) onSlotDrop?.(from);
      }}
    >
      <img src={src} alt={alt} className={cn("w-full object-contain pointer-events-none", imgClassName)} draggable={false} />
      {showToolbar ? (
        <div className="absolute right-2 top-2 z-10 flex gap-1 opacity-100 sm:opacity-0 sm:group-hover/crop:opacity-100">
          {onReplace ? (
            <button
              type="button"
              aria-label={replaceLabel}
              title={replaceLabel}
              className={TOOL_BTN}
              onClick={(e) => {
                e.stopPropagation();
                inputRef.current?.click();
              }}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <ImagePlus className="h-3.5 w-3.5" />
            </button>
          ) : null}
          {onCrop ? (
            <button
              type="button"
              aria-label="ครอบภาพ"
              title="ครอบภาพ"
              className={TOOL_BTN}
              onClick={(e) => {
                e.stopPropagation();
                onCrop();
              }}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <Crop className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
      ) : null}
      {onReplace && !disabled ? (
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onReplace(file);
            e.target.value = "";
          }}
        />
      ) : null}
    </div>
  );
}
