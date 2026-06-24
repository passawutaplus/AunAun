import * as React from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

// Full-screen image viewer with prev/next navigation for revision attachments.
export function ImageLightbox({
  images,
  index,
  onClose,
  onIndexChange,
}: {
  images: string[];
  index: number | null;
  onClose: () => void;
  onIndexChange: (i: number) => void;
}) {
  const open = index !== null;
  const hasMany = images.length > 1;

  React.useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" && index !== null)
        onIndexChange((index - 1 + images.length) % images.length);
      if (e.key === "ArrowRight" && index !== null) onIndexChange((index + 1) % images.length);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, index, images.length, onIndexChange]);

  if (!open || index === null) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="max-w-[96vw] sm:max-w-[90vw] h-[90vh] p-0 bg-black/95 border-0 flex items-center justify-center"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 z-10 h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
          aria-label="ปิด"
        >
          <X className="h-5 w-5" />
        </button>

        {hasMany && (
          <>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onIndexChange((index - 1 + images.length) % images.length)}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-10 h-12 w-12 rounded-full bg-white/10 hover:bg-white/20 text-white"
              aria-label="ก่อนหน้า"
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onIndexChange((index + 1) % images.length)}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-10 h-12 w-12 rounded-full bg-white/10 hover:bg-white/20 text-white"
              aria-label="ถัดไป"
            >
              <ChevronRight className="h-6 w-6" />
            </Button>
          </>
        )}

        <img
          src={images[index]}
          alt={`รูปประกอบ ${index + 1}`}
          className="max-h-full max-w-full object-contain"
        />

        {hasMany && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-white/10 text-white text-xs">
            {index + 1} / {images.length}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
