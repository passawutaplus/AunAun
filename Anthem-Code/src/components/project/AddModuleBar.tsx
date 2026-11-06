import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { AlignLeft, Film, GalleryHorizontal, ImagePlus, LayoutGrid, LayoutTemplate, PanelLeft, PanelLeftOpen } from "lucide-react";
import { liquidGlassOutline } from "@/lib/liquidGlass";
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
  /** The Template shortcut only makes sense on an empty artboard. */
  showTemplates?: boolean;
  /** Phones: round button left of the bar that opens the full tools sidebar. */
  onOpenTools?: () => void;
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
const TOOLS_BTN = 44;
const TOOLS_GAP = 8;

/** Phones: one frosted shape for the tools button + the bar (mirrors the bottom nav's search join). */
function BarGlass({ bar }: { bar: HTMLDivElement | null }) {
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  useLayoutEffect(() => {
    if (!bar) return;
    const measure = () => setSize({ w: bar.offsetWidth, h: bar.offsetHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(bar);
    return () => ro.disconnect();
  }, [bar]);
  if (!size || size.w === 0) return null;
  const width = size.w + TOOLS_GAP + TOOLS_BTN;
  const d = liquidGlassOutline(size.w, size.h, TOOLS_GAP, TOOLS_BTN);
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute left-0 top-0 -scale-x-100 lg:hidden"
      style={{ width, height: size.h }}
    >
      <div
        className="absolute inset-0 bg-background/65 backdrop-blur-xl backdrop-saturate-150 dark:bg-card/50"
        style={{ clipPath: `path('${d}')` }}
      />
      <svg className="absolute inset-0 overflow-visible" width={width} height={size.h}>
        <path d={d} fill="none" className="stroke-foreground/15" strokeWidth={1} />
      </svg>
    </div>
  );
}

export function AddModuleBar({ disabled, onPickImages, onPlace, onOpenTemplates, showTemplates = true, onOpenTools }: Props) {
  const [barEl, setBarEl] = useState<HTMLDivElement | null>(null);
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
              className="group flex min-w-0 flex-col gap-1 rounded-md border border-transparent p-1 text-left transition-colors hover:border-border hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
      <div className="relative flex min-w-0 max-w-full items-center" style={{ gap: onOpenTools ? TOOLS_GAP : 0 }}>
      {onOpenTools ? (
        <>
          <BarGlass bar={barEl} />
          <button
            type="button"
            aria-label="เปิดแถบเครื่องมือทั้งหมด"
            onClick={onOpenTools}
            className="relative flex shrink-0 items-center justify-center rounded-full text-foreground transition-colors active:bg-foreground/10 lg:hidden"
            style={{ width: TOOLS_BTN, height: TOOLS_BTN }}
          >
            <PanelLeftOpen className="h-4 w-4" aria-hidden />
          </button>
        </>
      ) : null}
      <div
        ref={setBarEl}
        role="toolbar"
        data-tour="addbar"
        aria-label="เพิ่มโมดูล"
        className={cn(
          "relative flex min-w-0 max-w-full items-center gap-1 overflow-x-auto rounded-full p-1.5",
          // Phones with the tools button: the shared BarGlass is the background.
          onOpenTools
            ? "lg:border lg:border-white/10 lg:bg-background/55 lg:shadow-lg lg:shadow-black/20 lg:backdrop-blur-xl lg:backdrop-saturate-150"
            : "border border-white/10 bg-background/55 shadow-lg shadow-black/20 backdrop-blur-xl backdrop-saturate-150",
        )}
      >
        {showTemplates ? (
          <button
            type="button"
            disabled={disabled}
            className={cn(pill, "bg-foreground text-background hover:bg-foreground/90")}
            onClick={onOpenTemplates}
          >
            {icon(LayoutTemplate)}
            เริ่มง่าย ๆ ด้วย Template
          </button>
        ) : null}
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
    </div>
  );
}
