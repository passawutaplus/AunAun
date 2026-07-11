import { useEffect, useRef, useState, Fragment, type DragEvent } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ArrowDown,
  ArrowUp,
  Copy,
  Film,
  GripVertical,
  Image as ImageIcon,
  ImagePlus,
  LayoutTemplate,
  Loader2,
  Plus,
  Trash2,
  Type,
} from "lucide-react";
import { ProjectRichTextField } from "@/components/project/ProjectRichTextField";
import { CANVAS_TOOL_MIME, readCanvasToolDragData, type CanvasToolPayload } from "@/lib/canvasToolDrag";
import {
  PROJECT_BLOCK_BODY_MAX,
  PROJECT_BLOCK_HEADING_MAX,
  PROJECT_CONTENT_BLOCKS_MAX,
  blockImageUrls,
  canvasBlockLabel,
  duplicateContentBlock,
  isImageTextBlockType,
  isMediaBlockType,
  isTextBlockType,
  parseBlockGapAfter,
  textVerticalAlignClass,
  type BlockGapAfter,
  type ProjectContentBlock,
} from "@/lib/projectContentBlocks";
import { GallerySlideBlockEditor } from "@/components/project/GallerySlideBlockEditor";
import { ModuleImageWithCrop } from "@/components/project/ModuleImageWithCrop";
import { cn } from "@/lib/utils";

type Props = {
  blocks: ProjectContentBlock[];
  onChange: (blocks: ProjectContentBlock[]) => void;
  disabled?: boolean;
  emptyHint?: string;
  onEmptyDropImages?: (files: FileList) => void;
  /** First-time empty canvas: open template picker in tools sidebar. */
  onStartFromTemplate?: () => void;
  /** First-time empty canvas: pick image file(s) to start. */
  onStartFromImage?: () => void;
  /** First-time empty canvas: place a heading module. */
  onStartFromHeading?: () => void;
  onPlaceTool?: (payload: CanvasToolPayload, insertAt?: number) => void;
  onUploadToBlock?: (blockId: string, file: File, slotIndex?: number) => void;
  onUploadManyToBlock?: (blockId: string, files: File[]) => void;
  onCropImage?: (blockId: string, imageUrl: string, slotIndex?: number) => void;
  uploadingBlockId?: string | null;
  uploading?: boolean;
  selectedBlockId?: string | null;
  onSelectedBlockIdChange?: (id: string | null) => void;
};

type InsertEdge = "before" | "after";
type InsertHint = { blockId: string; edge: InsertEdge };

function isToolDrag(dt: DataTransfer) {
  return Array.from(dt.types).some((t) => t === CANVAS_TOOL_MIME || t === "text/plain");
}

function edgeFromPointer(e: DragEvent, el: HTMLElement): InsertEdge {
  const rect = el.getBoundingClientRect();
  return e.clientY - rect.top < rect.height / 2 ? "before" : "after";
}

function InsertDropZone({ active }: { active?: boolean }) {
  return (
    <div
      className={cn(
        "pointer-events-none flex min-h-[44px] items-center justify-center rounded-lg border border-dashed px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "border-sky-500 bg-sky-50 text-sky-600 dark:bg-sky-950/40 dark:text-sky-300"
          : "border-border/80 bg-muted/40 text-muted-foreground",
      )}
      aria-hidden
    >
      <span className="inline-flex items-center gap-1.5">
        <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
        วางโมดูลที่นี่
      </span>
    </div>
  );
}

function BlockGapToggle({
  value,
  disabled,
  onChange,
}: {
  value: BlockGapAfter;
  disabled?: boolean;
  onChange: (next: BlockGapAfter) => void;
}) {
  const tight = value === "tight";
  return (
    <div className={cn("relative w-full shrink-0", tight ? "h-0" : "h-5")}>
      <div className="group/gap absolute inset-x-0 top-1/2 z-20 flex h-7 -translate-y-1/2 items-center justify-center">
        <button
          type="button"
          disabled={disabled}
          onClick={(e) => {
            e.stopPropagation();
            onChange(tight ? "spaced" : "tight");
          }}
          className={cn(
            "flex h-7 min-w-[3.25rem] items-center justify-center gap-1.5 rounded-full border border-border/60 bg-background/95 px-2.5 text-[10px] font-medium text-muted-foreground shadow-sm transition",
            "opacity-0 group-hover/gap:opacity-100 focus-visible:opacity-100",
            "hover:border-sky-500/50 hover:text-foreground",
            disabled && "pointer-events-none",
          )}
          title={tight ? "ชิดกัน — กดเพื่อห่าง" : "ห่าง — กดเพื่อชิด"}
          aria-label={tight ? "ระยะห่าง: ชิด กดเพื่อห่าง" : "ระยะห่าง: ห่าง กดเพื่อชิด"}
        >
          <span
            className={cn("h-1.5 w-1.5 rounded-full", tight ? "bg-sky-500" : "bg-muted-foreground/50")}
            aria-hidden
          />
          {tight ? "ชิด" : "ห่าง"}
        </button>
      </div>
    </div>
  );
}

function ModuleVideoWithReplace({
  src,
  disabled,
  uploading,
  onReplace,
}: {
  src: string;
  disabled?: boolean;
  uploading?: boolean;
  onReplace?: (file: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="group/crop relative overflow-hidden rounded-none bg-transparent">
      <video src={src} controls className="max-h-[480px] w-full" preload="metadata" />
      {onReplace && !disabled ? (
        <>
          <button
            type="button"
            aria-label="เปลี่ยนวิดีโอ"
            title="เปลี่ยนวิดีโอ"
            className="absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-md border border-border/60 bg-background/90 text-foreground opacity-100 shadow-sm backdrop-blur transition hover:bg-background sm:opacity-0 sm:group-hover/crop:opacity-100"
            onClick={(e) => {
              e.stopPropagation();
              inputRef.current?.click();
            }}
          >
            <ImagePlus className="h-3.5 w-3.5" />
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="video/mp4,video/webm,video/quicktime"
            className="sr-only"
            disabled={disabled || uploading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onReplace(file);
              e.target.value = "";
            }}
          />
        </>
      ) : null}
    </div>
  );
}

function EmptyImageTile({
  disabled,
  uploading,
  onPick,
  className,
}: {
  disabled?: boolean;
  uploading?: boolean;
  onPick: (file: File) => void;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);

  return (
    <button
      type="button"
      disabled={disabled || uploading}
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => {
        if (isToolDrag(e.dataTransfer)) return;
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
        const file = e.dataTransfer.files?.[0];
        if (file) onPick(file);
      }}
      className={cn(
        "aspect-square w-full min-w-0 rounded-none bg-muted/70 flex flex-col items-center justify-center gap-1 transition-colors",
        drag ? "ring-2 ring-primary bg-primary/5" : "hover:bg-muted",
        (disabled || uploading) && "opacity-60",
        className,
      )}
    >
      {uploading ? (
        <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
      ) : (
        <ImageIcon className="h-8 w-8 text-muted-foreground/50" strokeWidth={1.25} />
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        disabled={disabled || uploading}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onPick(file);
          e.target.value = "";
        }}
      />
    </button>
  );
}

function BlockSideRail({
  disabled,
  isFirst,
  isLast,
  visible,
  canDuplicate,
  dragListeners,
  dragAttributes,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onRemove,
}: {
  disabled?: boolean;
  isFirst: boolean;
  isLast: boolean;
  visible?: boolean;
  canDuplicate?: boolean;
  dragListeners: Record<string, unknown>;
  dragAttributes: Record<string, unknown>;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDuplicate: () => void;
  onRemove: () => void;
}) {
  const btn =
    "flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-foreground/10 hover:text-foreground disabled:opacity-30 disabled:pointer-events-none";

  return (
    <div
      className={cn(
        "absolute left-full top-1/2 z-20 flex -translate-y-1/2 flex-col gap-0.5 pl-2 transition-opacity duration-150",
        visible ? "opacity-100" : "pointer-events-none opacity-0",
      )}
    >
      <button
        type="button"
        className={cn(btn, "cursor-grab active:cursor-grabbing touch-none")}
        aria-label="ลากเรียงบล็อก"
        disabled={disabled}
        {...dragAttributes}
        {...dragListeners}
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>
      <button type="button" className={btn} aria-label="เลื่อนขึ้น" disabled={disabled || isFirst} onClick={onMoveUp}>
        <ArrowUp className="h-3.5 w-3.5" />
      </button>
      <button type="button" className={btn} aria-label="เลื่อนลง" disabled={disabled || isLast} onClick={onMoveDown}>
        <ArrowDown className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        className={btn}
        aria-label="ทำซ้ำบล็อก"
        disabled={disabled || !canDuplicate}
        onClick={onDuplicate}
      >
        <Copy className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        className={cn(btn, "text-red-500 hover:bg-red-500/15 hover:text-red-600 dark:hover:text-red-400")}
        aria-label="ลบบล็อก"
        disabled={disabled}
        onClick={onRemove}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function SortableCanvasBlock({
  block,
  index,
  total,
  disabled,
  uploading,
  selected,
  insertHint,
  canDuplicate,
  onSelect,
  onPatch,
  onRemove,
  onMove,
  onDuplicate,
  onUpload,
  onUploadMany,
  onCrop,
  onToolDragOver,
  onToolDragLeave,
  onToolDrop,
}: {
  block: ProjectContentBlock;
  index: number;
  total: number;
  disabled?: boolean;
  uploading?: boolean;
  selected?: boolean;
  insertHint?: InsertEdge | null;
  canDuplicate?: boolean;
  onSelect: () => void;
  onPatch: (patch: Partial<ProjectContentBlock>) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
  onDuplicate: () => void;
  onUpload?: (file: File, slotIndex?: number) => void;
  onUploadMany?: (files: File[]) => void;
  onCrop?: (imageUrl: string, slotIndex?: number) => void;
  onToolDragOver?: (e: DragEvent, el: HTMLElement) => void;
  onToolDragLeave?: () => void;
  onToolDrop?: (e: DragEvent, el: HTMLElement) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: block.id,
    disabled,
  });
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const hoverHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [hovered, setHovered] = useState(false);
  const showRail = selected || hovered;

  const clearHoverHideTimer = () => {
    if (hoverHideTimerRef.current) {
      clearTimeout(hoverHideTimerRef.current);
      hoverHideTimerRef.current = null;
    }
  };

  const handleBlockMouseEnter = () => {
    clearHoverHideTimer();
    setHovered(true);
  };

  const handleBlockMouseLeave = () => {
    clearHoverHideTimer();
    hoverHideTimerRef.current = setTimeout(() => {
      setHovered(false);
      hoverHideTimerRef.current = null;
    }, 2000);
  };

  useEffect(() => () => clearHoverHideTimer(), []);

  const setRefs = (node: HTMLDivElement | null) => {
    wrapRef.current = node;
    setNodeRef(node);
  };

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const label = canvasBlockLabel(block);
  const imageUrls = block.type === "image" ? blockImageUrls(block) : [];
  const isGallery = block.type === "image" && block.mediaLayout === "gallery";
  const multiRow = block.type === "image" && block.mediaLayout === "multi";
  const multi =
    multiRow ||
    (block.type === "image" &&
      (block.mediaLayout === "grid" || (imageUrls.length > 1 && block.mediaLayout !== "gallery")));
  const rowColumns = multiRow
    ? block.rowColumns === 3 || block.rowColumns === 4
      ? block.rowColumns
      : 2
    : 2;
  const slotCount = multiRow
    ? rowColumns
    : multi
      ? Math.max(imageUrls.length, block.mediaLayout === "grid" ? 2 : 1)
      : 1;
  const slots = multi
    ? Array.from({ length: slotCount }, (_, i) => imageUrls[i] ?? "")
    : imageUrls.length
      ? imageUrls
      : [""];

  return (
    <div
      ref={setRefs}
      style={style}
      className={cn("relative flex flex-col gap-2", isDragging && "z-10 opacity-90")}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onDragOver={(e) => {
        if (disabled || !isToolDrag(e.dataTransfer)) return;
        e.preventDefault();
        e.stopPropagation();
        if (contentRef.current) onToolDragOver?.(e, contentRef.current);
      }}
      onDragLeave={(e) => {
        if (!wrapRef.current) return;
        const related = e.relatedTarget as Node | null;
        if (related && wrapRef.current.contains(related)) return;
        onToolDragLeave?.();
      }}
      onDrop={(e) => {
        if (disabled || !isToolDrag(e.dataTransfer)) return;
        e.preventDefault();
        e.stopPropagation();
        if (contentRef.current) onToolDrop?.(e, contentRef.current);
      }}
    >
      {insertHint ? <InsertDropZone active={insertHint === "before"} /> : null}

      <div
        ref={contentRef}
        className="relative"
        onMouseEnter={handleBlockMouseEnter}
        onMouseLeave={handleBlockMouseLeave}
      >
      <div
        className={cn(
          "absolute -left-1 top-2 z-10 -translate-x-full rounded-none px-2 py-1 text-[11px] font-medium whitespace-nowrap",
          selected || hovered ? "bg-foreground text-background" : "bg-muted text-muted-foreground",
        )}
      >
        {label}
      </div>

      <div
        className={cn(
          "rounded-none bg-transparent transition-[box-shadow]",
          isTextBlockType(block.type) || isImageTextBlockType(block.type)
            ? cn(
                "border p-3 sm:p-4",
                selected || hovered ? "border-sky-500 shadow-[0_0_0_1px_rgba(14,165,233,0.35)]" : "border-border/70",
                insertHint && "border-sky-400/70",
              )
            : cn(
                "p-0",
                (selected || hovered || insertHint) &&
                  "shadow-[inset_0_0_0_1px_rgb(14,165,233)]",
              ),
        )}
      >
        {block.type === "image_text" ? (
          (() => {
            const imageCol = (
              <div key="image" className="min-w-0">
                {block.url?.trim() ? (
                  <div className="min-w-0 overflow-hidden rounded-none bg-transparent">
                    <ModuleImageWithCrop
                      src={block.url}
                      disabled={disabled}
                      onCrop={onCrop ? () => onCrop(block.url!, undefined) : undefined}
                      onReplace={onUpload ? (file) => onUpload(file) : undefined}
                      imgClassName="w-full object-contain"
                    />
                  </div>
                ) : (
                  <EmptyImageTile
                    disabled={disabled}
                    uploading={uploading}
                    onPick={(file) => onUpload?.(file)}
                  />
                )}
              </div>
            );
            const textCol = (
              <div
                key="text"
                className={cn("flex h-full min-w-0", textVerticalAlignClass(block.textVerticalAlign))}
              >
                <ProjectRichTextField
                  value={block.body ?? ""}
                  onChange={(body) => onPatch({ body })}
                  placeholder="พิมพ์ข้อความ..."
                  maxLength={PROJECT_BLOCK_BODY_MAX}
                  disabled={disabled}
                  minHeightClass="min-h-[120px]"
                  className="w-full"
                  verticalAlign={block.textVerticalAlign ?? "middle"}
                  onVerticalAlignChange={(textVerticalAlign) => onPatch({ textVerticalAlign })}
                />
              </div>
            );
            return (
              <div className="grid min-w-0 grid-cols-2 gap-3 sm:gap-4">
                {block.splitSide === "text_left" ? (
                  <>
                    {textCol}
                    {imageCol}
                  </>
                ) : (
                  <>
                    {imageCol}
                    {textCol}
                  </>
                )}
              </div>
            );
          })()
        ) : null}

        {block.type === "image" ? (
          isGallery ? (
            <GallerySlideBlockEditor
              urls={imageUrls}
              disabled={disabled}
              uploading={uploading}
              onUploadMany={(files) => onUploadMany?.(files)}
              onReplaceAt={(index, file) => onUpload?.(file, index)}
              onCropAt={(index, url) => onCrop?.(url, index)}
            />
          ) : block.mediaLayout === "grid" &&
          (block.gridLayout === "three_split" || block.gridLayout === "three_split_rev") ? (
            <div className="grid aspect-square w-full min-w-0 grid-cols-2 grid-rows-2 gap-2">
              {block.gridLayout === "three_split" ? (
                <>
                  <div className="row-span-2 min-h-0 min-w-0">
                    {slots[0]?.trim() ? (
                      <div className="h-full min-w-0 overflow-hidden rounded-none bg-transparent">
                        <ModuleImageWithCrop
                          src={slots[0]}
                          disabled={disabled}
                          className="h-full"
                          imgClassName="h-full w-full object-cover"
                          onCrop={onCrop ? () => onCrop(slots[0], 0) : undefined}
                          onReplace={onUpload ? (file) => onUpload(file, 0) : undefined}
                        />
                      </div>
                    ) : (
                      <EmptyImageTile
                        disabled={disabled}
                        uploading={uploading}
                        onPick={(file) => onUpload?.(file, 0)}
                        className="!aspect-auto h-full min-h-0"
                      />
                    )}
                  </div>
                  {[1, 2].map((slotIndex) =>
                    slots[slotIndex]?.trim() ? (
                      <div key={slotIndex} className="min-h-0 min-w-0 overflow-hidden rounded-none bg-transparent">
                        <ModuleImageWithCrop
                          src={slots[slotIndex]}
                          disabled={disabled}
                          className="h-full"
                          imgClassName="h-full w-full object-cover"
                          onCrop={onCrop ? () => onCrop(slots[slotIndex], slotIndex) : undefined}
                          onReplace={onUpload ? (file) => onUpload(file, slotIndex) : undefined}
                        />
                      </div>
                    ) : (
                      <EmptyImageTile
                        key={slotIndex}
                        disabled={disabled}
                        uploading={uploading}
                        onPick={(file) => onUpload?.(file, slotIndex)}
                        className="!aspect-auto h-full min-h-0"
                      />
                    ),
                  )}
                </>
              ) : (
                <>
                  {[1, 2].map((slotIndex) =>
                    slots[slotIndex]?.trim() ? (
                      <div
                        key={slotIndex}
                        className={cn(
                          "min-h-0 min-w-0 overflow-hidden rounded-none bg-transparent",
                          slotIndex === 1 ? "col-start-1 row-start-1" : "col-start-1 row-start-2",
                        )}
                      >
                        <ModuleImageWithCrop
                          src={slots[slotIndex]}
                          disabled={disabled}
                          className="h-full"
                          imgClassName="h-full w-full object-cover"
                          onCrop={onCrop ? () => onCrop(slots[slotIndex], slotIndex) : undefined}
                          onReplace={onUpload ? (file) => onUpload(file, slotIndex) : undefined}
                        />
                      </div>
                    ) : (
                      <div
                        key={slotIndex}
                        className={cn(
                          slotIndex === 1 ? "col-start-1 row-start-1" : "col-start-1 row-start-2",
                          "min-h-0 min-w-0",
                        )}
                      >
                        <EmptyImageTile
                          disabled={disabled}
                          uploading={uploading}
                          onPick={(file) => onUpload?.(file, slotIndex)}
                          className="!aspect-auto h-full min-h-0"
                        />
                      </div>
                    ),
                  )}
                  <div className="col-start-2 row-span-2 row-start-1 min-h-0 min-w-0">
                    {slots[0]?.trim() ? (
                      <div className="h-full min-w-0 overflow-hidden rounded-none bg-transparent">
                        <ModuleImageWithCrop
                          src={slots[0]}
                          disabled={disabled}
                          className="h-full"
                          imgClassName="h-full w-full object-cover"
                          onCrop={onCrop ? () => onCrop(slots[0], 0) : undefined}
                          onReplace={onUpload ? (file) => onUpload(file, 0) : undefined}
                        />
                      </div>
                    ) : (
                      <EmptyImageTile
                        disabled={disabled}
                        uploading={uploading}
                        onPick={(file) => onUpload?.(file, 0)}
                        className="!aspect-auto h-full min-h-0"
                      />
                    )}
                  </div>
                </>
              )}
            </div>
          ) : (
            <div
              className={cn(
                "grid w-full min-w-0 gap-2",
                multiRow
                  ? rowColumns === 4
                    ? "grid-cols-4"
                    : rowColumns === 3
                      ? "grid-cols-3"
                      : "grid-cols-2"
                  : multi
                    ? "grid-cols-2"
                    : "grid-cols-1",
                !multiRow && block.mediaLayout === "grid" && slotCount >= 4 && "sm:grid-cols-2",
              )}
            >
              {slots.map((url, slotIndex) =>
                url.trim() ? (
                  <div
                    key={slotIndex}
                    className={cn(
                      "min-w-0 overflow-hidden rounded-none bg-transparent",
                      block.mediaLayout === "grid" && "aspect-square",
                    )}
                  >
                    <ModuleImageWithCrop
                      src={url}
                      disabled={disabled}
                      onCrop={onCrop ? () => onCrop(url, multi ? slotIndex : undefined) : undefined}
                      onReplace={
                        onUpload
                          ? (file) => onUpload(file, multi ? slotIndex : undefined)
                          : undefined
                      }
                      className={block.mediaLayout === "grid" ? "h-full" : undefined}
                      imgClassName={
                        block.mediaLayout === "grid"
                          ? "h-full w-full object-contain"
                          : "w-full object-contain"
                      }
                    />
                  </div>
                ) : (
                  <EmptyImageTile
                    key={slotIndex}
                    disabled={disabled}
                    uploading={uploading}
                    onPick={(file) => onUpload?.(file, multi ? slotIndex : undefined)}
                  />
                ),
              )}
            </div>
          )
        ) : null}

        {block.type === "video" ? (
          block.url?.trim() ? (
            <ModuleVideoWithReplace
              src={block.url}
              disabled={disabled}
              uploading={uploading}
              onReplace={onUpload}
            />
          ) : (
            <button
              type="button"
              disabled={disabled || uploading}
              className="flex min-h-[160px] w-full flex-col items-center justify-center gap-2 rounded-none bg-muted/70 hover:bg-muted"
              onClick={(e) => {
                e.stopPropagation();
                const input = e.currentTarget.querySelector("input");
                input?.click();
              }}
            >
              {uploading ? <Loader2 className="h-7 w-7 animate-spin" /> : <Film className="h-8 w-8 text-muted-foreground/50" />}
              <span className="text-xs text-muted-foreground">อัปโหลดวิดีโอ</span>
              <input
                type="file"
                accept="video/mp4,video/webm,video/quicktime"
                className="sr-only"
                disabled={disabled || uploading}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onUpload?.(file);
                  e.target.value = "";
                }}
              />
            </button>
          )
        ) : null}

        {isTextBlockType(block.type) && block.type !== "body" ? (
          <ProjectRichTextField
            value={block.heading ?? ""}
            onChange={(heading) => onPatch({ heading })}
            placeholder="พิมพ์หัวข้อ..."
            maxLength={PROJECT_BLOCK_HEADING_MAX}
            disabled={disabled}
            variant="heading"
            minHeightClass="min-h-[42px]"
            className={cn("mb-2", block.type === "heading" && "[&_[role=textbox]]:text-center")}
          />
        ) : null}

        {isTextBlockType(block.type) && block.type !== "heading" ? (
          <ProjectRichTextField
            value={block.body ?? ""}
            onChange={(body) => onPatch({ body })}
            placeholder="เล่าที่มา แนวคิด กระบวนการ หรือผลลัพธ์..."
            maxLength={PROJECT_BLOCK_BODY_MAX}
            disabled={disabled}
            minHeightClass={block.type === "body" ? "min-h-[120px]" : "min-h-[96px]"}
          />
        ) : null}
      </div>

      <BlockSideRail
        disabled={disabled}
        isFirst={index === 0}
        isLast={index === total - 1}
        visible={showRail}
        canDuplicate={canDuplicate}
        dragAttributes={attributes as unknown as Record<string, unknown>}
        dragListeners={listeners as unknown as Record<string, unknown>}
        onMoveUp={() => onMove(-1)}
        onMoveDown={() => onMove(1)}
        onDuplicate={onDuplicate}
        onRemove={onRemove}
      />
      </div>

      {insertHint ? <InsertDropZone active={insertHint === "after"} /> : null}
    </div>
  );
}

export function ProjectCanvasEditor({
  blocks,
  onChange,
  disabled,
  emptyHint = "หรือลากไฟล์มาวาง / ลากโมดูลจากแถบเครื่องมือ",
  onEmptyDropImages,
  onStartFromTemplate,
  onStartFromImage,
  onStartFromHeading,
  onPlaceTool,
  onUploadToBlock,
  onUploadManyToBlock,
  onCropImage,
  uploadingBlockId,
  uploading,
  selectedBlockId,
  onSelectedBlockIdChange,
}: Props) {
  const [toolDragOver, setToolDragOver] = useState(false);
  const [insertHint, setInsertHint] = useState<InsertHint | null>(null);
  const [internalSelectedId, setInternalSelectedId] = useState<string | null>(null);
  const selectedId = selectedBlockId !== undefined ? selectedBlockId : internalSelectedId;
  const setSelectedId = (id: string | null) => {
    if (selectedBlockId === undefined) setInternalSelectedId(id);
    onSelectedBlockIdChange?.(id);
  };
  const prevBlockIdsRef = useRef<string[]>(blocks.map((b) => b.id));
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  useEffect(() => {
    const prev = new Set(prevBlockIdsRef.current);
    const added = blocks.find((b) => !prev.has(b.id));
    prevBlockIdsRef.current = blocks.map((b) => b.id);
    if (added) setSelectedId(added.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to block id set changes
  }, [blocks]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = blocks.findIndex((b) => b.id === active.id);
    const newIndex = blocks.findIndex((b) => b.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    onChange(arrayMove(blocks, oldIndex, newIndex));
  };

  const patchBlock = (id: string, patch: Partial<ProjectContentBlock>) => {
    onChange(blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  };

  const removeBlock = (id: string) => {
    onChange(blocks.filter((b) => b.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const moveBlock = (id: string, dir: -1 | 1) => {
    const index = blocks.findIndex((b) => b.id === id);
    if (index < 0) return;
    const next = index + dir;
    if (next < 0 || next >= blocks.length) return;
    onChange(arrayMove(blocks, index, next));
  };

  const duplicateBlock = (id: string) => {
    if (blocks.length >= PROJECT_CONTENT_BLOCKS_MAX) return;
    const index = blocks.findIndex((b) => b.id === id);
    if (index < 0) return;
    const source = blocks[index];
    if (!source) return;
    const clone = duplicateContentBlock(source);
    const next = [...blocks];
    next.splice(index + 1, 0, clone);
    onChange(next.slice(0, PROJECT_CONTENT_BLOCKS_MAX));
    setSelectedId(clone.id);
  };

  const clearInsertHint = () => setInsertHint(null);

  const placeAtHint = (tool: CanvasToolPayload, hint: InsertHint | null) => {
    if (!onPlaceTool) return;
    if (!hint) {
      onPlaceTool(tool);
      return;
    }
    const index = blocks.findIndex((b) => b.id === hint.blockId);
    if (index < 0) {
      onPlaceTool(tool);
      return;
    }
    onPlaceTool(tool, hint.edge === "before" ? index : index + 1);
  };

  const handleCanvasDragOver = (e: DragEvent) => {
    if (disabled) return;
    if (isToolDrag(e.dataTransfer) || (onEmptyDropImages && e.dataTransfer.types.includes("Files"))) {
      e.preventDefault();
      setToolDragOver(true);
    }
  };

  if (blocks.length === 0) {
    const hasStarterActions = Boolean(onStartFromTemplate || onStartFromImage || onStartFromHeading);
    return (
      <div
        className={cn(
          "flex min-h-[260px] flex-col items-center justify-center gap-4 rounded-2xl border border-dashed px-5 py-8 text-center transition-colors",
          toolDragOver ? "border-primary bg-primary/5" : "border-border/80 bg-muted/20",
          !disabled && "hover:border-primary/40 hover:bg-muted/30",
          disabled && "pointer-events-none opacity-60",
        )}
        onDragOver={handleCanvasDragOver}
        onDragLeave={() => setToolDragOver(false)}
        onDrop={(e) => {
          if (disabled) return;
          e.preventDefault();
          setToolDragOver(false);
          const tool = readCanvasToolDragData(e.dataTransfer);
          if (tool && onPlaceTool) {
            onPlaceTool(tool);
            return;
          }
          if (onEmptyDropImages && e.dataTransfer.files?.length) onEmptyDropImages(e.dataTransfer.files);
        }}
      >
        <div className="rounded-2xl bg-primary/10 p-3 text-primary">
          {uploading ? <Loader2 className="h-6 w-6 animate-spin" /> : <ImagePlus className="h-6 w-6" />}
        </div>
        <div className="max-w-md space-y-1">
          <p className="text-sm font-medium text-foreground">เริ่มลงผลงาน</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            เลือกทางที่ถนัด — แก้โครงทีหลังได้
          </p>
        </div>

        {hasStarterActions ? (
          <div className="grid w-full max-w-md grid-cols-1 gap-2 sm:grid-cols-3">
            {onStartFromTemplate ? (
              <button
                type="button"
                disabled={disabled}
                onClick={onStartFromTemplate}
                className={cn(
                  "flex flex-col items-center gap-1.5 rounded-xl border border-border/70 bg-card/80 px-3 py-3 text-center transition-colors",
                  "hover:border-primary/40 hover:bg-primary/5",
                )}
              >
                <LayoutTemplate className="h-4 w-4 text-primary" aria-hidden />
                <span className="text-[11px] font-semibold text-foreground">ใช้เทมเพลต</span>
              </button>
            ) : null}
            {onStartFromImage ? (
              <button
                type="button"
                disabled={disabled}
                onClick={onStartFromImage}
                className={cn(
                  "flex flex-col items-center gap-1.5 rounded-xl border border-border/70 bg-card/80 px-3 py-3 text-center transition-colors",
                  "hover:border-primary/40 hover:bg-primary/5",
                )}
              >
                <ImageIcon className="h-4 w-4 text-primary" aria-hidden />
                <span className="text-[11px] font-semibold text-foreground">เริ่มจากภาพ</span>
              </button>
            ) : null}
            {onStartFromHeading ? (
              <button
                type="button"
                disabled={disabled}
                onClick={onStartFromHeading}
                className={cn(
                  "flex flex-col items-center gap-1.5 rounded-xl border border-border/70 bg-card/80 px-3 py-3 text-center transition-colors",
                  "hover:border-primary/40 hover:bg-primary/5",
                )}
              >
                <Type className="h-4 w-4 text-primary" aria-hidden />
                <span className="text-[11px] font-semibold text-foreground">เริ่มจากหัวข้อ</span>
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div
      onDragOver={(e) => {
        if (disabled) return;
        if (isToolDrag(e.dataTransfer) || (onEmptyDropImages && e.dataTransfer.types.includes("Files"))) {
          e.preventDefault();
          setToolDragOver(true);
        }
      }}
      onDragLeave={(e) => {
        const related = e.relatedTarget as Node | null;
        if (related && e.currentTarget.contains(related)) return;
        setToolDragOver(false);
        clearInsertHint();
      }}
      onDrop={(e) => {
        if (disabled) return;
        if (!isToolDrag(e.dataTransfer) && !(onEmptyDropImages && e.dataTransfer.files?.length)) return;
        e.preventDefault();
        setToolDragOver(false);
        const tool = readCanvasToolDragData(e.dataTransfer);
        if (tool) {
          placeAtHint(tool, insertHint);
          clearInsertHint();
          return;
        }
        clearInsertHint();
        if (onEmptyDropImages && e.dataTransfer.files?.length) onEmptyDropImages(e.dataTransfer.files);
      }}
      onClick={() => setSelectedId(null)}
      className={cn(
        "rounded-2xl transition-[box-shadow]",
        toolDragOver && !insertHint && "ring-2 ring-primary/20 ring-offset-2 ring-offset-background",
      )}
    >
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col">
            {blocks.map((block, index) => (
              <Fragment key={block.id}>
                <SortableCanvasBlock
                  block={block}
                  index={index}
                  total={blocks.length}
                  disabled={disabled}
                  uploading={uploadingBlockId === block.id}
                  selected={selectedId === block.id}
                  insertHint={insertHint?.blockId === block.id ? insertHint.edge : null}
                  onSelect={() => setSelectedId(block.id)}
                  onPatch={(patch) => patchBlock(block.id, patch)}
                  onRemove={() => removeBlock(block.id)}
                  onMove={(dir) => moveBlock(block.id, dir)}
                  canDuplicate={blocks.length < PROJECT_CONTENT_BLOCKS_MAX}
                  onDuplicate={() => duplicateBlock(block.id)}
                  onUpload={
                    (isMediaBlockType(block.type) || isImageTextBlockType(block.type)) && onUploadToBlock
                      ? (file, slotIndex) => onUploadToBlock(block.id, file, slotIndex)
                      : undefined
                  }
                  onUploadMany={
                    block.type === "image" && block.mediaLayout === "gallery" && onUploadManyToBlock
                      ? (files) => onUploadManyToBlock(block.id, files)
                      : undefined
                  }
                  onCrop={
                    (block.type === "image" || isImageTextBlockType(block.type)) && onCropImage
                      ? (imageUrl, slotIndex) => onCropImage(block.id, imageUrl, slotIndex)
                      : undefined
                  }
                  onToolDragOver={(e, el) => {
                    setInsertHint({ blockId: block.id, edge: edgeFromPointer(e, el) });
                    setToolDragOver(true);
                  }}
                  onToolDragLeave={clearInsertHint}
                  onToolDrop={(e, el) => {
                    const tool = readCanvasToolDragData(e.dataTransfer);
                    const edge = edgeFromPointer(e, el);
                    clearInsertHint();
                    setToolDragOver(false);
                    if (!tool) return;
                    placeAtHint(tool, { blockId: block.id, edge });
                  }}
                />
                {index < blocks.length - 1 ? (
                  <BlockGapToggle
                    value={parseBlockGapAfter(block.gapAfter)}
                    disabled={disabled}
                    onChange={(gapAfter) =>
                      patchBlock(block.id, {
                        gapAfter: gapAfter === "tight" ? "tight" : "spaced",
                      })
                    }
                  />
                ) : null}
              </Fragment>
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
