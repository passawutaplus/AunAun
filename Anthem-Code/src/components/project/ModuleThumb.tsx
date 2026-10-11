import { ImageIcon, Play } from "lucide-react";
import type { CanvasToolPayload } from "@/lib/canvasToolDrag";
import { PHOTO_GRID_LAYOUTS } from "@/lib/photoGridLayouts";
import { cn } from "@/lib/utils";

/** Grey placeholder tile — same look as the Photo grid thumbnails in the module library. */
const Photo = ({ className }: { className?: string }) => (
  <div
    className={cn(
      "flex h-full w-full items-center justify-center rounded-[3px] bg-muted-foreground/25 text-muted-foreground/45",
      className,
    )}
  >
    <ImageIcon className="h-3 w-3" aria-hidden />
  </div>
);

const Bar = ({ w = "60%", strong = false }: { w?: string; strong?: boolean }) => (
  <div className={cn("h-1.5 rounded-full", strong ? "bg-muted-foreground/70" : "bg-muted-foreground/30")} style={{ width: w }} />
);

const Lines = ({ n = 3 }: { n?: number }) => (
  <div className="space-y-1">
    {Array.from({ length: n }, (_, i) => (
      <Bar key={i} w={`${96 - i * 14}%`} />
    ))}
  </div>
);

function Mock({ payload }: { payload: CanvasToolPayload }) {
  switch (payload.tool) {
    case "heading":
      return (
        <div className="flex h-full items-center justify-center">
          <div className="h-2.5 w-3/5 rounded-full bg-muted-foreground/70" />
        </div>
      );
    case "heading_body":
      return (
        <div className="flex h-full flex-col justify-center gap-2 px-1">
          <div className="h-2.5 w-1/2 rounded-full bg-muted-foreground/70" />
          <Lines n={3} />
        </div>
      );
    case "body":
      return (
        <div className="flex h-full flex-col justify-center px-1">
          <Lines n={4} />
        </div>
      );
    case "single":
      return <Photo />;
    case "video":
      return (
        <div className="relative h-full">
          <Photo />
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-background/70 text-foreground">
              <Play className="h-3.5 w-3.5" aria-hidden />
            </span>
          </span>
        </div>
      );
    case "gallery":
      return (
        <div className="relative h-full">
          <Photo />
          <span className="absolute left-1 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-background/70 text-center text-[10px] leading-4 text-foreground">
            ‹
          </span>
          <span className="absolute right-1 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-background/70 text-center text-[10px] leading-4 text-foreground">
            ›
          </span>
          <div className="absolute inset-x-0 bottom-1 flex justify-center gap-1">
            <i className="h-1 w-1 rounded-full bg-foreground/80" />
            <i className="h-1 w-1 rounded-full bg-foreground/35" />
            <i className="h-1 w-1 rounded-full bg-foreground/35" />
          </div>
        </div>
      );
    case "multi":
      return (
        <div className="grid h-full gap-1" style={{ gridTemplateColumns: `repeat(${payload.columns}, minmax(0, 1fr))` }}>
          {Array.from({ length: payload.columns }, (_, i) => (
            <Photo key={i} />
          ))}
        </div>
      );
    case "image_text":
      return (
        <div className={cn("flex h-full gap-1.5", payload.side === "text_left" && "flex-row-reverse")}>
          <div className="w-1/2">
            <Photo />
          </div>
          <div className="flex w-1/2 flex-col justify-center gap-1.5">
            <Bar w="70%" strong />
            <Lines n={3} />
          </div>
        </div>
      );
    case "grid": {
      const meta = PHOTO_GRID_LAYOUTS.find((l) => l.id === payload.layout);
      if (meta?.cells && meta.cols && meta.rows) {
        return (
          <div
            className="grid h-full gap-1"
            style={{
              gridTemplateColumns: `repeat(${meta.cols}, minmax(0, 1fr))`,
              gridTemplateRows: `repeat(${meta.rows}, minmax(0, 1fr))`,
            }}
          >
            {meta.cells.map((c, i) => (
              <div
                key={i}
                style={{
                  gridColumn: `${c.col} / span ${c.colSpan ?? 1}`,
                  gridRow: `${c.row} / span ${c.rowSpan ?? 1}`,
                }}
              >
                <Photo />
              </div>
            ))}
          </div>
        );
      }
      if (payload.layout === "four_quad") {
        return (
          <div className="grid h-full grid-cols-2 grid-rows-2 gap-1">
            {[0, 1, 2, 3].map((i) => (
              <Photo key={i} />
            ))}
          </div>
        );
      }
      // three_split / three_split_rev: one tall + two stacked
      return (
        <div
          className="grid h-full grid-cols-2 grid-rows-2 gap-1"
          style={{ gridTemplateAreas: payload.layout === "three_split_rev" ? '"a c" "b c"' : '"c a" "c b"' }}
        >
          <div style={{ gridArea: "c" }}>
            <Photo />
          </div>
          <div style={{ gridArea: "a" }}>
            <Photo />
          </div>
          <div style={{ gridArea: "b" }}>
            <Photo />
          </div>
        </div>
      );
    }
    default:
      return <Photo />;
  }
}

/** A small grey-on-grey mockup of what a module looks like once placed. */
export function ModuleThumb({ payload, className }: { payload: CanvasToolPayload; className?: string }) {
  return (
    <div className={cn("aspect-[5/3] w-full overflow-hidden rounded-lg bg-muted p-1.5", className)} aria-hidden>
      <Mock payload={payload} />
    </div>
  );
}
