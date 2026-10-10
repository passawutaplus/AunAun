import { useRef, useState, type ReactNode } from "react";
import { AlignLeft, Film, GalleryHorizontal, ImagePlus, LayoutGrid, LayoutTemplate, PanelLeft } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { setCanvasToolDragData, type CanvasToolPayload } from "@/lib/canvasToolDrag";
import { PHOTO_GRID_LAYOUTS } from "@/lib/photoGridLayouts";
import { ModuleThumb } from "@/components/project/ModuleThumb";

type Props = {
  disabled?: boolean;
  onPickImages: (files: File[]) => void;
  onPlace: (payload: CanvasToolPayload) => void;
  onOpenTemplates: () => void;
};

type Option = { label: string; hint?: string; payload: CanvasToolPayload };

const pill =
  "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-secondary disabled:opacity-50";

const GALLERY_OPTIONS: Option[] = [
  { label: "เรียงแถว 2 ภาพ", payload: { tool: "multi", columns: 2 } },
  { label: "เรียงแถว 3 ภาพ", payload: { tool: "multi", columns: 3 } },
  { label: "เรียงแถว 4 ภาพ", payload: { tool: "multi", columns: 4 } },
  ...PHOTO_GRID_LAYOUTS.map((l) => ({
    label: `กริด · ${l.label}`,
    hint: `${l.slots} ภาพ`,
    payload: { tool: "grid", layout: l.id } as CanvasToolPayload,
  })),
];

const TEXT_OPTIONS: Option[] = [
  { label: "หัวข้อ", hint: "บรรทัดเดียว ตัวใหญ่", payload: { tool: "heading" } },
  { label: "หัวข้อ + เนื้อหา", payload: { tool: "heading_body" } },
  { label: "เนื้อหา", hint: "ย่อหน้าล้วน", payload: { tool: "body" } },
];

const IMAGE_TEXT_OPTIONS: Option[] = [
  { label: "ภาพซ้าย · ข้อความขวา", payload: { tool: "image_text", side: "image_left" } },
  { label: "ข้อความซ้าย · ภาพขวา", payload: { tool: "image_text", side: "text_left" } },
];

/** Quick drop's one-tap module bar. Modules with several layouts open a short picker. */
export function AddModuleBar({ disabled, onPickImages, onPlace, onOpenTemplates }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [openKey, setOpenKey] = useState<string | null>(null);

  /** Every button can also be dragged straight onto the artboard. */
  const drag = (payload: CanvasToolPayload) => ({
    draggable: !disabled,
    onDragStart: (e: React.DragEvent) => {
      if (disabled) return;
      setCanvasToolDragData(e.dataTransfer, payload);
    },
  });

  const picker = (
    key: string,
    label: string,
    icon: ReactNode,
    options: Option[],
    dragPayload: CanvasToolPayload,
    wide = false,
  ) => (
    <Popover open={openKey === key} onOpenChange={(o) => setOpenKey(o ? key : null)}>
      <PopoverTrigger asChild>
        <button type="button" disabled={disabled} className={pill} {...drag(dragPayload)}>
          {icon}
          {label}
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="center"
        collisionPadding={16}
        className={cn("p-2", wide ? "w-[27rem]" : options.length > 2 ? "w-[21rem]" : "w-[17rem]")}
      >
        <div
          className={cn(
            "grid gap-2",
            wide ? "max-h-[min(24rem,calc(var(--radix-popover-content-available-height)_-_1rem))] grid-cols-3 overflow-y-auto" : options.length > 2 ? "grid-cols-3" : "grid-cols-2",
          )}
        >
          {options.map((opt) => (
            <button
              key={opt.label}
              type="button"
              onClick={() => {
                onPlace(opt.payload);
                setOpenKey(null);
              }}
              className="group flex min-w-0 flex-col gap-1 rounded-xl border border-transparent p-1 text-left transition-colors hover:border-border hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ModuleThumb payload={opt.payload} className="border border-border/60" />
              <span className="truncate px-0.5 text-[11px] font-medium text-foreground">{opt.label}</span>
              {opt.hint ? <span className="-mt-1 truncate px-0.5 text-[10px] text-muted-foreground">{opt.hint}</span> : null}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );

  const icon = (Icon: typeof ImagePlus) => <Icon className="h-3.5 w-3.5" aria-hidden />;

  return (
    <div className="sticky bottom-24 z-20 flex justify-center px-3 lg:bottom-4">
      <div
        role="toolbar"
        data-tour="addbar"
        aria-label="เพิ่มโมดูล"
        className="flex max-w-full items-center gap-1 overflow-x-auto rounded-full border border-border bg-background/95 p-1.5 backdrop-blur-md"
      >
        <button
          type="button"
          disabled={disabled}
          className={cn(pill, "bg-foreground text-background hover:bg-foreground/90")}
          onClick={onOpenTemplates}
        >
          {icon(LayoutTemplate)}
          เริ่มง่าย ๆ ด้วย Template
        </button>
        <span className="shrink-0 pl-2 pr-1 text-xs text-muted-foreground">เพิ่ม</span>
        <button
          type="button"
          disabled={disabled}
          className={pill}
          onClick={() => fileRef.current?.click()}
          {...drag({ tool: "single" })}
        >
          {icon(ImagePlus)}
          ภาพ
        </button>
        {picker("gallery", "แกลเลอรี", icon(LayoutGrid), GALLERY_OPTIONS, { tool: "multi", columns: 3 }, true)}
        <button
          type="button"
          disabled={disabled}
          className={pill}
          onClick={() => onPlace({ tool: "gallery" })}
          {...drag({ tool: "gallery" })}
        >
          {icon(GalleryHorizontal)}
          สไลด์
        </button>
        {picker("text", "ข้อความ", icon(AlignLeft), TEXT_OPTIONS, { tool: "body" })}
        {picker("split", "ภาพ + ข้อความ", icon(PanelLeft), IMAGE_TEXT_OPTIONS, { tool: "image_text", side: "image_left" })}
        <button
          type="button"
          disabled={disabled}
          className={pill}
          onClick={() => onPlace({ tool: "video" })}
          {...drag({ tool: "video" })}
        >
          {icon(Film)}
          วิดีโอ
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          aria-label="เลือกรูปผลงาน"
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []);
            if (files.length) onPickImages(files);
            e.target.value = "";
          }}
        />
      </div>
    </div>
  );
}
