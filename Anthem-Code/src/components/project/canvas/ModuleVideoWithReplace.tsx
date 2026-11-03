import { useRef, useState } from "react";
import { Film, Image as ImageIcon, ImagePlus } from "lucide-react";
import { isVideoFile, PROJECT_VIDEO_ACCEPT } from "@/lib/videoAccept";
import { isAllowedPortfolioStillImage, PORTFOLIO_STILL_IMAGE_ACCEPT } from "@/lib/normalizeImageUpload";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { isToolDrag } from "@/components/project/canvas/canvasDnd";

/** Video module preview with replace / poster controls. */
export function takeVideoFile(list: FileList | File[] | null | undefined): File | null {
  if (!list) return null;
  return Array.from(list).find((f) => isVideoFile(f)) ?? null;
}

export function ModuleVideoWithReplace({
  src,
  posterUrl,
  disabled,
  uploading,
  onReplace,
  onSetPoster,
}: {
  src: string;
  posterUrl?: string;
  disabled?: boolean;
  uploading?: boolean;
  onReplace?: (file: File) => void;
  onSetPoster?: (file: File) => void;
}) {
  const videoInputRef = useRef<HTMLInputElement>(null);
  const posterInputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);

  const acceptVideoDrop = (fileList: FileList | null) => {
    const file = takeVideoFile(fileList);
    if (!file) {
      toast.error("รองรับเฉพาะไฟล์วิดีโอ");
      return;
    }
    onReplace?.(file);
  };

  return (
    <div
      className={cn(
        "group/crop relative overflow-hidden rounded-none bg-transparent",
        drag && "ring-2 ring-primary",
      )}
      onDragOver={(e) => {
        if (!onReplace || disabled || uploading || isToolDrag(e.dataTransfer)) return;
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = "copy";
        setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        if (!onReplace || disabled || uploading || isToolDrag(e.dataTransfer)) return;
        e.preventDefault();
        e.stopPropagation();
        setDrag(false);
        acceptVideoDrop(e.dataTransfer.files);
      }}
    >
      <video
        src={src}
        poster={posterUrl || undefined}
        controls
        className="max-h-[480px] w-full bg-muted"
        preload="metadata"
      />
      <div className="flex items-center justify-between gap-2 border-t border-border/40 bg-muted/40 px-3 py-2">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Film className="h-3.5 w-3.5 shrink-0" />
          วิดีโอ
        </div>
        {onSetPoster && !disabled ? (
          <button
            type="button"
            disabled={uploading}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border/70 bg-background px-2.5 text-xs font-medium text-foreground shadow-sm transition hover:bg-muted disabled:opacity-50"
            onClick={(e) => {
              e.stopPropagation();
              posterInputRef.current?.click();
            }}
          >
            <ImageIcon className="h-3.5 w-3.5" />
            {posterUrl ? "เปลี่ยน thumbnail" : "ใส่ thumbnail"}
          </button>
        ) : null}
      </div>
      {onReplace && !disabled ? (
        <>
          <button
            type="button"
            aria-label="เปลี่ยนวิดีโอ"
            title="เปลี่ยนวิดีโอ"
            className="absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-md border border-border/60 bg-background/90 text-foreground opacity-100 shadow-sm backdrop-blur transition hover:bg-background sm:opacity-0 sm:group-hover/crop:opacity-100"
            onClick={(e) => {
              e.stopPropagation();
              videoInputRef.current?.click();
            }}
          >
            <ImagePlus className="h-3.5 w-3.5" />
          </button>
          <input
            ref={videoInputRef}
            type="file"
            accept={PROJECT_VIDEO_ACCEPT}
            className="sr-only"
            disabled={disabled || uploading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                if (!isVideoFile(file)) {
                  toast.error("รองรับเฉพาะไฟล์วิดีโอ");
                } else {
                  onReplace(file);
                }
              }
              e.target.value = "";
            }}
          />
        </>
      ) : null}
      {onSetPoster ? (
        <input
          ref={posterInputRef}
          type="file"
          accept={PORTFOLIO_STILL_IMAGE_ACCEPT}
          className="sr-only"
          disabled={disabled || uploading}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              if (!isAllowedPortfolioStillImage(file)) {
                toast.error("รองรับ JPG, PNG, WebP, HEIC");
              } else {
                onSetPoster(file);
              }
            }
            e.target.value = "";
          }}
        />
      ) : null}
    </div>
  );
}

/** Empty video module — click upload or drag-and-drop video files. */
