import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Lightweight browser chrome for product previews on Learn. */
export function LearnProductFrame({
  children,
  className,
  title = "aplus1.app",
}: {
  children: ReactNode;
  className?: string;
  title?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-border/60 bg-card/80 shadow-[0_24px_80px_-28px_rgba(0,0,0,0.55)] ring-1 ring-white/5",
        className,
      )}
    >
      <div className="flex items-center gap-2 border-b border-border/50 bg-muted/40 px-3 py-2.5">
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
