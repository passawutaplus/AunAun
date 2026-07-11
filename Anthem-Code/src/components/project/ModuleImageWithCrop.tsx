import { useRef } from "react";
import { Crop, ImagePlus } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  src: string;
  alt?: string;
  disabled?: boolean;
  onCrop?: () => void;
  /** Replace this media with a new file (image or video). */
  onReplace?: (file: File) => void;
  accept?: string;
  replaceLabel?: string;
  className?: string;
  imgClassName?: string;
};

const TOOL_BTN =
  "flex h-8 w-8 items-center justify-center rounded-md border border-border/60 bg-background/90 text-foreground shadow-sm backdrop-blur transition hover:bg-background";

/** Image with hover crop + replace controls for canvas modules. */
export function ModuleImageWithCrop({
  src,
  alt = "",
  disabled,
  onCrop,
  onReplace,
  accept = "image/jpeg,image/png,image/webp",
  replaceLabel = "เปลี่ยนภาพ",
  className,
  imgClassName,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const showToolbar = !disabled && (!!onCrop || !!onReplace);

  return (
    <div className={cn("group/crop relative w-full overflow-hidden", className)}>
      <img src={src} alt={alt} className={cn("w-full object-contain", imgClassName)} draggable={false} />
      {showToolbar ? (
        <div className="absolute right-2 top-2 z-10 flex gap-1 opacity-100 sm:opacity-0 sm:group-hover/crop:opacity-100">
          {onReplace ? (
            <button
              type="button"
              aria-label={replaceLabel}
              title={replaceLabel}
              className={TOOL_BTN}
              onClick={(e) => {
                e.stopPropagation();
                inputRef.current?.click();
              }}
            >
              <ImagePlus className="h-3.5 w-3.5" />
            </button>
          ) : null}
          {onCrop ? (
            <button
              type="button"
              aria-label="ครอบภาพ"
              title="ครอบภาพ"
              className={TOOL_BTN}
              onClick={(e) => {
                e.stopPropagation();
                onCrop();
              }}
            >
              <Crop className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
      ) : null}
      {onReplace && !disabled ? (
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onReplace(file);
            e.target.value = "";
          }}
        />
      ) : null}
    </div>
  );
}
