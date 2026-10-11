import { Check, ImageIcon } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CANVAS_TEMPLATES } from "@/lib/projectCanvasTemplates";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (templateId: string) => void;
};

const Img = ({ className }: { className?: string }) => (
  <div className={cn("flex items-center justify-center rounded-md bg-muted text-muted-foreground/60", className)}>
    <ImageIcon className="h-3.5 w-3.5" aria-hidden />
  </div>
);

const Lines = ({ n = 2 }: { n?: number }) => (
  <div className="space-y-1">
    {Array.from({ length: n }, (_, i) => (
      <div key={i} className="h-1 rounded-full bg-muted-foreground/25" style={{ width: `${92 - i * 18}%` }} />
    ))}
  </div>
);

/** A tiny wireframe of one module so the card reads as "what the page will look like". */
function ModuleSketch({ kind, layout, side }: { kind: string; layout?: string; side?: string }) {
  switch (kind) {
    case "heading":
      return <div className="h-2 w-3/5 rounded-full bg-foreground/80" />;
    case "heading_body":
      return (
        <div className="space-y-1">
          <div className="h-2 w-1/2 rounded-full bg-foreground/80" />
          <Lines />
        </div>
      );
    case "body":
      return <Lines n={3} />;
    case "image":
      return <Img className="h-12 w-full" />;
    case "gallery":
      return (
        <div className="relative">
          <Img className="h-12 w-full" />
          <div className="absolute inset-x-0 bottom-1 flex justify-center gap-0.5">
            <i className="h-1 w-1 rounded-full bg-foreground/70" />
            <i className="h-1 w-1 rounded-full bg-foreground/25" />
            <i className="h-1 w-1 rounded-full bg-foreground/25" />
          </div>
        </div>
      );
    case "grid":
      return layout === "four_quad" ? (
        <div className="grid grid-cols-2 gap-1">
          <Img className="h-6" />
          <Img className="h-6" />
          <Img className="h-6" />
          <Img className="h-6" />
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-1">
          <Img className="h-8" />
          <Img className="h-8" />
          <Img className="h-8" />
        </div>
      );
    case "image_text":
      return (
        <div className={cn("flex gap-1.5", side === "text_left" && "flex-row-reverse")}>
          <Img className="h-9 w-1/2" />
          <div className="w-1/2 pt-1">
            <Lines />
          </div>
        </div>
      );
    default:
      return <Img className="h-6 w-full" />;
  }
}

/** "Start easy with a Template": three ready-made layouts in one row. */
export function TemplatePickerDialog({ open, onOpenChange, onPick }: Props) {
  const templates = CANVAS_TEMPLATES.slice(0, 3);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="font-display text-lg font-normal">Start with a Template</DialogTitle>
          <DialogDescription>เลือกโครงสำเร็จรูป แล้วใส่รูปและข้อความของคุณแทนช่องตัวอย่าง แก้ทีหลังได้ทุกอย่าง</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-3 gap-3">
          {templates.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                onPick(t.id);
                onOpenChange(false);
              }}
              className="group flex min-w-0 flex-col rounded-2xl border border-border bg-card p-2.5 text-left transition-colors hover:border-foreground/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <div className="space-y-2 rounded-xl bg-background p-2.5">
                {t.preview.map((m, i) => (
                  <ModuleSketch
                    key={i}
                    kind={m.kind}
                    layout={"layout" in m ? (m.layout as string) : undefined}
                    side={"side" in m ? (m.side as string) : undefined}
                  />
                ))}
              </div>
              <div className="mt-2.5 flex items-center gap-1.5 px-0.5">
                <span className="truncate text-sm font-medium text-foreground">{t.label}</span>
                {t.recommended ? (
                  <span className="shrink-0 rounded-full bg-foreground px-1.5 py-0.5 text-[10px] text-background">แนะนำ</span>
                ) : null}
              </div>
              <p className="mt-0.5 px-0.5 text-[11px] leading-snug text-muted-foreground">{t.hint}</p>
              <p className="mt-1 flex items-center gap-1 px-0.5 text-[11px] text-muted-foreground/70">
                <Check className="h-3 w-3" aria-hidden />
                {t.moduleCount} โมดูล
              </p>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
