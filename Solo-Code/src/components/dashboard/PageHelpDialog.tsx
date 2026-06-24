import * as React from "react";
import { CircleHelp, Lightbulb, ArrowRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { getPageGuide, getTourProgress } from "@/lib/pageGuides";
import { trackFeature } from "@/lib/featureUsage";
import { cn } from "@/lib/utils";

export function PageHelpButton({
  feature,
  label,
  className,
}: {
  feature: string;
  label: string;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const guide = getPageGuide(feature);
  const tour = getTourProgress(feature);

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) void trackFeature(`page_help.${feature}`);
      }}
    >
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label={`วิธีใช้ — ${label}`}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full",
            "bg-muted/80 backdrop-blur-md border border-border/60 text-muted-foreground",
            "px-3 py-1.5 text-xs font-medium shadow-soft",
            "hover:bg-muted hover:text-foreground hover:shadow-elevated transition-all",
            className,
          )}
        >
          <CircleHelp className="h-3.5 w-3.5" />
          <span>วิธีใช้</span>
        </button>
      </DialogTrigger>

      <DialogContent className="max-w-md sm:max-w-lg gap-0 p-0 overflow-hidden">
        <div className="border-b border-border/60 bg-gradient-to-br from-primary/8 via-background to-background px-5 pt-5 pb-4">
          <DialogHeader className="text-left space-y-1">
            {tour && (
              <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">
                ทัวร์แนะนำ · ขั้นที่ {tour.order}/{tour.total}
              </p>
            )}
            <DialogTitle className="text-lg">{guide.title}</DialogTitle>
            <DialogDescription className="text-xs leading-relaxed">
              {guide.summary}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="px-5 py-4 space-y-4 max-h-[min(420px,55vh)] overflow-y-auto">
          <div>
            <p className="text-xs font-semibold text-foreground mb-2">ขั้นตอนการใช้งาน</p>
            <ol className="space-y-2">
              {guide.steps.map((step, i) => (
                <li key={i} className="flex gap-2.5 text-xs leading-relaxed text-muted-foreground">
                  <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[10px] font-bold text-primary">
                    {i + 1}
                  </span>
                  <span className="pt-0.5">{step}</span>
                </li>
              ))}
            </ol>
          </div>

          {guide.tips && guide.tips.length > 0 && (
            <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-3 space-y-1.5">
              <p className="text-[11px] font-semibold text-amber-800 dark:text-amber-200 flex items-center gap-1.5">
                <Lightbulb className="h-3.5 w-3.5 shrink-0" /> เคล็ดลับ
              </p>
              <ul className="space-y-1">
                {guide.tips.map((tip, i) => (
                  <li key={i} className="text-[11px] text-muted-foreground leading-relaxed pl-0.5">
                    · {tip}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {guide.nextPage && (
          <div className="border-t border-border/60 px-5 py-3 bg-muted/30">
            <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
              <ArrowRight className="h-3 w-3 text-primary shrink-0" />
              ถัดไปใน workflow:{" "}
              <span className="font-medium text-foreground">{guide.nextPage}</span>
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
