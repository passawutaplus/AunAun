import { useRef } from "react";
import { Film, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GALLERY_DISPLAY_MODES, type GalleryDisplayMode } from "@/lib/projectContentBlocks";
import { cn } from "@/lib/utils";

interface GalleryMediaButtonsProps {
  galleryDisplayMode: GalleryDisplayMode;
  onDisplayModeChange: (mode: GalleryDisplayMode) => void;
  imageDisabled?: boolean;
  videoDisabled?: boolean;
  uploadingImage?: boolean;
  uploadingVideo?: boolean;
  onPickImages: (files: FileList) => void;
  onPickVideo: (file: File) => void;
}

export function GalleryMediaButtons({
  galleryDisplayMode,
  onDisplayModeChange,
  imageDisabled,
  videoDisabled,
  uploadingImage,
  uploadingVideo,
  onPickImages,
  onPickVideo,
}: GalleryMediaButtonsProps) {
  const singleImageRef = useRef<HTMLInputElement>(null);
  const galleryImageRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);

  const pickImages = (mode: GalleryDisplayMode) => {
    if (imageDisabled || uploadingImage) return;
    onDisplayModeChange(mode);
    requestAnimationFrame(() => {
      if (mode === "single") singleImageRef.current?.click();
      else galleryImageRef.current?.click();
    });
  };

  return (
    <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
      <div
        className={cn(
          "inline-flex items-center rounded-full border border-border bg-muted/40 p-0.5",
          (imageDisabled || uploadingImage) && "opacity-50 pointer-events-none",
        )}
        role="group"
        aria-label="เพิ่มภาพ"
      >
        {GALLERY_DISPLAY_MODES.map((mode) => {
          const active = galleryDisplayMode === mode.id;
          const isLoading = uploadingImage && active;
          return (
            <button
              key={mode.id}
              type="button"
              disabled={imageDisabled || uploadingImage}
              aria-pressed={active}
              title={mode.hint}
              onClick={() => pickImages(mode.id)}
              className={cn(
                "inline-flex items-center rounded-full px-2.5 sm:px-3 py-1.5 text-xs font-medium transition-colors",
                active
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-background/50",
              )}
            >
              {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : mode.label}
            </button>
          );
        })}
      </div>

      <Button
        size="sm"
        variant="outline"
        className="rounded-full"
        disabled={videoDisabled || uploadingVideo}
        onClick={() => videoRef.current?.click()}
      >
        {uploadingVideo ? (
          <Loader2 className="w-4 h-4 mr-1 animate-spin" />
        ) : (
          <Film className="w-4 h-4 mr-1" />
        )}
        เพิ่มวิดีโอ
      </Button>

      <input
        ref={singleImageRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        hidden
        onChange={(e) => {
          if (e.target.files?.length) onPickImages(e.target.files);
          e.target.value = "";
        }}
      />
      <input
        ref={galleryImageRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        hidden
        onChange={(e) => {
          if (e.target.files?.length) onPickImages(e.target.files);
          e.target.value = "";
        }}
      />
      <input
        ref={videoRef}
        type="file"
        accept="video/mp4,video/webm,video/quicktime"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onPickVideo(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}
