import { useRef } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import SafeDemoImage from "@/components/SafeDemoImage";
import { Button } from "@/components/ui/button";
import { photoGridSlotCount, type PhotoGridLayout } from "@/lib/photoGridLayouts";
import { cn } from "@/lib/utils";

type GridImage = { url: string; alt?: string };

type Props = {
  images: GridImage[];
  layout: PhotoGridLayout;
  title: string;
  className?: string;
  editor?: boolean;
  disabled?: boolean;
  uploadingSlot?: number | null;
  onImageClick?: (index: number) => void;
  onSlotUpload?: (slotIndex: number, file: File) => void;
  onSlotRemove?: (slotIndex: number) => void;
};

function GridCell({
  image,
  index,
  title,
  editor,
  disabled,
  uploading,
  onImageClick,
  onSlotPick,
  onSlotRemove,
  className,
}: {
  image?: GridImage;
  index: number;
  title: string;
  editor?: boolean;
  disabled?: boolean;
  uploading?: boolean;
  onImageClick?: (index: number) => void;
  onSlotPick?: (index: number) => void;
  onSlotRemove?: (index: number) => void;
  className?: string;
}) {
  const canUpload = editor && onSlotPick && !disabled && !uploading;

  return (
    <div
      className={cn(
        "relative overflow-hidden",
        editor && !image && "border border-dashed border-border/50",
        className,
      )}
    >
      {uploading ? (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : image ? (
        <>
          <SafeDemoImage
            src={image.url}
            index={index}
            alt={image.alt ?? `${title} ${index + 1}`}
            onClick={
              canUpload
                ? () => onSlotPick(index)
                : onImageClick
                  ? () => onImageClick(index)
                  : undefined
            }
            className={cn(
              "absolute inset-0 h-full w-full object-cover",
              (canUpload || onImageClick) && "cursor-pointer",
            )}
            loading="lazy"
          />
          {editor && onSlotRemove && !disabled ? (
            <Button
              type="button"
              size="icon"
              variant="destructive"
              className="absolute top-1.5 right-1.5 h-7 w-7 rounded-full opacity-90"
              onClick={(e) => {
                e.stopPropagation();
                onSlotRemove(index);
              }}
              aria-label={`ลบภาพช่อง ${index + 1}`}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          ) : null}
        </>
      ) : canUpload ? (
        <button
          type="button"
          onClick={() => onSlotPick(index)}
          className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-muted-foreground transition-colors hover:text-foreground"
          aria-label={`อัปโหลดภาพช่อง ${index + 1}`}
        >
          <Plus className="w-8 h-8" strokeWidth={1.5} />
          <span className="text-[10px]">เพิ่มภาพ</span>
        </button>
      ) : editor ? (
        <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
          {index + 1}
        </div>
      ) : null}
    </div>
  );
}

export function PhotoGridPreview({
  images,
  layout,
  title,
  className,
  editor = false,
  disabled,
  uploadingSlot = null,
  onImageClick,
  onSlotUpload,
  onSlotRemove,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const pendingSlotRef = useRef<number | null>(null);

  const slots = photoGridSlotCount(layout);
  const slotImages = Array.from({ length: slots }, (_, i) => images[i]);
  const cellClass = "aspect-square w-full";

  const pickSlot = (index: number) => {
    pendingSlotRef.current = index;
    fileRef.current?.click();
  };

  const cellProps = {
    title,
    editor,
    disabled,
    onImageClick,
    onSlotPick: onSlotUpload ? pickSlot : undefined,
    onSlotRemove,
  };

  const renderSlot = (img: GridImage | undefined, i: number, className: string) => (
    <GridCell
      key={i}
      image={img}
      index={i}
      {...cellProps}
      uploading={uploadingSlot === i}
      className={className}
    />
  );

  let grid: React.ReactNode;

  if (layout === "two_stack") {
    grid = (
      <div
        className={cn(
          "grid mx-auto max-w-lg w-full grid-cols-1 gap-1.5 sm:gap-2 rounded-2xl overflow-hidden",
          className,
        )}
      >
        {slotImages.map((img, i) => renderSlot(img, i, cellClass))}
      </div>
    );
  } else if (layout === "two_side") {
    grid = (
      <div
        className={cn(
          "grid mx-auto max-w-lg w-full grid-cols-2 gap-1.5 sm:gap-2 rounded-2xl overflow-hidden",
          className,
        )}
      >
        {slotImages.map((img, i) => renderSlot(img, i, cellClass))}
      </div>
    );
  } else if (layout === "three_split") {
    grid = (
      <div
        className={cn(
          "grid mx-auto max-w-lg w-full aspect-square grid-cols-2 grid-rows-2 gap-1.5 sm:gap-2 rounded-2xl overflow-hidden",
          className,
        )}
      >
        {renderSlot(slotImages[0], 0, "row-span-2 h-full min-h-0")}
        {renderSlot(slotImages[1], 1, cellClass)}
        {renderSlot(slotImages[2], 2, cellClass)}
      </div>
    );
  } else {
    grid = (
      <div
        className={cn(
          "grid mx-auto max-w-lg w-full grid-cols-2 gap-1.5 sm:gap-2 rounded-2xl overflow-hidden",
          className,
        )}
      >
        {slotImages.map((img, i) => renderSlot(img, i, cellClass))}
      </div>
    );
  }

  return (
    <>
      {grid}
      {editor && onSlotUpload ? (
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            const slot = pendingSlotRef.current;
            if (file && slot !== null) onSlotUpload(slot, file);
            pendingSlotRef.current = null;
            e.target.value = "";
          }}
        />
      ) : null}
    </>
  );
}
