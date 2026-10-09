import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Lightweight browser chrome for product previews on Learn. */
export function LearnProductFrame({
  children,
  className,
  title = "samecor.com",
}: {
  children: ReactNode;
  className?: string;
  title?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-[#e4e1db] bg-white shadow-[0_24px_60px_-36px_rgba(47,46,44,0.35)]",
        className,
      )}
    >
      <div className="flex items-center gap-2 border-b border-[#e4e1db] bg-[#f5f5f5] px-3 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/35" aria-hidden />
        <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/25" aria-hidden />
        <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/20" aria-hidden />
        <span className="ml-2 truncate rounded-md bg-background/70 px-2.5 py-0.5 text-[10px] text-muted-foreground sm:text-xs">
          {title}
        </span>
      </div>
      <div className="relative min-h-[12rem] bg-background/40">{children}</div>
    </div>
  );
}
