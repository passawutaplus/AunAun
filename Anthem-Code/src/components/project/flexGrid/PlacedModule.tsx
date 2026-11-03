import {
  ArrowDown,
  ArrowDownRight,
  ArrowUp,
  Box,
  ChevronsDown,
  ChevronsUp,
  Copy,
  Crop,
  FileImage,
  Film,
  Image as ImageIcon,
  ImagePlus,
  Move,
  Loader2,
  RefreshCw,
  Crosshair,
  Trash2,
  Lock,
  LockOpen,
  Check,
  X,
} from "lucide-react";
import { lazy, Suspense, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import {
  FLEX_GRID_MODULE_DEFAULTS,
  snapHeight,
  snapWidth,
  snapX,
  snapY,
  type FlexGridBoard,
  type FlexGridLayout,
  type FlexGridModule,
} from "@/lib/flexGridLayout";
import { LoadPercentBar } from "@/components/project/LoadPercentBar";
import { FlexGridInlineCrop, type FlexGridInlineCropHandle, type FlexGridInlineCropResult } from "@/components/project/FlexGridInlineCrop";
import { isVideoUrl } from "@/lib/videoAccept";
import { cn } from "@/lib/utils";
import { isFileDrag } from "@/components/project/flexGrid/moduleFiles";
import { boardCtx } from "@/components/project/flexGrid/flexGridEditorUtils";
import { ArrangeBtn } from "@/components/project/flexGrid/FlexGridButtons";
import { FlexTextFormatToolbar, TextModuleBodyHandle, TextModuleBody } from "@/components/project/flexGrid/FlexTextModule";

/** A single module on a Full Grid board: drag/resize, media upload/crop, text editing. */
export const Model3dViewer = lazy(() => import("@/components/project/Model3dViewer"));

export function ModuleUploadingOverlay({
  className,
  label = "กำลังอัปโหลด",
  percent,
}: {
  className?: string;
  label?: string;
  percent?: number | null;
}) {
  return (
    <div
      className={cn(
        "absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 bg-background/50 px-4",
        className,
      )}
    >
      <Loader2 className="h-7 w-7 animate-spin text-primary" aria-hidden />
      <p className="max-w-[160px] text-center text-[11px] font-medium text-foreground">{label}</p>
      {typeof percent === "number" ? (
        <div className="h-1 w-20 overflow-hidden rounded-full bg-muted" aria-hidden>
          <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(0, Math.min(100, Math.round(percent)))}%` }} />
        </div>
      ) : null}
    </div>
  );
}

export function PlacedModule({
  module,
  board,
  layout,
  selected,
  inSelection,
  disabled,
  snapEnabled,
  uploading,
  uploadStageLabel,
  uploadStagePercent,
  onSelect,
  onChange,
  onHistoryBegin,
  onHistoryEnd,
  onDelete,
  onArrange,
  onCopy,
  onUploadClick,
  onSetPosterClick,
  onUploadFile,
  cropping,
  onBeginCrop,
  onConfirmInlineCrop,
  onRestoreOriginal,
  onCancelInlineCrop,
  inlineCropSaving,
}: {
  module: FlexGridModule;
  board: FlexGridBoard;
  layout: FlexGridLayout;
  selected: boolean;
  inSelection: boolean;
  disabled?: boolean;
  snapEnabled: boolean;
  uploading?: boolean;
  uploadStageLabel?: string | null;
  uploadStagePercent?: number | null;
  onSelect: (additive?: boolean) => void;
  onChange: (patch: Partial<FlexGridModule>, live?: boolean) => void;
  onHistoryBegin: () => void;
  onHistoryEnd: () => void;
  onDelete: () => void;
  onArrange: (act: "front" | "forward" | "backward" | "back") => void;
  onCopy: () => void;
  onUploadClick: () => void;
  onSetPosterClick?: () => void;
  onUploadFile?: (files: FileList) => void;
  cropping?: boolean;
  onBeginCrop?: () => void;
  onConfirmInlineCrop?: (result: FlexGridInlineCropResult) => void;
  onRestoreOriginal?: () => void;
  onCancelInlineCrop?: () => void;
  inlineCropSaving?: boolean;
}) {
  const ctx = boardCtx(layout, board);
  const textEditorRef = useRef<TextModuleBodyHandle>(null);
  const inlineCropRef = useRef<FlexGridInlineCropHandle>(null);
  const skipClickSelectRef = useRef(false);
  const locked = !!module.locked;
  const [fileDragOver, setFileDragOver] = useState(false);
  const acceptsFileDrop =
    !!onUploadFile &&
    !disabled &&
    !locked &&
    !uploading &&
    !cropping &&
    (module.type === "image" ||
      module.type === "gif" ||
      module.type === "video" ||
      module.type === "model3d");

  const onMovePointerDown = (e: ReactPointerEvent) => {
    if (disabled || locked || cropping) return;
    const el = e.target as HTMLElement;
    if (el.closest("[contenteditable], input, textarea")) return;
    if (el.closest("button") && !el.closest("[data-flex-move-handle]")) return;
    e.preventDefault();
    e.stopPropagation();
    const additive = e.ctrlKey || e.metaKey;
    onSelect(additive);
    // pointerdown + click would toggle additive selection twice — swallow the follow-up click
    skipClickSelectRef.current = true;
    // Ctrl/Cmd+click = multi-select only, do not start a drag
    if (additive) return;
    onHistoryBegin();
    const startX = e.clientX;
    const startY = e.clientY;
    const originX = module.x;
    const originY = module.y;

    const onMove = (ev: PointerEvent) => {
      let nl = originX + (ev.clientX - startX);
      let nt = originY + (ev.clientY - startY);
      nl = Math.max(0, Math.min(layout.canvasWidth - module.w, nl));
      nt = Math.max(0, Math.min(board.height - module.h, nt));
      onChange({ x: nl, y: nt }, true);
    };
    const onUp = (ev: PointerEvent) => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
      let nl = originX + (ev.clientX - startX);
      let nt = originY + (ev.clientY - startY);
      nl = Math.max(0, Math.min(layout.canvasWidth - module.w, nl));
      nt = Math.max(0, Math.min(board.height - module.h, nt));
      if (snapEnabled) {
        const x = snapX(ctx, nl);
        const w = snapWidth(ctx, module.w, x);
        const y = snapY(ctx, nt);
        const h = snapHeight(ctx, module.h, y);
        onChange({ x, y, w, h }, true);
      } else {
        onChange({ x: nl, y: nt }, true);
      }
      onHistoryEnd();
    };
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
  };

  const onResizePointerDown = (e: ReactPointerEvent) => {
    if (disabled || locked || cropping) return;
    e.preventDefault();
    e.stopPropagation();
    onSelect();
    onHistoryBegin();
    const startX = e.clientX;
    const startY = e.clientY;
    const originW = module.w;
    const originH = module.h;
    const left = module.x;
    const top = module.y;
    // Image / GIF / video keep the frame aspect so resize doesn't squash the media.
    const lockAspect =
      module.type === "image" || module.type === "gif" || module.type === "video";
    const aspect = originW / Math.max(1, originH);
    const maxW = layout.canvasWidth - left;
    const maxH = board.height - top;

    const sizeFromPointer = (clientX: number, clientY: number) => {
      const dx = clientX - startX;
      const dy = clientY - startY;
      if (!lockAspect) {
        return {
          w: Math.max(40, Math.min(maxW, originW + dx)),
          h: Math.max(20, Math.min(maxH, originH + dy)),
        };
      }
      const scaleFromX = (originW + dx) / Math.max(1, originW);
      const scaleFromY = (originH + dy) / Math.max(1, originH);
      const scale = Math.abs(dx) >= Math.abs(dy) ? scaleFromX : scaleFromY;
      let w = originW * scale;
      let h = w / aspect;
      if (w > maxW) {
        w = maxW;
        h = w / aspect;
      }
      if (h > maxH) {
        h = maxH;
        w = h * aspect;
      }
      if (w < 40) {
        w = 40;
        h = w / aspect;
      }
      if (h < 20) {
        h = 20;
        w = h * aspect;
      }
      if (w > maxW) {
        w = maxW;
        h = w / aspect;
      }
      if (h > maxH) {
        h = maxH;
        w = h * aspect;
      }
      return { w: Math.round(w), h: Math.round(h) };
    };

    const commitSize = (clientX: number, clientY: number, snap: boolean) => {
      let { w, h } = sizeFromPointer(clientX, clientY);
      if (snap && snapEnabled) {
        if (lockAspect) {
          w = snapWidth(ctx, w, left);
          h = Math.round(w / aspect);
          if (h > maxH) {
            h = snapHeight(ctx, maxH, top);
            w = Math.round(h * aspect);
            w = Math.min(maxW, Math.max(40, w));
          }
          h = Math.min(maxH, Math.max(20, h));
        } else {
          w = snapWidth(ctx, w, left);
          h = snapHeight(ctx, h, top);
        }
      }
      onChange({ w, h }, true);
    };

    const onMove = (ev: PointerEvent) => {
      commitSize(ev.clientX, ev.clientY, false);
    };
    const onUp = (ev: PointerEvent) => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
      commitSize(ev.clientX, ev.clientY, true);
      onHistoryEnd();
    };
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
  };

  return (
    <div
      className="group absolute"
      style={{
        left: module.x,
        top: module.y,
        width: module.w,
        height: module.h,
        zIndex:
          cropping || fileDragOver || selected || inSelection
            ? Math.max(module.z, 50_000)
            : module.z,
      }}
      onClick={(e) => {
        e.stopPropagation();
        if (cropping) return;
        if (skipClickSelectRef.current) {
          skipClickSelectRef.current = false;
          return;
        }
        onSelect(e.ctrlKey || e.metaKey);
      }}
      onDragOver={(e) => {
        if (!acceptsFileDrop || !isFileDrag(e.dataTransfer)) return;
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = "copy";
        setFileDragOver(true);
      }}
      onDragLeave={(e) => {
        if (!acceptsFileDrop) return;
        const next = e.relatedTarget as Node | null;
        if (next && e.currentTarget.contains(next)) return;
        setFileDragOver(false);
      }}
      onDrop={(e) => {
        if (!acceptsFileDrop || !isFileDrag(e.dataTransfer)) return;
        e.preventDefault();
        e.stopPropagation();
        setFileDragOver(false);
        if (e.dataTransfer.files?.length) onUploadFile?.(e.dataTransfer.files);
      }}
      onPointerDown={(e) => {
        // Ctrl/Cmd+click anywhere on the module (incl. text) for multi-select
        if (disabled || cropping) return;
        if (!(e.ctrlKey || e.metaKey)) return;
        const el = e.target as HTMLElement;
        if (el.closest("button") && !el.closest("[data-flex-move-handle]")) return;
        e.preventDefault();
        e.stopPropagation();
        onSelect(true);
        skipClickSelectRef.current = true;
      }}
    >
      {!cropping ? (
      <div
        className={cn(
          "absolute bottom-full left-0 right-0 z-20 mb-1 flex flex-col items-stretch gap-0.5",
          "opacity-0 transition-opacity group-hover:opacity-100",
          (selected || inSelection) && "opacity-100",
        )}
      >
        {module.type === "text" && !disabled ? (
          <FlexTextFormatToolbar
            className="pointer-events-auto w-max max-w-none self-center"
            onCommand={(cmd) => textEditorRef.current?.applyCommand(cmd)}
          />
        ) : null}
        <div className="pointer-events-auto flex min-w-0 items-center gap-1">
        <button
          type="button"
          data-flex-move-handle={locked ? undefined : true}
          className={cn(
            "min-w-0 flex-1 truncate text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground",
            !locked && "cursor-grab active:cursor-grabbing",
          )}
          onPointerDown={locked ? undefined : onMovePointerDown}
          title={locked ? "โมดูลถูกล็อก" : "ลากเพื่อย้าย"}
        >
            {module.name?.trim() || FLEX_GRID_MODULE_DEFAULTS[module.type].label}
          </button>
          {!disabled ? (
            <>
              {locked ? (
                <span
                  className="shrink-0 rounded p-0.5 text-primary"
                  title="โมดูลถูกล็อก"
                  aria-label="ล็อก"
                >
                  <Lock className="h-3.5 w-3.5" strokeWidth={2} />
                </span>
              ) : (
                <button
                  type="button"
                  data-flex-move-handle
                  title="ลากเพื่อย้ายโมดูล"
                  aria-label="ลากเพื่อย้ายโมดูล"
                  className="shrink-0 cursor-grab rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground active:cursor-grabbing"
                  onPointerDown={onMovePointerDown}
                  onClick={(e) => e.stopPropagation()}
                >
                  <Move className="h-3.5 w-3.5" strokeWidth={2} />
                </button>
              )}
            </>
          ) : null}
        </div>
      </div>
      ) : null}

      <div
        className={cn(
          "relative h-full w-full",
          // Allow crop chrome (aspect / zoom) to sit outside the frame.
          cropping ? "overflow-visible" : "overflow-hidden",
          module.type === "text"
            ? selected || inSelection
              ? "border border-primary bg-card shadow-sm ring-2 ring-primary/30"
              : "border border-transparent bg-transparent shadow-none"
            : module.type === "model3d"
              ? cn(
                  "border bg-transparent shadow-none",
                  selected || inSelection
                    ? "border-primary ring-2 ring-primary/30"
                    : "border-transparent",
                )
              : cn(
                  "border bg-card shadow-sm",
                  selected || inSelection || cropping
                    ? "border-primary ring-2 ring-primary/30"
                    : "border-border/80",
                ),
          fileDragOver && "border-primary ring-2 ring-primary bg-primary/5",
        )}
      >
        <div
          className={cn(
            "relative h-full w-full",
            cropping ? "overflow-visible" : "overflow-hidden",
          )}
        >
          {module.type === "image" ? (
            module.url ? (
              cropping && onConfirmInlineCrop && onCancelInlineCrop ? (
                <FlexGridInlineCrop
                  ref={inlineCropRef}
                  imageUrl={module.url}
                  originalImageUrl={module.originalUrl || module.url}
                  onConfirm={onConfirmInlineCrop}
                  onRestoreOriginal={onRestoreOriginal}
                  onCancel={onCancelInlineCrop}
                  saving={inlineCropSaving}
                />
              ) : (
              <div
                className={cn(
                  "relative h-full w-full",
                  !locked && !disabled && "cursor-grab active:cursor-grabbing",
                )}
                data-flex-move-handle={locked || disabled ? undefined : true}
                onPointerDown={locked || disabled ? undefined : onMovePointerDown}
              >
                <img loading="lazy" decoding="async"
                  src={module.url}
                  alt=""
                  className="pointer-events-none h-full w-full object-cover"
                  draggable={false}
                />
                {uploading ? (
                  <ModuleUploadingOverlay
                    label={uploadStageLabel ?? "กำลังอัปโหลดภาพ"}
                    percent={uploadStagePercent}
                  />
                ) : null}
                {!disabled ? (
                  <div
                    className={cn(
                      "absolute left-1 top-1 z-10 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100",
                      selected && "opacity-100",
                    )}
                  >
                    <button
                      type="button"
                      title="เปลี่ยนภาพ"
                      aria-label="เปลี่ยนภาพ"
                      className="flex h-7 w-7 items-center justify-center rounded-md border border-border/70 bg-card/95 text-foreground shadow-sm"
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        onUploadClick();
                      }}
                    >
                      <ImagePlus className="h-3.5 w-3.5" strokeWidth={2} />
                    </button>
                    {onBeginCrop ? (
                      <button
                        type="button"
                        title="ครอบภาพ"
                        aria-label="ครอบภาพ"
                        className="flex h-7 w-7 items-center justify-center rounded-md border border-border/70 bg-card/95 text-foreground shadow-sm"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          onBeginCrop();
                        }}
                      >
                        <Crop className="h-3.5 w-3.5" strokeWidth={2} />
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>
              )
            ) : (
              <div
                className={cn(
                  "relative flex h-full w-full items-center justify-center bg-muted/40",
                  !locked && !disabled && "cursor-grab active:cursor-grabbing",
                )}
                data-flex-move-handle={locked || disabled ? undefined : true}
                onPointerDown={locked || disabled ? undefined : onMovePointerDown}
              >
                {uploading ? (
                  <ModuleUploadingOverlay
                    label={uploadStageLabel ?? "กำลังอัปโหลดภาพ"}
                    percent={uploadStagePercent}
                  />
                ) : (
                  <button
                    type="button"
                    title="เลือกภาพ"
                    className="flex flex-col items-center justify-center gap-1 rounded-md px-3 py-2 text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      onUploadClick();
                    }}
                  >
                    <ImageIcon className="h-6 w-6" strokeWidth={1.4} />
                    <span className="text-[10px]">เลือกภาพ</span>
                  </button>
                )}
              </div>
            )
          ) : null}

          {module.type === "gif" ? (
            module.url ? (
              <div
                className={cn(
                  "relative h-full w-full",
                  !locked && !disabled && "cursor-grab active:cursor-grabbing",
                )}
                data-flex-move-handle={locked || disabled ? undefined : true}
                onPointerDown={locked || disabled ? undefined : onMovePointerDown}
              >
                {isVideoUrl(module.url) ? (
                  <video
                    src={module.url}
                    className="pointer-events-none h-full w-full object-cover"
                    autoPlay
                    loop
                    muted
                    playsInline
                    preload="metadata"
                  />
                ) : (
                  <img loading="lazy" decoding="async"
                    src={module.url}
                    alt=""
                    className="pointer-events-none h-full w-full object-cover"
                    draggable={false}
                  />
                )}
                {!disabled ? (
                  <button
                    type="button"
                    title="เปลี่ยน GIF"
                    aria-label="เปลี่ยน GIF"
                    className={cn(
                      "absolute left-1 top-1 z-10 flex h-7 w-7 items-center justify-center rounded-md border border-border/70 bg-card/95 text-foreground shadow-sm",
                      "opacity-0 transition-opacity group-hover:opacity-100",
                      selected && "opacity-100",
                    )}
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      onUploadClick();
                    }}
                  >
                    <FileImage className="h-3.5 w-3.5" strokeWidth={2} />
                  </button>
                ) : null}
              </div>
            ) : (
              <div
                className={cn(
                  "relative flex h-full w-full items-center justify-center bg-muted/40",
                  !locked && !disabled && "cursor-grab active:cursor-grabbing",
                )}
                data-flex-move-handle={locked || disabled ? undefined : true}
                onPointerDown={locked || disabled ? undefined : onMovePointerDown}
              >
                {uploading ? (
                  <ModuleUploadingOverlay
                    label={uploadStageLabel ?? "กำลังอัปโหลด GIF"}
                    percent={uploadStagePercent}
                  />
                ) : (
                  <button
                    type="button"
                    title="เลือกไฟล์ GIF"
                    className="flex flex-col items-center justify-center gap-1 rounded-md px-3 py-2 text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      onUploadClick();
                    }}
                  >
                    <FileImage className="h-6 w-6" strokeWidth={1.4} />
                    <span className="text-[10px]">เลือก GIF</span>
                    <span className="text-[9px] text-muted-foreground/70">.gif</span>
                  </button>
                )}
              </div>
            )
          ) : null}

          {module.type === "video" ? (
            module.url ? (
              <div
                className={cn(
                  "relative h-full w-full bg-black",
                  !locked && !disabled && "cursor-grab active:cursor-grabbing",
                )}
                data-flex-move-handle={locked || disabled ? undefined : true}
                onPointerDown={locked || disabled ? undefined : onMovePointerDown}
              >
                {module.posterUrl ? (
                  <img loading="lazy" decoding="async"
                    src={module.posterUrl}
                    alt=""
                    className="pointer-events-none h-full w-full object-cover"
                    draggable={false}
                  />
                ) : (
                  <video
                    src={module.url}
                    poster={module.posterUrl || undefined}
                    className="pointer-events-none h-full w-full object-cover"
                    muted
                    playsInline
                    preload="metadata"
                  />
                )}
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <Film className="h-8 w-8 text-white/90 drop-shadow" strokeWidth={1.5} />
                </div>
                {!disabled ? (
                  <div
                    className={cn(
                      "absolute left-1 top-1 z-10 flex gap-1",
                      "opacity-0 transition-opacity group-hover:opacity-100",
                      selected && "opacity-100",
                    )}
                  >
                    <button
                      type="button"
                      title="เปลี่ยนวิดีโอ"
                      aria-label="เปลี่ยนวิดีโอ"
                      className="flex h-7 w-7 items-center justify-center rounded-md border border-border/70 bg-card/95 text-foreground shadow-sm"
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        onUploadClick();
                      }}
                    >
                      <Film className="h-3.5 w-3.5" strokeWidth={2} />
                    </button>
                    {onSetPosterClick ? (
                      <button
                        type="button"
                        title={module.posterUrl ? "เปลี่ยน thumbnail" : "ใส่ thumbnail"}
                        aria-label={module.posterUrl ? "เปลี่ยน thumbnail" : "ใส่ thumbnail"}
                        className="flex h-7 w-7 items-center justify-center rounded-md border border-border/70 bg-card/95 text-foreground shadow-sm"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSetPosterClick();
                        }}
                      >
                        <ImageIcon className="h-3.5 w-3.5" strokeWidth={2} />
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : (
              <div
                className={cn(
                  "relative flex h-full w-full items-center justify-center bg-muted/40",
                  !locked && !disabled && "cursor-grab active:cursor-grabbing",
                )}
                data-flex-move-handle={locked || disabled ? undefined : true}
                onPointerDown={locked || disabled ? undefined : onMovePointerDown}
              >
                {uploading ? (
                  <ModuleUploadingOverlay
                    label={uploadStageLabel ?? "กำลังอัปโหลดวิดีโอ"}
                    percent={uploadStagePercent}
                  />
                ) : (
                  <button
                    type="button"
                    title="เลือกวิดีโอ"
                    className="flex flex-col items-center justify-center gap-1 rounded-md px-3 py-2 text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      onUploadClick();
                    }}
                  >
                    <Film className="h-6 w-6" strokeWidth={1.4} />
                    <span className="text-[10px]">เลือกวิดีโอ</span>
                  </button>
                )}
              </div>
            )
          ) : null}

          {module.type === "model3d" ? (
            module.url && module.format ? (
              <div
                className={cn(
                  "relative h-full w-full",
                  !locked && !disabled && "cursor-grab active:cursor-grabbing",
                )}
                data-flex-move-handle={locked || disabled ? undefined : true}
                onPointerDown={locked || disabled ? undefined : onMovePointerDown}
              >
                {/* Orbit on mesh; empty frame area passes through for module drag. */}
                <div className="h-full w-full">
                  <Suspense
                    fallback={
                      <div className="flex h-full w-full items-center justify-center bg-muted/40 px-4">
                        <LoadPercentBar percent={12} label="กำลังโหลดโมเดล 3D" />
                      </div>
                    }
                  >
                    <Model3dViewer
                      url={module.url}
                      format={module.format}
                      orbit={module.orbit}
                      meshOnlyOrbit
                      autoRotate={!module.viewLocked}
                      viewLocked={!!module.viewLocked}
                      onOrbitChange={(orbit) => onChange({ orbit })}
                    />
                  </Suspense>
                </div>
                {!disabled ? (
                  <button
                    type="button"
                    title="เปลี่ยนไฟล์ 3D"
                    aria-label="เปลี่ยนไฟล์ 3D"
                    className={cn(
                      "absolute left-1 top-1 z-10 flex h-7 w-7 items-center justify-center rounded-md border border-border/70 bg-card/95 text-foreground shadow-sm",
                      "opacity-0 transition-opacity group-hover:opacity-100",
                      selected && "opacity-100",
                    )}
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      onUploadClick();
                    }}
                  >
                    <RefreshCw className="h-3.5 w-3.5" strokeWidth={2} />
                  </button>
                ) : null}
              </div>
            ) : (
              <div
                className={cn(
                  "relative flex h-full w-full items-center justify-center bg-muted/40",
                  !locked && !disabled && "cursor-grab active:cursor-grabbing",
                )}
                data-flex-move-handle={locked || disabled ? undefined : true}
                onPointerDown={locked || disabled ? undefined : onMovePointerDown}
              >
                {uploading ? (
                  <ModuleUploadingOverlay
                    label={uploadStageLabel ?? "กำลังอัปโหลดไฟล์ 3D"}
                    percent={uploadStagePercent}
                  />
                ) : (
                  <button
                    type="button"
                    title="เลือกไฟล์ 3D (.stl, .obj)"
                    className="flex flex-col items-center justify-center gap-1 rounded-md px-3 py-2 text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      onUploadClick();
                    }}
                  >
                    <Box className="h-6 w-6" strokeWidth={1.4} />
                    <span className="text-[10px]">เลือกไฟล์ 3D</span>
                    <span className="text-[9px] text-muted-foreground/70">.stl · .obj</span>
                  </button>
                )}
              </div>
            )
          ) : null}

          {module.type === "text" ? (
            <TextModuleBody
              key={module.id}
              ref={textEditorRef}
              initialHtml={module.text || ""}
              editing={selected}
              disabled={disabled}
              onCommit={(html) => onChange({ text: html })}
            />
          ) : null}

          {uploading && module.url ? (
            <ModuleUploadingOverlay
              label={
                uploadStageLabel ??
                (module.type === "model3d"
                  ? "กำลังอัปโหลดไฟล์ 3D"
                  : module.type === "video"
                    ? "กำลังอัปโหลดวิดีโอ"
                    : module.type === "gif"
                      ? "กำลังอัปโหลด GIF"
                      : "กำลังอัปโหลดภาพ")
              }
              percent={uploadStagePercent}
            />
          ) : null}
        </div>

      {!disabled && !locked && !cropping ? (
        <div
          className={cn(
            "absolute bottom-0 right-0 z-30 flex h-4 w-4 cursor-se-resize items-center justify-center bg-primary text-primary-foreground opacity-0 transition-opacity group-hover:opacity-100",
            selected && "opacity-100",
          )}
          title={
            module.type === "image" || module.type === "gif" || module.type === "video"
              ? "ลากเพื่อขยาย/หด (คงสัดส่วน)"
              : "ลากเพื่อขยาย/หด"
          }
          aria-label={
            module.type === "image" || module.type === "gif" || module.type === "video"
              ? "ขยายหรือหดโมดูลโดยคงสัดส่วน"
              : "ขยายหรือหดโมดูล"
          }
          onPointerDown={onResizePointerDown}
        >
          <ArrowDownRight className="h-3 w-3" strokeWidth={2.5} />
        </div>
      ) : null}
      </div>

      {cropping ? (
        <div
          className="absolute left-1/2 top-full z-[60] mt-1 flex -translate-x-1/2 items-center gap-1 rounded-full border border-border/70 bg-card px-1.5 py-1 shadow-md opacity-100"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            disabled={inlineCropSaving}
            title="ยกเลิก"
            aria-label="ยกเลิก"
            className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-destructive disabled:opacity-50"
            onClick={() => onCancelInlineCrop?.()}
          >
            <X className="h-3.5 w-3.5" strokeWidth={2.5} />
          </button>
          <button
            type="button"
            disabled={inlineCropSaving}
            title={inlineCropSaving ? "กำลังบันทึก..." : "ใช้ภาพนี้"}
            aria-label={inlineCropSaving ? "กำลังบันทึก..." : "ใช้ภาพนี้"}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            onClick={() => void inlineCropRef.current?.confirm()}
          >
            <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
          </button>
          <button
            type="button"
            disabled={inlineCropSaving}
            title="คืนภาพเต็ม 100% ตามสัดส่วนที่อัปโหลดมา"
            className="rounded-full px-2.5 py-1 text-[11px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
            onClick={() => void inlineCropRef.current?.restoreOriginal()}
          >
            Original
          </button>
        </div>
      ) : !disabled ? (
        <div
          className={cn(
            "absolute left-1/2 top-full z-[60] mt-1 flex -translate-x-1/2 items-center gap-0.5 rounded-full border border-border/70 bg-card px-1 py-0.5 shadow-md",
            "opacity-0 transition-opacity group-hover:opacity-100",
            selected && "opacity-100",
          )}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
        >
          <ArrangeBtn title="Bring to Front" onClick={() => onArrange("front")}>
            <ChevronsUp className="h-3.5 w-3.5" />
          </ArrangeBtn>
          <ArrangeBtn title="Bring Forward" onClick={() => onArrange("forward")}>
            <ArrowUp className="h-3.5 w-3.5" />
          </ArrangeBtn>
          <ArrangeBtn title="Send Backward" onClick={() => onArrange("backward")}>
            <ArrowDown className="h-3.5 w-3.5" />
          </ArrangeBtn>
          <ArrangeBtn title="Send to Back" onClick={() => onArrange("back")}>
            <ChevronsDown className="h-3.5 w-3.5" />
          </ArrangeBtn>
          {module.type === "model3d" ? (
            <>
              <span className="mx-0.5 h-3.5 w-px shrink-0 bg-border" aria-hidden />
              <ArrangeBtn
                title={
                  module.viewLocked
                    ? "ปลดล็อกมุม — หมุนอัตโนมัติและลากเปลี่ยนมุมได้อีกครั้ง"
                    : "ล็อกมุม — หยุดหมุนอัตโนมัติ และลากเปลี่ยนมุมไม่ได้"
                }
                onClick={() => onChange({ viewLocked: !module.viewLocked })}
              >
                <Crosshair
                  className={cn("h-3.5 w-3.5", module.viewLocked && "text-primary")}
                  strokeWidth={module.viewLocked ? 2.5 : 2}
                />
              </ArrangeBtn>
            </>
          ) : null}
          <span className="mx-0.5 h-3.5 w-px shrink-0 bg-border" aria-hidden />
          <ArrangeBtn title="ก๊อปปี้โมดูล" onClick={onCopy}>
            <Copy className="h-3.5 w-3.5" />
          </ArrangeBtn>
          <ArrangeBtn
            title={locked ? "ปลดล็อกโมดูล" : "ล็อกโมดูล"}
            onClick={() => onChange({ locked: !locked })}
          >
            {locked ? (
              <Lock className="h-3.5 w-3.5 text-primary" strokeWidth={2.5} />
            ) : (
              <LockOpen className="h-3.5 w-3.5" strokeWidth={2} />
            )}
          </ArrangeBtn>
          {!locked ? (
            <ArrangeBtn title="ลบโมดูล" onClick={onDelete} danger>
              <Trash2 className="h-3.5 w-3.5" />
            </ArrangeBtn>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
