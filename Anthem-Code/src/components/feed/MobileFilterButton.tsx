import { SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

/** Round filter button in the one-row phone bar, left of the mode pill. Shows how many filters are on. */
export default function MobileFilterButton({
  count = 0,
  onClick,
  className,
}: {
  count?: number;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={count > 0 ? `ตัวกรอง (เปิดอยู่ ${count})` : "ตัวกรอง"}
      className={cn(
        "relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-background text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      <SlidersHorizontal className="h-4 w-4" aria-hidden />
      {count > 0 ? (
        <span
          className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-foreground px-1 text-[10px] font-semibold leading-none text-background"
          aria-hidden
        >
          {count}
        </span>
      ) : null}
    </button>
  );
}
