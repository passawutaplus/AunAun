import { useRef, useState } from "react";
import { Copy, Crop, ImagePlus, Trash2 } from "lucide-react";
import { PhoneMoreMenu, type PhoneMoreItem } from "@/components/project/canvas/PhoneMoreMenu";
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
  /** Phones: module-level actions shown in the "⋯" menu next to crop. */
  blockActions?: { onDuplicate?: () => void; canDuplicate?: boolean; onRemove?: () => void };
};

/** Phones: 40px dark glass chips readable on any image. Desktop (lg+): unchanged. */
export const MODULE_TOOL_BTN =
  "flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-black/55 text-white shadow-sm backdrop-blur-md transition active:bg-black/70 " +
  "lg:h-8 lg:w-8 lg:rounded-md lg:border-border/60 lg:bg-background/90 lg:text-foreground lg:backdrop-blur lg:hover:bg-background";

const TOOL_BTN = MODULE_TOOL_BTN;

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
  blockActions,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dropOver, setDropOver] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const phoneItems: PhoneMoreItem[] = disabled
    ? []
    : [
        ...(onReplace
          ? [{ key: "replace", label: replaceLabel, icon: <ImagePlus className="h-4 w-4" />, onSelect: () => inputRef.current?.click() }]
          : []),
        ...(blockActions?.onDuplicate
          ? [{ key: "dup", label: "ทำซ้ำบล็อก", icon: <Copy className="h-4 w-4" />, onSelect: blockActions.onDuplicate, disabled: !blockActions.canDuplicate }]
          : []),
        ...(blockActions?.onRemove
          ? [{ key: "remove", label: "ลบบล็อก", icon: <Trash2 className="h-4 w-4" />, onSelect: blockActions.onRemove, danger: true }]
          : []),
      ];
  const showToolbar = !disabled && (!!onCrop || !!onReplace || phoneItems.length > 0);
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
      <img loading="lazy" decoding="async" src={src} alt={alt} className={cn("w-full object-contain pointer-events-none", imgClassName)} draggable={false} />
      {showToolbar ? (
        <div className={cn(menuOpen ? "z-[60]" : "z-10", "absolute right-2 top-2 flex flex-col gap-1.5 opacity-100 lg:flex-row lg:gap-1 lg:opacity-0 lg:group-hover/crop:opacity-100")}>
          {onReplace ? (
            <button
              type="button"
              aria-label={replaceLabel}
              title={replaceLabel}
              className={cn(TOOL_BTN, "max-lg:hidden")}
              onClick={(e) => {
                e.stopPropagation();
                inputRef.current?.click();
              }}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <ImagePlus className="h-4 w-4 lg:h-3.5 lg:w-3.5" />
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
              <Crop className="h-4 w-4 lg:h-3.5 lg:w-3.5" />
            </button>
          ) : null}
          <PhoneMoreMenu items={phoneItems} onOpenChange={setMenuOpen} />
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
