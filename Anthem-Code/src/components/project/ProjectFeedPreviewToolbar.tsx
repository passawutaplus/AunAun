import { LayoutGrid, Orbit, Plus, Search, SlidersHorizontal, Sparkles, Users } from "lucide-react";
import { isAplus1LaunchMinimal } from "@/lib/aplus1Launch";
import { cn } from "@/lib/utils";

const PREVIEW_CATEGORIES = ["ทั้งหมด", "Graphic / Branding", "Illustration / Art", "Photo"] as const;

/** Static chrome matching the projects feed toolbar — sized for the preview panel. */
export function ProjectFeedPreviewToolbar({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "pointer-events-none select-none border-b border-border/50 bg-background/80 backdrop-blur-sm px-2.5 py-2 space-y-2",
        className,
      )}
      aria-hidden
    >
      <div className="flex items-center gap-1.5 min-w-0">
        <div className="flex-1 min-w-0 h-8 rounded-xl bg-secondary/80 border border-border/60 flex items-center gap-1.5 pl-2 pr-1.5">
          <Search className="w-3 h-3 text-muted-foreground shrink-0" />
          <span className="flex-1 min-w-0 text-[10px] text-muted-foreground truncate">ค้นหาผลงาน</span>
          <span className="shrink-0 p-1 rounded-md text-muted-foreground/70">
            <SlidersHorizontal className="w-3 h-3" />
          </span>
        </div>

        <div className="shrink-0 flex items-center rounded-full bg-muted/50 p-0.5">
          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-medium bg-gradient-brand text-white">
            <LayoutGrid className="w-2.5 h-2.5" />
            <span className="hidden min-[380px]:inline">Projects</span>
          </span>
          {!isAplus1LaunchMinimal() ? (
          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-medium text-muted-foreground">
            <Orbit className="w-2.5 h-2.5" />
            <span className="hidden min-[380px]:inline">Area</span>
          </span>
          ) : null}
          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-medium text-muted-foreground">
            <Users className="w-2.5 h-2.5" />
          </span>
        </div>

        <span className="shrink-0 inline-flex items-center gap-0.5 rounded-full border border-border/60 bg-background px-1.5 py-0.5 text-[9px] text-foreground tabular-nums">
          <Sparkles className="w-2.5 h-2.5 text-primary" />
          0
          <span className="text-muted-foreground">px</span>
        </span>
      </div>

      <div className="flex items-end gap-2 min-w-0">
        <div className="flex items-center gap-2.5 shrink-0 pb-0.5">
          <span className="text-[10px] font-medium text-muted-foreground whitespace-nowrap">กำลังติดตาม</span>
          <span className="relative text-[10px] font-medium text-foreground whitespace-nowrap pb-1">
            สำหรับคุณ
            <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-gradient-brand" />
          </span>
        </div>

        <div className="flex-1 min-w-0 overflow-x-auto scrollbar-hide">
          <div className="flex items-center gap-2.5 pr-1">
            {PREVIEW_CATEGORIES.map((label, i) => (
              <span
                key={label}
                className={cn(
                  "shrink-0 whitespace-nowrap text-[10px] font-medium pb-1",
                  i === 0 ? "text-primary" : "text-muted-foreground",
                )}
              >
                {label}
                {i === 0 && <span className="block h-px mt-0.5 rounded-full bg-primary/80" aria-hidden />}
              </span>
            ))}
          </div>
        </div>

        <span className="shrink-0 mb-0.5 inline-flex items-center justify-center w-7 h-7 rounded-full bg-primary text-primary-foreground shadow-sm">
          <Plus className="w-3.5 h-3.5" />
        </span>
      </div>
    </div>
  );
}
