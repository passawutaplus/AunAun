import { useRef } from "react";
import { AlignLeft, Film, GalleryHorizontal, Heading, ImagePlus, PanelLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CanvasToolPayload } from "@/lib/canvasToolDrag";

type Props = {
  disabled?: boolean;
  onPickImages: (files: File[]) => void;
  onPlace: (payload: CanvasToolPayload) => void;
};

/** Quick drop's one-tap module bar — the Studio module library, flattened to the common five. */
export function AddModuleBar({ disabled, onPickImages, onPlace }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const items: { key: string; label: string; icon: typeof ImagePlus; run: () => void }[] = [
    { key: "image", label: "ภาพ", icon: ImagePlus, run: () => fileRef.current?.click() },
    { key: "body", label: "ข้อความ", icon: AlignLeft, run: () => onPlace({ tool: "body" }) },
    { key: "heading", label: "หัวข้อ", icon: Heading, run: () => onPlace({ tool: "heading" }) },
    { key: "video", label: "วิดีโอ", icon: Film, run: () => onPlace({ tool: "video" }) },
    { key: "gallery", label: "สไลด์", icon: GalleryHorizontal, run: () => onPlace({ tool: "gallery" }) },
    { key: "split", label: "ภาพ + ข้อความ", icon: PanelLeft, run: () => onPlace({ tool: "image_text", side: "image_left" }) },
  ];

  return (
    <div className="sticky bottom-24 z-20 flex justify-center px-3 lg:bottom-4">
      <div
        role="toolbar"
        aria-label="เพิ่มโมดูล"
        className="flex max-w-full items-center gap-1 overflow-x-auto rounded-full border border-border bg-background/95 p-1.5 backdrop-blur-md"
      >
        <span className="shrink-0 pl-3 pr-1 text-xs text-muted-foreground">เพิ่ม</span>
        {items.map(({ key, label, icon: Icon, run }) => (
          <button
            key={key}
            type="button"
            disabled={disabled}
            onClick={run}
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium",
              "text-foreground transition-colors hover:bg-secondary disabled:opacity-50",
            )}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden />
            {label}
          </button>
        ))}
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
