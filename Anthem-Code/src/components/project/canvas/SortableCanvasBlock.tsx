import { UploadProgressCard } from "@/components/project/UploadProgressCard";
import { useEffect, useRef, useState, type DragEvent, type TouchEventHandler } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ProjectRichTextField } from "@/components/project/ProjectRichTextField";
import {
  PROJECT_BLOCK_BODY_MAX,
  PROJECT_BLOCK_HEADING_MAX,
  blockImageUrls,
  canvasBlockLabel,
  imageModuleSlotCapacity,
  isImageTextBlockType,
  isTextBlockType,
  textVerticalAlignClass,
  type ProjectContentBlock,
} from "@/lib/projectContentBlocks";
import { getMosaicPhotoGridLayout, isMosaicPhotoGridLayout } from "@/lib/photoGridLayouts";
import { GallerySlideBlockEditor } from "@/components/project/GallerySlideBlockEditor";
import type { CanvasImageSlotRef, CanvasImageSlotTarget } from "@/lib/canvasImageSlotDnD";
import { ModuleImageWithCrop } from "@/components/project/ModuleImageWithCrop";
import { cn } from "@/lib/utils";
import { InsertEdge, isToolDrag, InsertDropZone } from "@/components/project/canvas/canvasDnd";
import { ModuleVideoWithReplace } from "@/components/project/canvas/ModuleVideoWithReplace";
import { EmptyVideoTile, EmptyImageTile } from "@/components/project/canvas/CanvasEmptyTiles";
import { BlockSideRail } from "@/components/project/canvas/BlockSideRail";

const PHONE_QUERY = "(max-width: 1023.98px)";

/** True below the editor's desktop breakpoint (Tailwind `lg`). */
function useIsPhoneLayout() {
  const [phone, setPhone] = useState(
    () => typeof window !== "undefined" && window.matchMedia(PHONE_QUERY).matches,
  );
  useEffect(() => {
    const mql = window.matchMedia(PHONE_QUERY);
    const onChange = () => setPhone(mql.matches);
    mql.addEventListener("change", onChange);
    onChange();
    return () => mql.removeEventListener("change", onChange);
  }, []);
  return phone;
}

/** One sortable block of the casual canvas editor. */
export function SortableCanvasBlock({
  block,
  index,
  total,
  disabled,
  uploading,
  selected,
  insertHint,
  canDuplicate,
  uploadStageLabel,
  uploadStagePercent,
  onCancelUpload,
  onSelect,
  onPatch,
  onRemove,
  onMove,
  onDuplicate,
  onUpload,
  onUploadMany,
  onSetPoster,
  onCrop,
  onImageSlotDrop,
  onToolDragOver,
  onToolDragLeave,
  onToolDrop,
}: {
  block: ProjectContentBlock;
  index: number;
  total: number;
  disabled?: boolean;
  uploading?: boolean;
  uploadStageLabel?: string | null;
  uploadStagePercent?: number | null;
  onCancelUpload?: () => void;
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
  onSetPoster?: (file: File) => void;
  onCrop?: (imageUrl: string, slotIndex?: number) => void;
  onImageSlotDrop?: (from: CanvasImageSlotRef, to: CanvasImageSlotTarget) => void;
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
  const phone = useIsPhoneLayout();
  // Phones: press and hold anywhere on the module to drag it (TouchSensor delay in ProjectCanvasEditor).
  const longPressListeners: { onTouchStart?: TouchEventHandler<HTMLDivElement> } =
    phone && !disabled && listeners?.onTouchStart
      ? { onTouchStart: listeners.onTouchStart as TouchEventHandler<HTMLDivElement> }
      : {};
  const isMediaOnly = block.type === "image" || block.type === "video";

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

  const slotCapacity = block.type === "image" ? imageModuleSlotCapacity(block) : 1;
  const allowMultiPick =
    !!onUploadMany &&
    block.type === "image" &&
    (isGallery || block.mediaLayout === "grid" || block.mediaLayout === "multi");
  const emptyMultiProps = allowMultiPick
    ? {
        multiple: true as const,
        maxFiles: slotCapacity,
        onPickMany: onUploadMany,
      }
    : {};

  const slotDnD = (slotIndex: number, url: string) => {
    const trimmed = url.trim();
    return {
      // Phones use long-press for module reorder, so native image-slot drag stays desktop-only.
      dragSlot: !disabled && !phone && trimmed ? { blockId: block.id, slotIndex, url: trimmed } : null,
      onSlotDrop: onImageSlotDrop
        ? (from: CanvasImageSlotRef) => onImageSlotDrop(from, { blockId: block.id, slotIndex })
        : undefined,
    };
  };

  return (
    <div
      ref={setRefs}
      style={style}
      className={cn(
        "relative flex flex-col gap-2",
        isDragging && "z-10 opacity-90",
        phone && "[-webkit-touch-callout:none]",
        phone && isMediaOnly && "select-none",
        phone && isDragging && "z-30 scale-[0.98] opacity-95 shadow-2xl",
      )}
      {...longPressListeners}
      onContextMenu={(e) => {
        // Long-press on phones must not open the image / link context menu.
        if (phone && !disabled) e.preventDefault();
      }}
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
          "absolute -left-1 top-2 z-10 hidden -translate-x-full rounded-none px-2 py-1 text-[11px] font-medium whitespace-nowrap lg:block",
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
                      {...slotDnD(0, block.url)}
                    />
                  </div>
                ) : (
                  <EmptyImageTile
                    disabled={disabled}
                    uploading={uploading}
                    onPick={(file) => onUpload?.(file)}
                    onSlotDrop={slotDnD(0, "").onSlotDrop}
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
                  minHeightClass="min-h-[38px]"
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
              onReorder={(next) => onPatch({ mediaLayout: "gallery", urls: next, url: next[0] ?? "" })}
            />
          ) : block.mediaLayout === "grid" && isMosaicPhotoGridLayout(block.gridLayout) ? (
            (() => {
              const meta = getMosaicPhotoGridLayout(block.gridLayout);
              return (
                <div
                  className="grid aspect-[3/2] w-full min-w-0 gap-2"
                  style={{
                    gridTemplateColumns: `repeat(${meta.cols}, minmax(0, 1fr))`,
                    gridTemplateRows: `repeat(${meta.rows}, minmax(0, 1fr))`,
                  }}
                >
                  {meta.cells.map((cell, slotIndex) => {
                    const url = slots[slotIndex] ?? "";
                    const cellStyle = {
                      gridColumn: `${cell.col} / span ${cell.colSpan ?? 1}`,
                      gridRow: `${cell.row} / span ${cell.rowSpan ?? 1}`,
                    } as const;
                    return (
                      <div
                        key={slotIndex}
                        className="min-h-0 min-w-0 overflow-hidden rounded-none bg-transparent"
                        style={cellStyle}
                      >
                        {url.trim() ? (
                          <ModuleImageWithCrop
                            src={url}
                            disabled={disabled}
                            className="h-full"
                            imgClassName="h-full w-full object-cover"
                            onCrop={onCrop ? () => onCrop(url, slotIndex) : undefined}
                            onReplace={onUpload ? (file) => onUpload(file, slotIndex) : undefined}
                            {...slotDnD(slotIndex, url)}
                          />
                        ) : (
                          <EmptyImageTile
                            disabled={disabled}
                            uploading={uploading}
                            onPick={(file) => onUpload?.(file, slotIndex)}
                            onSlotDrop={slotDnD(slotIndex, "").onSlotDrop}
                            className="!aspect-auto h-full min-h-0"
                            {...emptyMultiProps}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })()
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
                          {...slotDnD(0, slots[0])}
                        />
                      </div>
                    ) : (
                      <EmptyImageTile
                        disabled={disabled}
                        uploading={uploading}
                        onPick={(file) => onUpload?.(file, 0)}
                        onSlotDrop={slotDnD(0, "").onSlotDrop}
                        className="!aspect-auto h-full min-h-0"
                        {...emptyMultiProps}
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
                          {...slotDnD(slotIndex, slots[slotIndex])}
                        />
                      </div>
                    ) : (
                      <EmptyImageTile
                        key={slotIndex}
                        disabled={disabled}
                        uploading={uploading}
                        onPick={(file) => onUpload?.(file, slotIndex)}
                        onSlotDrop={slotDnD(slotIndex, "").onSlotDrop}
                        className="!aspect-auto h-full min-h-0"
                        {...emptyMultiProps}
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
                          {...slotDnD(slotIndex, slots[slotIndex])}
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
                          onSlotDrop={slotDnD(slotIndex, "").onSlotDrop}
                          className="!aspect-auto h-full min-h-0"
                          {...emptyMultiProps}
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
                          {...slotDnD(0, slots[0])}
                        />
                      </div>
                    ) : (
                      <EmptyImageTile
                        disabled={disabled}
                        uploading={uploading}
                        onPick={(file) => onUpload?.(file, 0)}
                        onSlotDrop={slotDnD(0, "").onSlotDrop}
                        className="!aspect-auto h-full min-h-0"
                        {...emptyMultiProps}
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
                      {...slotDnD(multi ? slotIndex : 0, url)}
                    />
                  </div>
                ) : (
                  <EmptyImageTile
                    key={slotIndex}
                    disabled={disabled}
                    uploading={uploading}
                    onPick={(file) => onUpload?.(file, multi ? slotIndex : undefined)}
                    onSlotDrop={slotDnD(multi ? slotIndex : 0, "").onSlotDrop}
                    {...emptyMultiProps}
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
              posterUrl={block.posterUrl}
              disabled={disabled}
              uploading={uploading}
              onReplace={onUpload}
              onSetPoster={onSetPoster}
            />
          ) : (
            <EmptyVideoTile
              disabled={disabled}
              uploading={uploading}
              onPick={onUpload}
            />
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
            minHeightClass="min-h-[38px]"
          />
        ) : null}
      </div>

      <BlockSideRail
        disabled={disabled}
        isFirst={index === 0}
        isLast={index === total - 1}
        visible={showRail}
        phoneSide={isTextBlockType(block.type) ? "right" : "left"}
        canDuplicate={canDuplicate}
        dragAttributes={attributes as unknown as Record<string, unknown>}
        dragListeners={listeners as unknown as Record<string, unknown>}
        onMoveUp={() => onMove(-1)}
        onMoveDown={() => onMove(1)}
        onDuplicate={onDuplicate}
        onRemove={onRemove}
      />

      {uploading ? (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/50 px-4">
          <UploadProgressCard
            label={uploadStageLabel}
            percent={uploadStagePercent}
            onCancel={onCancelUpload}
          />
        </div>
      ) : null}
      </div>

      {insertHint ? <InsertDropZone active={insertHint === "after"} /> : null}
    </div>
  );
}
