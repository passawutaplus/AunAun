import { useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PORTFOLIO_STILL_IMAGE_ACCEPT } from "@/lib/normalizeImageUpload";

/** Cover image drop zone used by the project editor (details dialog + empty state). */
export const CoverDrop = ({
  url,
  loading,
  onPick,
  onClear,
  compact = false,
  invalid = false,
}: {
  url: string;
  loading: boolean;
  onPick: (f: File) => void;
  onClear: () => void;
  compact?: boolean;
  invalid?: boolean;
}) => {
  const ref = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);

  const pickFile = (file: File | undefined) => {
    if (file) onPick(file);
  };

  if (url) {
    return (
      <div
        className={cn(
          "group relative w-full overflow-hidden rounded-xl border border-border bg-muted transition-[border-color,box-shadow] duration-500 ease-out",
          compact ? "aspect-[4/3]" : "aspect-[4/3] rounded-2xl",
          invalid && "border-destructive ring-1 ring-destructive/40",
        )}
      >
        <img loading="lazy" decoding="async" src={url} alt="cover" className="absolute inset-0 h-full w-full object-cover" />
        <div
          className={cn(
            "absolute right-2 top-2 flex gap-1.5 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100",
            compact && "flex-col sm:flex-row",
          )}
        >
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className={cn("rounded-full", compact && "h-8 px-2 text-xs")}
            disabled={loading}
            onClick={() => ref.current?.click()}
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImagePlus className="w-3.5 h-3.5 mr-1" />}
            เปลี่ยน
          </Button>
          <Button
            type="button"
            size="sm"
            variant="destructive"
            className={cn("rounded-full", compact && "h-8 px-2 text-xs")}
            onClick={onClear}
          >
            <X className="w-3.5 h-3.5 mr-1" /> ลบ
          </Button>
        </div>
        <input ref={ref} type="file" accept={PORTFOLIO_STILL_IMAGE_ACCEPT} hidden onChange={(e) => pickFile(e.target.files?.[0])} />
      </div>
    );
  }
  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault(); setDrag(false);
        pickFile(e.dataTransfer.files?.[0]);
      }}
      onClick={() => ref.current?.click()}
      aria-label="ภาพปก"
      className={cn(
        "flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed transition-[border-color,background-color,box-shadow] duration-500 ease-out glass-panel",
        compact ? "aspect-[4/3] px-3 py-4" : "min-h-[200px] gap-3 rounded-2xl",
        drag
          ? "border-primary bg-primary/10 shadow-sm"
          : invalid
            ? "border-destructive bg-destructive/5"
            : "border-border/80 hover:border-primary/40 hover:bg-muted/20",
      )}
    >
      {loading ? (
        <Loader2 className={cn("animate-spin text-primary", compact ? "h-5 w-5" : "h-6 w-6")} />
      ) : (
        <ImagePlus className={cn("text-muted-foreground", compact ? "h-6 w-6" : "h-8 w-8")} />
      )}
      <p className={cn("text-center font-medium text-foreground", compact ? "text-xs leading-snug" : "text-sm")}>
        อัปโหลดภาพหน้าปก <span className="text-primary">*</span>
      </p>
      {!compact ? (
        <p className="text-xs text-muted-foreground">JPG / PNG — สูงสุด 30MB · ครอปเป็น 4:3 แนวนอน</p>
      ) : null}
      <input ref={ref} type="file" accept={PORTFOLIO_STILL_IMAGE_ACCEPT} hidden onChange={(e) => pickFile(e.target.files?.[0])} />
    </div>
  );
};

export default CoverDrop;
