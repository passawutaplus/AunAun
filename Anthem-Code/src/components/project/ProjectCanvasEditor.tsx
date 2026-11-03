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
import { SortableContext, arrayMove, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Film, GalleryHorizontal, Image as ImageIcon, ImagePlus, Loader2, Type } from "lucide-react";
import { readCanvasToolDragData, type CanvasToolPayload } from "@/lib/canvasToolDrag";
import {
  duplicateContentBlock,
  blockHasLocalPreview,
  isImageTextBlockType,
  isMediaBlockType,
  parseBlockGapAfter,
  type ProjectContentBlock,
} from "@/lib/projectContentBlocks";
import {
  applyCanvasImageSlotAction,
  readCanvasImageSlotUrl,
  type CanvasImageSlotAction,
  type CanvasImageSlotRef,
  type CanvasImageSlotTarget,
} from "@/lib/canvasImageSlotDnD";
import { CanvasImageSlotDropDialog } from "@/components/project/CanvasImageSlotDropDialog";
import { cn } from "@/lib/utils";
import { MascotCharacter } from "@/components/project/TourMascot";
import { UploadProgressCard } from "@/components/project/UploadProgressCard";
import { InsertHint, isToolDrag, edgeFromPointer, BlockGapToggle } from "@/components/project/canvas/canvasDnd";
import { SortableCanvasBlock } from "@/components/project/canvas/SortableCanvasBlock";

type Props = {
  blocks: ProjectContentBlock[];
  onChange: (blocks: ProjectContentBlock[]) => void;
  disabled?: boolean;
  emptyHint?: string;
  onEmptyDropImages?: (files: FileList) => void;
  /** "upload" = Quick drop: an empty board is just an image drop zone, no template starters. */
  emptyVariant?: "starter" | "upload";
  /** Quick-pick system templates shown above the starter action buttons. */
  starterTemplates?: Array<{ id: string; name: string; recommended?: boolean }>;
  /** First-time empty canvas: pick a named starter template. */
  onPickStarterTemplate?: (templateId: string) => void;
  /** First-time empty canvas: pick image file(s) to start. */
  onStartFromImage?: () => void;
  /** First-time empty canvas: place a heading module. */
  onStartFromHeading?: () => void;
  /** First-time empty canvas: place a video module. */
  onStartFromVideo?: () => void;
  /** First-time empty canvas: place a gallery/slide module. */
  onStartFromSlide?: () => void;
  onPlaceTool?: (payload: CanvasToolPayload, insertAt?: number) => void;
  onUploadToBlock?: (blockId: string, file: File, slotIndex?: number) => void;
  onUploadManyToBlock?: (blockId: string, files: File[]) => void;
  /** Custom video thumbnail (image file) for a video block. */
  onSetVideoPoster?: (blockId: string, file: File) => void;
  onCropImage?: (blockId: string, imageUrl: string, slotIndex?: number) => void;
  uploadingBlockId?: string | null;
  uploading?: boolean;
  /** Short Thai description of the current upload/compress stage. */
  uploadStageLabel?: string | null;
  /** Real progress 0–100 when known. */
  uploadStagePercent?: number | null;
  /** Cancel in-flight upload when progress is shown. */
  onCancelUpload?: () => void;
  selectedBlockId?: string | null;
  onSelectedBlockIdChange?: (id: string | null) => void;
};

const CanvasUploadProgress = UploadProgressCard;

export function ProjectCanvasEditor({
  blocks,
  onChange,
  disabled,
  emptyHint = "หรือลากไฟล์มาวาง / ลากโมดูลจากแถบเครื่องมือ",
  onEmptyDropImages,
  emptyVariant = "starter",
  starterTemplates,
  onPickStarterTemplate,
  onStartFromImage,
  onStartFromHeading,
  onStartFromVideo,
  onStartFromSlide,
  onPlaceTool,
  onUploadToBlock,
  onUploadManyToBlock,
  onSetVideoPoster,
  onCropImage,
  uploadingBlockId,
  uploading,
  uploadStageLabel,
  uploadStagePercent,
  onCancelUpload,
  selectedBlockId,
  onSelectedBlockIdChange,
}: Props) {
  const [toolDragOver, setToolDragOver] = useState(false);
  const [insertHint, setInsertHint] = useState<InsertHint | null>(null);
  const [internalSelectedId, setInternalSelectedId] = useState<string | null>(null);
  const [pendingSlotDrop, setPendingSlotDrop] = useState<{
    from: CanvasImageSlotRef;
    to: CanvasImageSlotTarget;
  } | null>(null);
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

  const resolveImageSlotDrop = (from: CanvasImageSlotRef, to: CanvasImageSlotTarget) => {
    if (disabled) return;
    if (from.blockId === to.blockId && from.slotIndex === to.slotIndex) return;
    const targetBlock = blocks.find((b) => b.id === to.blockId);
    if (!targetBlock) return;
    const targetUrl = readCanvasImageSlotUrl(targetBlock, to.slotIndex);
    // Empty target → move immediately (swap with blank slot, no popup).
    if (!targetUrl) {
      onChange(applyCanvasImageSlotAction(blocks, from, to, "move"));
      return;
    }
    setPendingSlotDrop({ from, to });
  };

  const confirmImageSlotDrop = (mode: Extract<CanvasImageSlotAction, "swap" | "replace">) => {
    if (!pendingSlotDrop) return;
    onChange(applyCanvasImageSlotAction(blocks, pendingSlotDrop.from, pendingSlotDrop.to, mode));
    setPendingSlotDrop(null);
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
    const index = blocks.findIndex((b) => b.id === id);
    if (index < 0) return;
    const source = blocks[index];
    if (!source) return;
    const clone = duplicateContentBlock(source);
    const next = [...blocks];
    next.splice(index + 1, 0, clone);
    onChange(next);
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

  if (blocks.length === 0 && emptyVariant === "upload") {
    return (
      <label
        data-tour="drop"
        className={cn(
          "group flex min-h-[420px] cursor-pointer items-center justify-center rounded-[28px] px-4 py-10 transition-colors",
          "border border-dashed border-border bg-secondary/40",
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
        <input
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          aria-label="เลือกรูปผลงาน"
          disabled={disabled}
          onChange={(e) => {
            if (onEmptyDropImages && e.target.files?.length) onEmptyDropImages(e.target.files);
            e.target.value = "";
          }}
        />
        <div
          className={cn(
            "flex w-full max-w-md flex-col items-center gap-2 rounded-3xl border-[1.5px] border-dashed bg-background/70 px-5 py-8 text-center backdrop-blur-sm transition-colors",
            toolDragOver ? "border-foreground" : "border-border group-hover:border-foreground/40",
          )}
        >
        {uploading ? (
          <Loader2 className="h-6 w-6 animate-spin" />
        ) : (
          <MascotCharacter className="-mt-2 mb-1 h-24 w-28" />
        )}
        <span className="font-display text-xl font-normal tracking-tight text-foreground">Start Here!! Drag &amp; Drop</span>
        <span className="text-xs text-muted-foreground">อยากใส่ข้อความ วิดีโอ หรือจัดเลย์เอาต์? เลือกจากแถบด้านล่างได้เลย</span>
        {uploading ? (
          <CanvasUploadProgress label={uploadStageLabel} percent={uploadStagePercent} onCancel={onCancelUpload} />
        ) : null}
        </div>
      </label>
    );
  }

  if (blocks.length === 0) {
    const hasStarterActions = Boolean(
      onStartFromImage || onStartFromHeading || onStartFromVideo || onStartFromSlide,
    );
    const quickTemplates = (starterTemplates ?? []).slice(0, 3);
    const hasQuickTemplates = quickTemplates.length > 0 && Boolean(onPickStarterTemplate);
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
        {uploading ? (
          <CanvasUploadProgress
            label={uploadStageLabel}
            percent={uploadStagePercent}
            onCancel={onCancelUpload}
          />
        ) : null}

        {hasQuickTemplates || hasStarterActions ? (
          <div className="flex w-full max-w-lg flex-col gap-2.5">
            {hasQuickTemplates ? (
              <div className="space-y-1.5">
                <p className="text-sm font-semibold text-foreground">เริ่มจากเทมเพลต</p>
                <div className="grid grid-cols-3 gap-1.5">
                  {quickTemplates.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      disabled={disabled}
                      onClick={() => onPickStarterTemplate?.(t.id)}
                      className={cn(
                        "rounded-lg border px-2 py-2 text-center transition-colors",
                        t.recommended
                          ? "border-primary/40 bg-primary/5 hover:border-primary/55 hover:bg-primary/10"
                          : "border-border/70 bg-card/80 hover:border-primary/35 hover:bg-primary/5",
                      )}
                      aria-label={`ใช้เทมเพลต ${t.name}`}
                    >
                      <span className="block truncate text-[11px] font-semibold text-foreground leading-tight">
                        {t.name}
                      </span>
                      {t.recommended ? (
                        <span className="mt-0.5 block text-[9px] font-medium text-primary">แนะนำ</span>
                      ) : null}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
            {hasQuickTemplates && hasStarterActions ? (
              <div className="h-px w-full bg-border/80" role="separator" />
            ) : null}
            {hasStarterActions ? (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {onStartFromHeading ? (
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={onStartFromHeading}
                    className={cn(
                      "flex flex-col items-center gap-1.5 rounded-xl border border-border/70 bg-card/80 px-2.5 py-3 text-center transition-colors",
                      "hover:border-primary/40 hover:bg-primary/5",
                    )}
                  >
                    <Type className="h-4 w-4 text-primary" aria-hidden />
                    <span className="text-[11px] font-semibold text-foreground leading-tight">เริ่มจากหัวข้อ</span>
                  </button>
                ) : null}
                {onStartFromImage ? (
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={onStartFromImage}
                    className={cn(
                      "flex flex-col items-center gap-1.5 rounded-xl border border-border/70 bg-card/80 px-2.5 py-3 text-center transition-colors",
                      "hover:border-primary/40 hover:bg-primary/5",
                    )}
                  >
                    <ImageIcon className="h-4 w-4 text-primary" aria-hidden />
                    <span className="text-[11px] font-semibold text-foreground leading-tight">เริ่มจากภาพ</span>
                  </button>
                ) : null}
                {onStartFromSlide ? (
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={onStartFromSlide}
                    className={cn(
                      "flex flex-col items-center gap-1.5 rounded-xl border border-border/70 bg-card/80 px-2.5 py-3 text-center transition-colors",
                      "hover:border-primary/40 hover:bg-primary/5",
                    )}
                  >
                    <GalleryHorizontal className="h-4 w-4 text-primary" aria-hidden />
                    <span className="text-[11px] font-semibold text-foreground leading-tight">เริ่มจากสไลด์</span>
                  </button>
                ) : null}
                {onStartFromVideo ? (
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={onStartFromVideo}
                    className={cn(
                      "flex flex-col items-center gap-1.5 rounded-xl border border-border/70 bg-card/80 px-2.5 py-3 text-center transition-colors",
                      "hover:border-primary/40 hover:bg-primary/5",
                    )}
                  >
                    <Film className="h-4 w-4 text-primary" aria-hidden />
                    <span className="text-[11px] font-semibold text-foreground leading-tight">เริ่มจากวิดีโอ</span>
                  </button>
                ) : null}
              </div>
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
                  uploading={uploadingBlockId === block.id || blockHasLocalPreview(block)}
                  uploadStageLabel={uploadStageLabel}
                  uploadStagePercent={uploadStagePercent}
                  onCancelUpload={onCancelUpload}
                  selected={selectedId === block.id}
                  insertHint={insertHint?.blockId === block.id ? insertHint.edge : null}
                  onSelect={() => setSelectedId(block.id)}
                  onPatch={(patch) => patchBlock(block.id, patch)}
                  onRemove={() => removeBlock(block.id)}
                  onMove={(dir) => moveBlock(block.id, dir)}
                  canDuplicate={!disabled}
                  onDuplicate={() => duplicateBlock(block.id)}
                  onUpload={
                    (isMediaBlockType(block.type) || isImageTextBlockType(block.type)) && onUploadToBlock
                      ? (file, slotIndex) => onUploadToBlock(block.id, file, slotIndex)
                      : undefined
                  }
                  onUploadMany={
                    block.type === "image" &&
                    (block.mediaLayout === "gallery" ||
                      block.mediaLayout === "grid" ||
                      block.mediaLayout === "multi") &&
                    onUploadManyToBlock
                      ? (files) => onUploadManyToBlock(block.id, files)
                      : undefined
                  }
                  onSetPoster={
                    block.type === "video" && onSetVideoPoster
                      ? (file) => onSetVideoPoster(block.id, file)
                      : undefined
                  }
                  onCrop={
                    (block.type === "image" || isImageTextBlockType(block.type)) && onCropImage
                      ? (imageUrl, slotIndex) => onCropImage(block.id, imageUrl, slotIndex)
                      : undefined
                  }
                  onImageSlotDrop={
                    !disabled &&
                    (isImageTextBlockType(block.type) ||
                      (block.type === "image" && block.mediaLayout !== "gallery"))
                      ? resolveImageSlotDrop
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

      <CanvasImageSlotDropDialog
        open={!!pendingSlotDrop}
        onOpenChange={(open) => {
          if (!open) setPendingSlotDrop(null);
        }}
        onSwap={() => confirmImageSlotDrop("swap")}
        onReplace={() => confirmImageSlotDrop("replace")}
      />
    </div>
  );
}
