import { ArrowDown, ArrowUp, Copy, GripVertical, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

/** Per-block side rail actions (move, duplicate, delete). */
export function BlockSideRail({
  disabled,
  isFirst,
  isLast,
  visible,
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
  canDuplicate?: boolean;
  dragListeners: Record<string, unknown>;
  dragAttributes: Record<string, unknown>;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDuplicate: () => void;
  onRemove: () => void;
}) {
  const btn =
    "flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-foreground disabled:opacity-30 disabled:pointer-events-none";

  return (
    <div
      className={cn(
        "absolute left-full top-1/2 z-20 flex -translate-y-1/2 flex-col gap-0.5 pl-2 transition-opacity duration-150",
        visible ? "opacity-100" : "pointer-events-none opacity-0",
      )}
    >
      <button
        type="button"
        className={cn(btn, "cursor-grab active:cursor-grabbing touch-none")}
        aria-label="ลากเรียงบล็อก"
        disabled={disabled}
        {...dragAttributes}
        {...dragListeners}
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>
      <button type="button" className={btn} aria-label="เลื่อนขึ้น" disabled={disabled || isFirst} onClick={onMoveUp}>
        <ArrowUp className="h-3.5 w-3.5" />
      </button>
      <button type="button" className={btn} aria-label="เลื่อนลง" disabled={disabled || isLast} onClick={onMoveDown}>
        <ArrowDown className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        className={btn}
        aria-label="ทำซ้ำบล็อก"
        disabled={disabled || !canDuplicate}
        onClick={onDuplicate}
      >
        <Copy className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        className={cn(btn, "text-red-500 hover:bg-red-500/15 hover:text-red-600 dark:hover:text-red-400")}
        aria-label="ลบบล็อก"
        disabled={disabled}
        onClick={onRemove}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
