import { useRef, useState } from "react";
import { Film, Image as ImageIcon, Loader2 } from "lucide-react";
import { UploadFileHint } from "@/components/ui/UploadFileHint";
import {
  endCanvasImageSlotDrag,
  isCanvasImageSlotDrag,
  readCanvasImageSlotDrag,
  type CanvasImageSlotRef,
} from "@/lib/canvasImageSlotDnD";
import { PROJECT_VIDEO_ACCEPT } from "@/lib/videoAccept";
import { isAllowedPortfolioImage, PORTFOLIO_IMAGE_ACCEPT } from "@/lib/normalizeImageUpload";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { isToolDrag } from "@/components/project/canvas/canvasDnd";
import { takeVideoFile } from "@/components/project/canvas/ModuleVideoWithReplace";

/** Empty image / video tiles shown before a module has media. */
export function EmptyVideoTile({
  disabled,
  uploading,
  onPick,
}: {
  disabled?: boolean;
  uploading?: boolean;
  onPick?: (file: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);

  const acceptFiles = (list: FileList | File[] | null | undefined) => {
    const file = takeVideoFile(list);
    if (!file) {
      toast.error("รองรับเฉพาะไฟล์วิดีโอ");
      return;
    }
    onPick?.(file);
  };

  return (
    <div
      role="button"
      tabIndex={disabled || uploading ? -1 : 0}
      aria-disabled={disabled || uploading || undefined}
      aria-label="อัปโหลดวิดีโอ"
      onClick={() => {
        if (disabled || uploading) return;
        inputRef.current?.click();
      }}
      onKeyDown={(e) => {
        if (disabled || uploading) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
      onDragOver={(e) => {
        if (isToolDrag(e.dataTransfer)) return;
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = "copy";
        setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        if (isToolDrag(e.dataTransfer)) return;
        e.preventDefault();
        e.stopPropagation();
        setDrag(false);
        acceptFiles(e.dataTransfer.files);
      }}
      className={cn(
        "flex min-h-[160px] w-full flex-col items-center justify-center gap-2 rounded-none bg-muted/70 transition-colors cursor-pointer",
        drag ? "ring-2 ring-primary bg-primary/5" : "hover:bg-muted",
        (disabled || uploading) && "opacity-60 pointer-events-none",
      )}
    >
      {uploading ? (
        <Loader2 className="h-7 w-7 animate-spin" />
      ) : (
        <>
          <Film className="h-8 w-8 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground/80">+Upload</span>
          <span className="px-2 text-center text-[10px] leading-snug text-muted-foreground/65">
            MP4, MOV, WebM · สูงสุด 50MB
          </span>
          <span className="text-[10px] text-muted-foreground">ลากวิดีโอมาวางได้</span>
        </>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={PROJECT_VIDEO_ACCEPT}
        className="sr-only"
        disabled={disabled || uploading}
        onChange={(e) => {
          acceptFiles(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}

export function EmptyImageTile({
  disabled,
  uploading,
  onPick,
  onPickMany,
  onSlotDrop,
  multiple = false,
  maxFiles = 1,
  className,
}: {
  disabled?: boolean;
  uploading?: boolean;
  onPick: (file: File) => void;
  onPickMany?: (files: File[]) => void;
  onSlotDrop?: (from: CanvasImageSlotRef) => void;
  multiple?: boolean;
  maxFiles?: number;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const limit = Math.max(1, maxFiles);
  const allowMany = multiple && !!onPickMany && limit > 1;

  const takeImageFiles = (list: FileList | File[] | null | undefined): File[] => {
    if (!list) return [];
    return Array.from(list)
      .filter((f) => isAllowedPortfolioImage(f))
      .slice(0, limit);
  };

  const handleFiles = (list: FileList | File[] | null | undefined) => {
    if (!list || list.length === 0) return;
    const files = takeImageFiles(list);
    if (!files.length) {
      toast.error("รองรับ JPG, PNG, GIF, WebP, HEIC");
      return;
    }
    if (allowMany) onPickMany?.(files);
    else onPick(files[0]!);
  };

  return (
    <div
      role="button"
      tabIndex={disabled || uploading ? -1 : 0}
      aria-disabled={disabled || uploading || undefined}
      aria-label={allowMany ? `เพิ่มภาพ (เลือกได้สูงสุด ${limit} ภาพ)` : "เพิ่มภาพ"}
      onClick={() => {
        if (disabled || uploading) return;
        inputRef.current?.click();
      }}
      onKeyDown={(e) => {
        if (disabled || uploading) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
      onDragOver={(e) => {
        if (isToolDrag(e.dataTransfer)) return;
        if (isCanvasImageSlotDrag(e.dataTransfer)) {
          if (!onSlotDrop || disabled) return;
          e.preventDefault();
          e.stopPropagation();
          e.dataTransfer.dropEffect = "move";
          setDrag(true);
          return;
        }
        e.preventDefault();
        e.stopPropagation();
        setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        if (isToolDrag(e.dataTransfer)) return;
        e.preventDefault();
        e.stopPropagation();
        setDrag(false);
        if (isCanvasImageSlotDrag(e.dataTransfer)) {
          const from = readCanvasImageSlotDrag(e.dataTransfer);
          endCanvasImageSlotDrag();
          if (from) onSlotDrop?.(from);
          return;
        }
        handleFiles(e.dataTransfer.files);
      }}
      className={cn(
        "aspect-square w-full min-w-0 rounded-none bg-muted/70 flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer",
        drag ? "ring-2 ring-primary bg-primary/5" : "hover:bg-muted",
        (disabled || uploading) && "opacity-60 pointer-events-none",
        className,
      )}
    >
      {uploading ? (
        <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
      ) : (
        <>
          <ImageIcon className="h-8 w-8 text-muted-foreground" strokeWidth={1.25} />
          <span className="text-xs font-medium text-muted-foreground/80">+Upload</span>
          <UploadFileHint formats="JPG, PNG, GIF" maxMb={30} className="px-2 text-center" />
        </>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={PORTFOLIO_IMAGE_ACCEPT}
        multiple={allowMany}
        className="sr-only"
        disabled={disabled || uploading}
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}
