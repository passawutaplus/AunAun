import type { DragEvent, TouchEvent as ReactTouchEvent } from "react";
import { TouchSensor, type TouchSensorOptions } from "@dnd-kit/core";
import { Plus } from "lucide-react";
import { CANVAS_TOOL_MIME } from "@/lib/canvasToolDrag";
import type { BlockGapAfter } from "@/lib/projectContentBlocks";
import { cn } from "@/lib/utils";

/** Drag-and-drop helpers for the casual canvas: insert edge detection, drop zone and gap toggle. */
export type InsertEdge = "before" | "after";
export type InsertHint = { blockId: string; edge: InsertEdge };

export function isToolDrag(dt: DataTransfer) {
  return Array.from(dt.types).some((t) => t === CANVAS_TOOL_MIME || t === "text/plain");
}

export function edgeFromPointer(e: DragEvent, el: HTMLElement): InsertEdge {
  const rect = el.getBoundingClientRect();
  return e.clientY - rect.top < rect.height / 2 ? "before" : "after";
}

export function InsertDropZone({ active }: { active?: boolean }) {
  return (
    <div
      className={cn(
        "pointer-events-none flex min-h-[44px] items-center justify-center rounded-lg border border-dashed px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "border-sky-500 bg-sky-50 text-sky-600 dark:bg-sky-950/40 dark:text-sky-300"
          : "border-border/80 bg-muted/40 text-muted-foreground",
      )}
      aria-hidden
    >
      <span className="inline-flex items-center gap-1.5">
        <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
        วางโมดูลที่นี่
      </span>
    </div>
  );
}

export function BlockGapToggle({
  value,
  disabled,
  onChange,
}: {
  value: BlockGapAfter;
  disabled?: boolean;
  onChange: (next: BlockGapAfter) => void;
}) {
  const tight = value === "tight";
  return (
    <div className={cn("relative w-full shrink-0", tight ? "h-0" : "h-5")}>
      <div className="group/gap absolute inset-x-0 top-1/2 z-20 flex h-7 -translate-y-1/2 items-center justify-center">
        <button
          type="button"
          disabled={disabled}
          onClick={(e) => {
            e.stopPropagation();
            onChange(tight ? "spaced" : "tight");
          }}
          className={cn(
            "flex h-7 min-w-[3.25rem] items-center justify-center gap-1.5 rounded-full border border-border/60 bg-background/95 px-2.5 text-[10px] font-medium text-muted-foreground shadow-sm transition",
            "opacity-0 group-hover/gap:opacity-100 focus-visible:opacity-100",
            "hover:border-sky-500/50 hover:text-foreground",
            disabled && "pointer-events-none",
          )}
          title={tight ? "ชิดกัน — กดเพื่อห่าง" : "ห่าง — กดเพื่อชิด"}
          aria-label={tight ? "ระยะห่าง: ชิด กดเพื่อห่าง" : "ระยะห่าง: ห่าง กดเพื่อชิด"}
        >
          <span
            className={cn("h-1.5 w-1.5 rounded-full", tight ? "bg-sky-500" : "bg-muted-foreground/50")}
            aria-hidden
          />
          {tight ? "ชิด" : "ห่าง"}
        </button>
      </div>
    </div>
  );
}

/** Elements where a long-press means "edit / tap", not "pick the module up". */
const LONG_PRESS_IGNORE =
  'input, textarea, select, button:not([data-drag-handle]), a, video, [contenteditable="true"], [role="slider"], [data-no-module-drag]';

/**
 * Touch sensor for module reorder: press and hold a module to drag it.
 * Skips touches that start on text fields / buttons / video controls, and touches
 * already claimed by a nested sortable (e.g. slide thumbnails inside a gallery module).
 */
export class CanvasTouchSensor extends TouchSensor {
  static activators = [
    {
      eventName: "onTouchStart" as const,
      handler: ({ nativeEvent: event }: ReactTouchEvent, { onActivation }: TouchSensorOptions) => {
        if (event.touches.length > 1) return false;
        if ((event as TouchEvent & { dndKit?: unknown }).dndKit) return false;
        const target = event.target as Element | null;
        if (target?.closest?.(LONG_PRESS_IGNORE)) return false;
        onActivation?.({ event });
        return true;
      },
    },
  ];
}
