import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2, Plus } from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import { ModuleImageWithCrop } from "@/components/project/ModuleImageWithCrop";
import { cn } from "@/lib/utils";

type Props = {
  urls: string[];
  disabled?: boolean;
  uploading?: boolean;
  onUploadMany: (files: File[]) => void;
  onReplaceAt?: (index: number, file: File) => void;
  onCropAt?: (index: number, url: string) => void;
};

function pickImageFiles(list: FileList | File[] | null | undefined): File[] {
  if (!list) return [];
  return Array.from(list).filter((f) => /^image\/(jpeg|png|webp)$/i.test(f.type));
}

export function GallerySlideBlockEditor({
  urls,
  disabled,
  uploading,
  onUploadMany,
  onReplaceAt,
  onCropAt,
}: Props) {
  const filled = urls.map((u) => u.trim()).filter(Boolean);
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const multiInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!api) return;
    setCurrent(api.selectedScrollSnap());
    const onSelect = () => setCurrent(api.selectedScrollSnap());
    api.on("select", onSelect);
    return () => {
      api.off("select", onSelect);
    };
  }, [api]);

  if (!filled.length) {
    return (
      <div className="space-y-2">
        <button
          type="button"
          disabled={disabled || uploading}
          onClick={() => multiInputRef.current?.click()}
          className="flex min-h-[160px] w-full flex-col items-center justify-center gap-2 rounded-none bg-muted/70 hover:bg-muted"
        >
          {uploading ? (
            <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
          ) : (
            <Plus className="h-8 w-8 text-muted-foreground/50" strokeWidth={1.25} />
          )}
          <span className="text-xs text-muted-foreground">อัปโหลดภาพสไลด์</span>
        </button>
        <input
          ref={multiInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="sr-only"
          disabled={disabled || uploading}
          onChange={(e) => {
            const files = pickImageFiles(e.target.files);
            if (files.length) onUploadMany(files);
            e.target.value = "";
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <Carousel setApi={setApi} className="overflow-hidden rounded-none bg-transparent">
          <CarouselContent>
            {filled.map((src, i) => (
              <CarouselItem key={`${src}-${i}`}>
                <div className="relative w-full bg-transparent">
                  <ModuleImageWithCrop
                    src={src}
                    disabled={disabled}
                    onCrop={onCropAt ? () => onCropAt(i, src) : undefined}
                    onReplace={onReplaceAt ? (file) => onReplaceAt(i, file) : undefined}
                    imgClassName="max-h-[min(80vh,720px)] w-full object-contain"
                  />
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
        {filled.length > 1 ? (
          <>
            <button
              type="button"
              aria-label="ภาพก่อนหน้า"
              disabled={disabled}
              onClick={() => api?.scrollPrev()}
              className="absolute left-2 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-background/20 text-foreground/55 shadow-none backdrop-blur-[2px] hover:bg-background/40 hover:text-foreground/80"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="ภาพถัดไป"
              disabled={disabled}
              onClick={() => api?.scrollNext()}
              className="absolute right-2 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-background/20 text-foreground/55 shadow-none backdrop-blur-[2px] hover:bg-background/40 hover:text-foreground/80"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </>
        ) : null}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-0.5">
        {filled.map((src, i) => (
          <button
            key={`${src}-thumb-${i}`}
            type="button"
            onClick={() => api?.scrollTo(i)}
            className={cn(
              "h-14 w-20 shrink-0 overflow-hidden rounded-none border-2 transition-all",
              current === i ? "border-primary" : "border-transparent opacity-60 hover:opacity-100",
            )}
          >
            <img src={src} alt="" className="h-full w-full object-cover" draggable={false} />
          </button>
        ))}
        <button
          type="button"
          disabled={disabled || uploading}
          onClick={() => multiInputRef.current?.click()}
          className="flex h-14 w-20 shrink-0 flex-col items-center justify-center gap-0.5 rounded-none border border-dashed border-border/80 bg-muted/40 text-muted-foreground hover:bg-muted"
          aria-label="เพิ่มภาพ"
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          <span className="text-[9px]">เพิ่ม</span>
        </button>
      </div>

      <input
        ref={multiInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="sr-only"
        disabled={disabled || uploading}
        onChange={(e) => {
          const files = pickImageFiles(e.target.files);
          if (files.length) onUploadMany(files);
          e.target.value = "";
        }}
      />
    </div>
  );
}
