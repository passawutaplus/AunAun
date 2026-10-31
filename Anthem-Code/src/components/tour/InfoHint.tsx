import type { ReactNode } from "react";
import { Info } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/**
 * (i) beside a heading whose idea is hard to get at a glance: a short explanation and, where it helps,
 * a small looping motion (components/tour/TourScenes). Tap or click — works the same on phones.
 */
export function InfoHint({
  title,
  children,
  scene,
  className,
  align = "start",
}: {
  title: string;
  children: ReactNode;
  scene?: ReactNode;
  className?: string;
  align?: "start" | "center" | "end";
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`อธิบาย: ${title}`}
          className={cn(
            "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            className,
          )}
        >
          <Info className="h-3.5 w-3.5" aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent align={align} className="w-[min(340px,calc(100vw-24px))] rounded-2xl p-4">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <div className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{children}</div>
        {scene ? <div className="mt-3 overflow-hidden rounded-xl border border-border bg-background">{scene}</div> : null}
      </PopoverContent>
    </Popover>
  );
}
