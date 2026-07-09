import { useState } from "react";
import { Monitor, Smartphone, Tablet } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ResearchScreenshot } from "@/data/uxResearchGuide";

type Props = {
  screenshots: ResearchScreenshot[];
};

const VIEWPORT_LABELS: Record<NonNullable<ResearchScreenshot["viewport"]>, string> = {
  mobile: "มือถือ",
  tablet: "แท็บเล็ต",
  desktop: "เดสก์ท็อป",
};

const ViewportIcon = ({ viewport }: { viewport: ResearchScreenshot["viewport"] }) => {
  if (viewport === "mobile") return <Smartphone className="h-3 w-3" aria-hidden />;
  if (viewport === "tablet") return <Tablet className="h-3 w-3" aria-hidden />;
  return <Monitor className="h-3 w-3" aria-hidden />;
};

const ResearchScreenshotGallery = ({ screenshots }: Props) => {
  const [active, setActive] = useState<ResearchScreenshot | null>(null);

  if (!screenshots.length) return null;

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-foreground">ตัวอย่างหน้าจอ</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {screenshots.map((shot) => (
          <button
            key={shot.src}
            type="button"
            onClick={() => setActive(shot)}
            className={cn(
              "group relative overflow-hidden rounded-lg border border-border bg-muted/30 text-left",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
            )}
          >
            <img
              src={shot.src}
              alt={shot.alt}
              loading="lazy"
              className="aspect-video w-full object-cover object-top transition-transform group-hover:scale-[1.02]"
            />
            {shot.viewport ? (
              <Badge
                variant="secondary"
                className="absolute left-1.5 top-1.5 gap-1 px-1.5 py-0 text-[10px] shadow-sm"
              >
                <ViewportIcon viewport={shot.viewport} />
                {VIEWPORT_LABELS[shot.viewport]}
              </Badge>
            ) : null}
            <span className="sr-only">เปิดภาพขยาย: {shot.alt}</span>
          </button>
        ))}
      </div>

      <Dialog open={!!active} onOpenChange={(open) => !open && setActive(null)}>
        <DialogContent className="max-w-4xl gap-3 p-4 sm:p-5">
          {active ? (
            <>
              <DialogTitle className="text-sm font-medium">{active.alt}</DialogTitle>
              {active.caption ? (
                <DialogDescription className="text-xs text-muted-foreground">
                  {active.caption}
                </DialogDescription>
              ) : null}
              <div className="overflow-hidden rounded-lg border border-border bg-muted/20">
                <img
                  src={active.src}
                  alt={active.alt}
                  className="max-h-[75vh] w-full object-contain"
                />
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ResearchScreenshotGallery;
