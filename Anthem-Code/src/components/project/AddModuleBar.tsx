import { useRef, useState, type ReactNode } from "react";
import { AlignLeft, Film, GalleryHorizontal, ImagePlus, PanelLeft } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { CanvasToolPayload } from "@/lib/canvasToolDrag";
import { PHOTO_GRID_LAYOUTS } from "@/lib/photoGridLayouts";

type Props = {
  disabled?: boolean;
  onPickImages: (files: File[]) => void;
  onPlace: (payload: CanvasToolPayload) => void;
};

type Option = { label: string; hint?: string; payload: CanvasToolPayload };

const pill =
  "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-secondary disabled:opacity-50";

const GALLERY_OPTIONS: Option[] = [
  { label: "สไลด์เลื่อนดู", hint: "หลายภาพ เลื่อนซ้าย-ขวา", payload: { tool: "gallery" } },
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
export function AddModuleBar({ disabled, onPickImages, onPlace }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [openKey, setOpenKey] = useState<string | null>(null);

  const picker = (key: string, label: string, icon: ReactNode, options: Option[], wide = false) => (
    <Popover open={openKey === key} onOpenChange={(o) => setOpenKey(o ? key : null)}>
      <PopoverTrigger asChild>
        <button type="button" disabled={disabled} className={pill}>
          {icon}
          {label}
        </button>
      </PopoverTrigger>
      <PopoverContent side="top" align="center" className={cn("p-1.5", wide ? "w-72" : "w-60")}>
        <div className={cn("flex flex-col", wide && "max-h-72 overflow-y-auto")}>
          {options.map((opt) => (
            <button
              key={opt.label}
              type="button"
              onClick={() => {
                onPlace(opt.payload);
                setOpenKey(null);
              }}
              className="flex items-baseline justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm hover:bg-secondary"
            >
              <span>{opt.label}</span>
              {opt.hint ? <span className="shrink-0 text-xs text-muted-foreground">{opt.hint}</span> : null}
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
        <span className="shrink-0 pl-3 pr-1 text-xs text-muted-foreground">เพิ่ม</span>
        <button type="button" disabled={disabled} className={pill} onClick={() => fileRef.current?.click()}>
          {icon(ImagePlus)}
          ภาพ
        </button>
        {picker("gallery", "แกลเลอรี", icon(GalleryHorizontal), GALLERY_OPTIONS, true)}
        {picker("text", "ข้อความ", icon(AlignLeft), TEXT_OPTIONS)}
        {picker("split", "ภาพ + ข้อความ", icon(PanelLeft), IMAGE_TEXT_OPTIONS)}
        <button type="button" disabled={disabled} className={pill} onClick={() => onPlace({ tool: "video" })}>
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
