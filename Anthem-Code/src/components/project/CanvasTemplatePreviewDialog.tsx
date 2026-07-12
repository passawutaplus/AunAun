import { useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, Film, Image } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { UserCanvasTemplate } from "@/hooks/useCanvasTemplates";
import type { CanvasTemplateModule } from "@/lib/projectCanvasTemplates";
import { cn } from "@/lib/utils";

const GALLERY_MOCK_SLIDES = 4;

type Props = {
  template: UserCanvasTemplate | null;
  canvasHasBlocks: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (mode: "replace" | "append") => void;
};

function moduleLabel(slot: CanvasTemplateModule): ReactNode {
  switch (slot.kind) {
    case "heading":
      return "หัวข้อ";
    case "heading_body":
      return (
        <>
          หัวข้อ +
          <br />
          ข้อความ
        </>
      );
    case "body":
      return "ข้อความ";
    case "image":
      return "ภาพเดี่ยว";
    case "video":
      return "วิดีโอ";
    case "gallery":
      return "แกลเลอรี";
    case "grid":
      return "กริดภาพ";
    case "multi":
      return `แถว ${slot.columns} คอลัมน์`;
    case "image_text":
      return slot.side === "image_left" ? (
        <>
          ภาพ +
          <br />
          ข้อความ
        </>
      ) : (
        <>
          ข้อความ +
          <br />
          ภาพ
        </>
      );
    default:
      return "โมดูล";
  }
}

function MockImage({
  className,
  tall,
  tone = 0,
}: {
  className?: string;
  tall?: boolean;
  /** Slight visual difference between slides */
  tone?: number;
}) {
  const shift = (tone % 4) * 12;
  return (
    <div
      className={cn(
        "relative flex items-center justify-center overflow-hidden rounded-sm bg-gradient-to-br from-muted via-muted/80 to-foreground/10",
        tall ? "min-h-[72px]" : "min-h-[48px]",
        className,
      )}
    >
      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage: `radial-gradient(circle at ${28 + shift}% ${22 + shift * 0.4}%, hsl(var(--primary) / ${0.28 + (tone % 3) * 0.06}), transparent 55%), radial-gradient(circle at ${78 - shift}% ${68 - shift * 0.3}%, hsl(var(--foreground) / 0.14), transparent 50%)`,
        }}
        aria-hidden
      />
      <Image className="relative h-5 w-5 text-muted-foreground/80" strokeWidth={1.5} aria-hidden />
    </div>
  );
}

/** Matches live ProjectGallery: main slide + thumbnails underneath, clickable. */
function GalleryMockSlider() {
  const [current, setCurrent] = useState(0);
  const go = (next: number) => {
    setCurrent(((next % GALLERY_MOCK_SLIDES) + GALLERY_MOCK_SLIDES) % GALLERY_MOCK_SLIDES);
  };

  return (
    <div className="space-y-1.5">
      <div className="relative group">
        <MockImage tall tone={current} className="min-h-[96px]" />
        <button
          type="button"
          className="absolute left-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border-0 bg-background/25 text-foreground/70 backdrop-blur-[2px] hover:bg-background/45 hover:text-foreground"
          aria-label="สไลด์ก่อนหน้า"
          onClick={(e) => {
            e.stopPropagation();
            go(current - 1);
          }}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          className="absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border-0 bg-background/25 text-foreground/70 backdrop-blur-[2px] hover:bg-background/45 hover:text-foreground"
          aria-label="สไลด์ถัดไป"
          onClick={(e) => {
            e.stopPropagation();
            go(current + 1);
          }}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
        <span className="absolute bottom-1.5 right-2 rounded bg-background/50 px-1.5 py-0.5 text-[9px] tabular-nums text-foreground/80 backdrop-blur-[2px]">
          {current + 1}/{GALLERY_MOCK_SLIDES}
        </span>
      </div>
      <div className="flex gap-1.5 overflow-x-auto pb-0.5">
        {Array.from({ length: GALLERY_MOCK_SLIDES }, (_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`ไปสไลด์ ${i + 1}`}
            aria-current={current === i}
            onClick={(e) => {
              e.stopPropagation();
              setCurrent(i);
            }}
            className={cn(
              "h-10 w-14 shrink-0 overflow-hidden rounded-sm border-2 transition-all",
              current === i
                ? "border-primary opacity-100"
                : "border-transparent opacity-55 hover:opacity-90",
            )}
          >
            <MockImage tone={i} className="h-full min-h-0 w-full" />
          </button>
        ))}
      </div>
    </div>
  );
}

function MockupSlot({ slot }: { slot: CanvasTemplateModule }) {
  if (slot.kind === "heading") {
    return (
      <div className="flex items-center justify-center rounded-sm bg-muted/40 px-3 py-3.5">
        <div className="h-3 w-[72%] rounded-full bg-foreground/45" />
      </div>
    );
  }
  if (slot.kind === "heading_body") {
    return (
      <div className="space-y-2.5 rounded-sm bg-muted/40 px-3 py-3.5">
        <div className="h-3 w-[55%] rounded-full bg-foreground/45" />
        <div className="space-y-1.5">
          <div className="h-1 w-full rounded-full bg-foreground/30" />
          <div className="h-1 w-[85%] rounded-full bg-foreground/30" />
          <div className="h-1 w-[72%] rounded-full bg-foreground/30" />
        </div>
      </div>
    );
  }
  if (slot.kind === "body") {
    return (
      <div className="space-y-1.5 rounded-sm bg-muted/40 px-3 py-3.5">
        <div className="h-1 w-full rounded-full bg-foreground/30" />
        <div className="h-1 w-full rounded-full bg-foreground/30" />
        <div className="h-1 w-[85%] rounded-full bg-foreground/30" />
        <div className="h-1 w-[72%] rounded-full bg-foreground/30" />
      </div>
    );
  }
  if (slot.kind === "image") {
    return <MockImage tall />;
  }
  if (slot.kind === "video") {
    return (
      <div className="relative flex min-h-[72px] items-center justify-center overflow-hidden rounded-sm bg-gradient-to-br from-muted via-muted/70 to-foreground/15">
        <Film className="h-5 w-5 text-muted-foreground/80" strokeWidth={1.5} aria-hidden />
      </div>
    );
  }
  if (slot.kind === "gallery") {
    return <GalleryMockSlider />;
  }
  if (slot.kind === "multi") {
    return (
      <div className="flex gap-1.5">
        {Array.from({ length: slot.columns }, (_, i) => (
          <MockImage key={i} className="min-h-[56px] flex-1" />
        ))}
      </div>
    );
  }
  if (slot.kind === "grid") {
    if (slot.layout === "three_split" || slot.layout === "three_split_rev") {
      return (
        <div className="grid h-24 grid-cols-2 grid-rows-2 gap-1.5">
          <MockImage
            className={cn("min-h-0", slot.layout === "three_split" ? "row-span-2" : "col-start-2 row-span-2")}
          />
          <MockImage className="min-h-0" />
          <MockImage className="min-h-0" />
        </div>
      );
    }
    if (slot.layout === "four_quad") {
      return (
        <div className="grid h-24 grid-cols-2 grid-rows-2 gap-1.5">
          <MockImage className="min-h-0" />
          <MockImage className="min-h-0" />
          <MockImage className="min-h-0" />
          <MockImage className="min-h-0" />
        </div>
      );
    }
    if (slot.layout === "two_side") {
      return (
        <div className="flex h-20 gap-1.5">
          <MockImage className="min-h-0 flex-1" />
          <MockImage className="min-h-0 flex-1" />
        </div>
      );
    }
    return (
      <div className="flex h-24 flex-col gap-1.5">
        <MockImage className="min-h-0 flex-1" />
        <MockImage className="min-h-0 flex-1" />
      </div>
    );
  }
  if (slot.kind !== "image_text") return null;
  const image = <MockImage className="aspect-square h-16 w-16 shrink-0 min-h-0" />;
  const text = (
    <div className="flex min-w-0 flex-1 flex-col justify-center gap-1.5 py-1">
      <div className="h-2.5 w-[42%] rounded-full bg-foreground/45" />
      <div className="h-1 w-full rounded-full bg-foreground/30" />
      <div className="h-1 w-[85%] rounded-full bg-foreground/30" />
      <div className="h-1 w-[72%] rounded-full bg-foreground/30" />
    </div>
  );
  return (
    <div className="flex items-center gap-3 rounded-sm bg-muted/30 px-2 py-2">
      {slot.side === "image_left" ? (
        <>
          {image}
          {text}
        </>
      ) : (
        <>
          {text}
          {image}
        </>
      )}
    </div>
  );
}

export function CanvasTemplatePreviewDialog({
  template,
  canvasHasBlocks,
  open,
  onOpenChange,
  onConfirm,
}: Props) {
  if (!template) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(90vh,720px)] w-[calc(100%-1.25rem)] max-w-md gap-0 overflow-hidden p-0 sm:max-w-lg">
        <DialogHeader className="space-y-1.5 border-b border-border/60 px-4 py-3.5 text-left sm:px-5 sm:py-4">
          <DialogTitle className="text-base">
            {template.name}
            {template.recommended ? (
              <span className="ml-2 text-xs font-medium text-primary">แนะนำ</span>
            ) : null}
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed">
            {template.hint || "ดูโครงก่อน แล้วค่อยยืนยันเพื่อใส่ลงแคนวาส"}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[min(48vh,380px)] overflow-y-auto px-3 py-3 sm:max-h-[min(52vh,420px)] sm:px-5 sm:py-4">
          <div className="mb-2 flex items-baseline justify-between gap-2">
            <p className="text-[11px] font-medium text-muted-foreground">ตัวอย่างหน้าตา</p>
            <p className="text-[10px] text-muted-foreground/80">{template.modules.length} โมดูล</p>
          </div>

          <div className="rounded-md border border-border/50 bg-card/80 p-2.5 shadow-sm sm:p-3">
            <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-2 gap-y-2 sm:gap-x-2.5 sm:gap-y-2.5">
              {template.modules.map((slot, i) => (
                <div key={`${slot.kind}-${i}`} className="contents">
                  <p className="text-left text-[10px] font-medium leading-snug text-muted-foreground">
                    {moduleLabel(slot)}
                  </p>
                  <div className="min-w-0">
                    <MockupSlot slot={slot} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 border-t border-border/60 bg-muted/20 px-4 py-3.5 sm:flex-col sm:space-x-0 sm:px-5 sm:py-4">
          {canvasHasBlocks ? (
            <>
              <p className="w-full text-center text-[11px] text-muted-foreground">
                แคนวาสมีโมดูลอยู่แล้ว — เลือกวิธีใส่เทมเพลต
              </p>
              <Button type="button" className="w-full" onClick={() => onConfirm("replace")}>
                แทนที่ทั้งหมด
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="w-full"
                onClick={() => onConfirm("append")}
              >
                ต่อท้าย
              </Button>
            </>
          ) : (
            <Button type="button" className="w-full" onClick={() => onConfirm("replace")}>
              ใช้เทมเพลตนี้
            </Button>
          )}
          <Button type="button" variant="ghost" className="w-full" onClick={() => onOpenChange(false)}>
            ยกเลิก
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
