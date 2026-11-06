import { useEffect, useRef, useState, type ReactNode } from "react";
import { MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

export type PhoneMoreItem = {
  key: string;
  label: string;
  icon: ReactNode;
  onSelect: () => void;
  disabled?: boolean;
  danger?: boolean;
};

/** Phones (< lg): 40px dark glass chips readable on any image. */
export const PHONE_CHIP =
  "flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-black/55 text-white shadow-sm backdrop-blur-md transition active:bg-black/70 disabled:pointer-events-none disabled:opacity-40";

/**
 * Phone-only "⋯" chip that slides open a vertical stack of extra module tools
 * (replace image, duplicate, delete). Hidden from lg up.
 */
export function PhoneMoreMenu({
  items,
  className,
  onOpenChange,
}: {
  items: PhoneMoreItem[];
  className?: string;
  /** Lets the parent lift its stacking order while the menu hangs over the next module. */
  onOpenChange?: (open: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const onOpenChangeRef = useRef(onOpenChange);
  onOpenChangeRef.current = onOpenChange;
  useEffect(() => {
    onOpenChangeRef.current?.(open);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  if (items.length === 0) return null;

  return (
    <div ref={rootRef} className={cn("flex flex-col items-center gap-1.5 lg:hidden", className)}>
      <button
        type="button"
        aria-label={open ? "ปิดเครื่องมือเพิ่มเติม" : "เครื่องมือเพิ่มเติม"}
        aria-expanded={open}
        className={cn(PHONE_CHIP, open && "bg-black/75")}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      <div
        className={cn(
          "grid transition-[grid-template-rows,opacity] duration-200 ease-out",
          open ? "grid-rows-[1fr] opacity-100" : "pointer-events-none grid-rows-[0fr] opacity-0",
        )}
        aria-hidden={!open}
      >
        <div className="flex min-h-0 flex-col items-center gap-1.5 overflow-hidden">
          {items.map((item) => (
            <button
              key={item.key}
              type="button"
              aria-label={item.label}
              title={item.label}
              tabIndex={open ? 0 : -1}
              disabled={item.disabled}
              className={cn(PHONE_CHIP, item.danger && "text-red-300")}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
                item.onSelect();
              }}
            >
              {item.icon}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
