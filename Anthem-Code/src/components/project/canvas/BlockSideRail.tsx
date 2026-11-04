import { ArrowDown, ArrowUp, Copy, GripVertical, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

/** Per-block side rail actions (move, duplicate, delete). */
export function BlockSideRail({
  disabled,
  isFirst,
  isLast,
  visible,
  phoneBelowTools = false,
  canDuplicate,
  dragListeners,
  dragAttributes,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onRemove,
}: {
  disabled?: boolean;
  isFirst: boolean;
  isLast: boolean;
  visible?: boolean;
  /** Phones (< lg): start the column under the image's replace / crop chips (top-right). */
  phoneBelowTools?: boolean;
  canDuplicate?: boolean;
  dragListeners: Record<string, unknown>;
  dragAttributes: Record<string, unknown>;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDuplicate: () => void;
  onRemove: () => void;
}) {
  // Phones: 40px dark glass chips overlaid inside the module. Desktop (lg+): original quiet rail.
  const btn = cn(
    "flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-black/55 text-white shadow-sm backdrop-blur-md transition-colors active:bg-black/70 disabled:opacity-40 disabled:pointer-events-none",
    "lg:h-8 lg:w-8 lg:rounded-md lg:border-0 lg:bg-transparent lg:text-muted-foreground lg:shadow-none lg:backdrop-blur-none lg:hover:bg-foreground/10 lg:hover:text-foreground lg:disabled:opacity-30",
  );
  const icon = "h-4 w-4 lg:h-3.5 lg:w-3.5";

  return (
    <div
      className={cn(
        "absolute right-2 z-30 flex flex-col gap-1.5 transition-opacity duration-150",
        phoneBelowTools ? "top-[6.125rem]" : "top-2",
        "lg:left-full lg:right-auto lg:top-1/2 lg:z-20 lg:-translate-y-1/2 lg:gap-0.5 lg:pl-2",
        visible ? "opacity-100" : "pointer-events-none opacity-0",
      )}
    >
      <button
        type="button"
        className={cn(btn, "cursor-grab active:cursor-grabbing touch-none max-lg:hidden")}
        aria-label="ลากเรียงบล็อก"
        data-drag-handle
        disabled={disabled}
        {...dragAttributes}
        {...dragListeners}
      >
        <GripVertical className={icon} />
      </button>
      <button type="button" className={cn(btn, "max-lg:hidden")} aria-label="เลื่อนขึ้น" disabled={disabled || isFirst} onClick={onMoveUp}>
        <ArrowUp className={icon} />
      </button>
      <button type="button" className={cn(btn, "max-lg:hidden")} aria-label="เลื่อนลง" disabled={disabled || isLast} onClick={onMoveDown}>
        <ArrowDown className={icon} />
      </button>
      <button
        type="button"
        className={btn}
        aria-label="ทำซ้ำบล็อก"
        disabled={disabled || !canDuplicate}
        onClick={onDuplicate}
      >
        <Copy className={icon} />
      </button>
      <button
        type="button"
        className={cn(btn, "text-red-300 lg:text-red-500 lg:hover:bg-red-500/15 lg:hover:text-red-600 lg:dark:hover:text-red-400")}
        aria-label="ลบบล็อก"
        disabled={disabled}
        onClick={onRemove}
      >
        <Trash2 className={icon} />
      </button>
    </div>
  );
}
