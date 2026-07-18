import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowDown,
  ArrowDownRight,
  ArrowUp,
  Bold,
  Box,
  ChevronsDown,
  ChevronsUp,
  Copy,
  Crop,
  FileImage,
  Film,
  Image as ImageIcon,
  ImagePlus,
  Italic,
  Move,
  Plus,
  RefreshCw,
  Crosshair,
  Strikethrough,
  Trash2,
  Underline,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Hand,
  Lock,
  LockOpen,
} from "lucide-react";
import { Fragment, lazy, Suspense, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState, forwardRef, type DragEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { FLEX_GRID_TOOL_MIME, activeFlexGridDragType, flexGridBoardDomId } from "@/components/project/FlexGridToolsSidebar";
import type { FlexGridLayerRef } from "@/components/project/FlexGridToolsSidebar";
import {
  FLEX_GRID_MODULE_DEFAULTS,
  boardDisplayName,
  colStart,
  colWidth,
  createEmptyFlexGridBoard,
  createFlexGridModule,
  effectiveRowUnit,
  nextZIndex,
  rowStart,
  snapHeight,
  snapWidth,
  snapX,
  snapY,
  type FlexGridBoard,
  type FlexGridLayout,
  type FlexGridModule,
  type FlexGridModuleType,
  type FlexGridSnapContext,
} from "@/lib/flexGridLayout";
import { LoadPercentBar, AutoLoadPercentBar } from "@/components/project/LoadPercentBar";
import { useAutoPercent } from "@/hooks/useAutoPercent";
import { PROJECT_VIDEO_ACCEPT, isVideoFile, isVideoUrl } from "@/lib/videoAccept";
import { PROJECT_MODEL3D_ACCEPT, isModel3dFile } from "@/lib/model3dAccept";
import { isGifFile } from "@/lib/uploadProjectGif";
import { sanitizeProjectRichText } from "@/lib/projectRichText";
import {
  applyAlign,
  applyFontFamily,
  applyFontSize,
  INLINE_BY_CMD,
  restoreSelection,
  saveSelection,
  toggleInlineFormat,
  type AlignCmd,
  type InlineCmd,
} from "@/lib/projectRichTextFormat";
import { PROJECT_TEXT_FONTS, PROJECT_TEXT_SIZES } from "@/lib/projectTextFonts";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const Model3dViewer = lazy(() => import("@/components/project/Model3dViewer"));

const PROJECT_GIF_ACCEPT = "image/gif,.gif";

type ModuleUploadKind = "image" | "gif" | "video" | "model3d";

function isFileDrag(dt: DataTransfer): boolean {
  return Array.from(dt.types).includes("Files");
}

function mediaKindFromFile(file: File): ModuleUploadKind | null {
  if (isVideoFile(file)) return "video";
  if (isModel3dFile(file)) return "model3d";
  if (isGifFile(file)) return "gif";
  if (file.type.startsWith("image/") || /\.(jpe?g|png|webp|gif|avif)$/i.test(file.name)) {
    return "image";
  }
  return null;
}

/** Best-effort type probe while dragging (files may be empty until drop). */
function mediaKindFromDataTransfer(dt: DataTransfer): ModuleUploadKind | null {
  if (dt.files?.length) return mediaKindFromFile(dt.files[0]!);
  for (const item of Array.from(dt.items ?? [])) {
    if (item.kind !== "file") continue;
    const t = item.type.toLowerCase();
    if (t.startsWith("video/")) return "video";
    if (t === "image/gif") return "gif";
    if (t.includes("stl") || t.includes("obj") || t === "model/stl" || t === "model/obj") {
      return "model3d";
    }
    if (t.startsWith("image/")) return "image";
  }
  return null;
}

function fileMatchesKind(kind: ModuleUploadKind, file: File): boolean {
  if (kind === "video") return isVideoFile(file);
  if (kind === "gif") return isGifFile(file);
  if (kind === "model3d") return isModel3dFile(file);
  if (isVideoFile(file) || isModel3dFile(file)) return false;
  return file.type.startsWith("image/") || /\.(jpe?g|png|webp|gif|avif)$/i.test(file.name);
}

function pickFileForKind(kind: ModuleUploadKind, list: FileList | null | undefined): File | null {
  if (!list?.length) return null;
  return Array.from(list).find((f) => fileMatchesKind(kind, f)) ?? null;
}

function toastWrongModuleFile(kind: ModuleUploadKind) {
  if (kind === "video") toast.error("โมดูลวิดีโอรับเฉพาะไฟล์วิดีโอ");
  else if (kind === "gif") toast.error("โมดูล GIF รับเฉพาะไฟล์ .gif");
  else if (kind === "model3d") toast.error("โมดูล 3D รับเฉพาะไฟล์ .stl และ .obj");
  else toast.error("โมดูลภาพรับเฉพาะไฟล์รูปภาพ");
}

type Props = {
  layout: FlexGridLayout;
  /** Live updates (e.g. during drag) — no history */
  onChange: (layout: FlexGridLayout) => void;
  /** Discrete edits that should enter undo history */
  onCommit: (layout: FlexGridLayout | ((prev: FlexGridLayout) => FlexGridLayout)) => void;
  onHistoryBegin: () => void;
  onHistoryEnd: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  selection: FlexGridLayerRef[];
  onSelectionChange: (refs: FlexGridLayerRef[]) => void;
  gridVisible?: boolean;
  snapEnabled?: boolean;
  zoom?: number;
  onZoomChange?: (zoom: number) => void;
  disabled?: boolean;
  uploadingModuleId?: string | null;
  /** Short Thai description of what's happening now (e.g. compressing, uploading). */
  uploadStageLabel?: string | null;
  /** Real progress 0–100 when known; omit for an indeterminate simulated ramp. */
  uploadStagePercent?: number | null;
  onUploadToModule?: (boardId: string, moduleId: string, file: File) => void;
  /** Open crop dialog for an image module (locked to module aspect). */
  onCropModule?: (boardId: string, moduleId: string, imageUrl: string) => void;
  className?: string;
};

function boardCtx(layout: FlexGridLayout, board: FlexGridBoard): FlexGridSnapContext {
  return {
    canvasWidth: layout.canvasWidth,
    canvasHeight: board.height,
    grid: layout.grid,
  };
}

function updateModule(
  layout: FlexGridLayout,
  boardId: string,
  moduleId: string,
  patch: Partial<FlexGridModule> | ((m: FlexGridModule) => FlexGridModule),
): FlexGridLayout {
  return {
    ...layout,
    boards: layout.boards.map((b) => {
      if (b.id !== boardId) return b;
      return {
        ...b,
        modules: b.modules.map((m) => {
          if (m.id !== moduleId) return m;
          return typeof patch === "function" ? patch(m) : { ...m, ...patch };
        }),
      };
    }),
  };
}

export function ProjectFlexGridEditor({
  layout,
  onChange,
  onCommit,
  onHistoryBegin,
  onHistoryEnd,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  selection,
  onSelectionChange,
  gridVisible = true,
  snapEnabled = true,
  zoom: zoomProp,
  onZoomChange,
  disabled,
  uploadingModuleId,
  uploadStageLabel,
  uploadStagePercent,
  onUploadToModule,
  onCropModule,
  className,
}: Props) {
  const selected = selection[selection.length - 1] ?? null;

  const selectModule = useCallback(
    (ref: FlexGridLayerRef | null, additive?: boolean) => {
      if (!ref) {
        onSelectionChange([]);
        return;
      }
      if (additive) {
        const exists = selection.some(
          (p) => p.boardId === ref.boardId && p.moduleId === ref.moduleId,
        );
        if (exists) {
          onSelectionChange(
            selection.filter((p) => !(p.boardId === ref.boardId && p.moduleId === ref.moduleId)),
          );
        } else {
          onSelectionChange([
            ...selection.filter((p) => p.boardId === ref.boardId),
            ref,
          ]);
        }
      } else {
        onSelectionChange([ref]);
      }
    },
    [onSelectionChange, selection],
  );
  const [internalZoom, setInternalZoom] = useState(1);
  const zoom = zoomProp ?? internalZoom;
  const setZoom = (z: number) => {
    const next = Math.min(2, Math.max(0.25, Number(z.toFixed(2))));
    if (onZoomChange) onZoomChange(next);
    else setInternalZoom(next);
  };

  const [dropGhost, setDropGhost] = useState<{
    boardId: string;
    x: number;
    y: number;
    w: number;
    h: number;
  } | null>(null);
  const [panMode, setPanMode] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const panningRef = useRef<{ lastX: number; lastY: number; pointerId: number } | null>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const preventMiddleAutoscroll = (e: MouseEvent) => {
      if (e.button === 1) e.preventDefault();
    };
    el.addEventListener("mousedown", preventMiddleAutoscroll);
    return () => el.removeEventListener("mousedown", preventMiddleAutoscroll);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (disabled) return;
      const t = e.target as HTMLElement | null;
      if (t?.closest?.("input, textarea, [contenteditable=true]")) return;
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      const key = e.key.toLowerCase();
      const code = e.code;
      if ((key === "z" || code === "KeyZ") && !e.shiftKey) {
        e.preventDefault();
        onUndo?.();
      } else if ((key === "z" || code === "KeyZ") && e.shiftKey) {
        e.preventDefault();
        onRedo?.();
      } else if (key === "y" || code === "KeyY") {
        e.preventDefault();
        onRedo?.();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [disabled, onUndo, onRedo]);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const gifInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const model3dInputRef = useRef<HTMLInputElement>(null);
  const pendingUploadRef = useRef<{
    boardId: string;
    moduleId: string;
    kind: ModuleUploadKind;
  } | null>(null);
  /** After placing a module from a file drop, upload once the new module is in `layout`. */
  const pendingFileUploadRef = useRef<{
    boardId: string;
    moduleId: string;
    file: File;
  } | null>(null);

  const placeModule = useCallback(
    (type: FlexGridModuleType, boardId: string, xRaw: number, yRaw: number): FlexGridModule | null => {
      const board = layout.boards.find((b) => b.id === boardId);
      if (!board) return null;
      const ctx = boardCtx(layout, board);
      const mod = createFlexGridModule(type, ctx, xRaw, yRaw, {
        z: nextZIndex(board),
        text: type === "text" ? "พิมพ์ข้อความของคุณที่นี่…" : undefined,
        name: `${FLEX_GRID_MODULE_DEFAULTS[type].label} ${board.modules.filter((m) => m.type === type).length + 1}`,
        snap: snapEnabled,
      });
      onCommit({
        ...layout,
        boards: layout.boards.map((b) =>
          b.id === boardId ? { ...b, modules: [...b.modules, mod] } : b,
        ),
      });
      selectModule({ boardId, moduleId: mod.id });
      return mod;
    },
    [layout, onCommit, selectModule, snapEnabled],
  );

  useEffect(() => {
    const pending = pendingFileUploadRef.current;
    if (!pending || !onUploadToModule) return;
    const exists = layout.boards.some(
      (b) => b.id === pending.boardId && b.modules.some((m) => m.id === pending.moduleId),
    );
    if (!exists) return;
    pendingFileUploadRef.current = null;
    onUploadToModule(pending.boardId, pending.moduleId, pending.file);
  }, [layout, onUploadToModule]);

  const addBoard = () => {
    const n = layout.boards.length + 1;
    onCommit({
      ...layout,
      boards: [...layout.boards, createEmptyFlexGridBoard(undefined, `Board ${n}`)],
    });
  };

  const copySelected = (boardId: string, moduleId: string) => {
    const board = layout.boards.find((b) => b.id === boardId);
    const mod = board?.modules.find((m) => m.id === moduleId);
    if (!board || !mod || mod.locked) return;
    const ctx = boardCtx(layout, board);
    const ox = Math.min(mod.x + 24, layout.canvasWidth - mod.w);
    const oy = Math.min(mod.y + 24, board.height - mod.h);
    const nx = snapEnabled ? snapX(ctx, ox) : Math.max(0, ox);
    const ny = snapEnabled ? snapY(ctx, oy) : Math.max(0, oy);
    const copy: FlexGridModule = {
      ...mod,
      id: crypto.randomUUID(),
      x: nx,
      y: ny,
      z: nextZIndex(board),
      name: mod.name ? `${mod.name} copy` : undefined,
      locked: undefined,
    };
    onCommit({
      ...layout,
      boards: layout.boards.map((b) =>
        b.id === boardId ? { ...b, modules: [...b.modules, copy] } : b,
      ),
    });
    selectModule({ boardId, moduleId: copy.id });
  };

  const arrangeModule = (
    boardId: string,
    moduleId: string,
    act: "front" | "forward" | "backward" | "back",
  ) => {
    const board = layout.boards.find((b) => b.id === boardId);
    if (!board) return;
    const zs = board.modules.map((m) => m.z);
    const cur = board.modules.find((m) => m.id === moduleId);
    if (!cur || cur.locked) return;
    let nextZ = cur.z;
    if (act === "front") nextZ = Math.max(...zs) + 1;
    else if (act === "back") nextZ = Math.min(...zs) - 1;
    else if (act === "forward") nextZ = cur.z + 1;
    else nextZ = Math.max(0, cur.z - 1);
    onCommit(updateModule(layout, boardId, moduleId, { z: nextZ }));
  };

  const openUpload = (boardId: string, moduleId: string, type: ModuleUploadKind) => {
    if (disabled || !onUploadToModule) return;
    pendingUploadRef.current = { boardId, moduleId, kind: type };
    const input =
      type === "video"
        ? videoInputRef.current
        : type === "model3d"
          ? model3dInputRef.current
          : type === "gif"
            ? gifInputRef.current
            : imageInputRef.current;
    if (!input) return;
    input.value = "";
    input.click();
  };

  const submitModuleFile = (boardId: string, moduleId: string, kind: ModuleUploadKind, file: File) => {
    if (!fileMatchesKind(kind, file)) {
      toastWrongModuleFile(kind);
      return;
    }
    onUploadToModule?.(boardId, moduleId, file);
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>, kind: ModuleUploadKind) => {
    const file = e.target.files?.[0];
    const pending = pendingUploadRef.current;
    e.target.value = "";
    pendingUploadRef.current = null;
    if (!file || !pending || pending.kind !== kind) return;
    submitModuleFile(pending.boardId, pending.moduleId, kind, file);
  };

  const handleBoardDragOver = (e: DragEvent, board: FlexGridBoard) => {
    const fileDrag = !disabled && !!onUploadToModule && isFileDrag(e.dataTransfer);
    const raw =
      activeFlexGridDragType ||
      e.dataTransfer.getData(FLEX_GRID_TOOL_MIME) ||
      e.dataTransfer.getData("text/plain");
    const toolType: FlexGridModuleType | null =
      raw === "image" ||
      raw === "gif" ||
      raw === "text" ||
      raw === "video" ||
      raw === "model3d"
        ? raw
        : null;
    const hasTool =
      !!activeFlexGridDragType ||
      e.dataTransfer.types.includes(FLEX_GRID_TOOL_MIME) ||
      e.dataTransfer.types.includes("text/plain");
    if (!fileDrag && !hasTool) return;

    const probeType: FlexGridModuleType = fileDrag
      ? (mediaKindFromDataTransfer(e.dataTransfer) ?? "image")
      : (toolType ?? "text");

    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const mx = (e.clientX - rect.left) / zoom;
    const my = (e.clientY - rect.top) / zoom;
    const ctx = boardCtx(layout, board);
    const sizeW =
      FLEX_GRID_MODULE_DEFAULTS[probeType].spanCols * colWidth(ctx) +
      (FLEX_GRID_MODULE_DEFAULTS[probeType].spanCols - 1) * layout.grid.colGap;
    const sizeH =
      FLEX_GRID_MODULE_DEFAULTS[probeType].spanRows * effectiveRowUnit(ctx) +
      (FLEX_GRID_MODULE_DEFAULTS[probeType].spanRows - 1) * layout.grid.rowGap;
    let x = mx - sizeW / 2;
    let y = my - sizeH / 2;
    let w = sizeW;
    let h = sizeH;
    if (snapEnabled) {
      x = snapX(ctx, x);
      w = snapWidth(ctx, w, x);
      y = snapY(ctx, y);
      h = snapHeight(ctx, h, y);
    } else {
      x = Math.max(0, Math.min(layout.canvasWidth - w, x));
      y = Math.max(0, Math.min(board.height - h, y));
    }
    setDropGhost({ boardId: board.id, x, y, w, h });
  };

  const handleBoardDrop = (e: DragEvent, board: FlexGridBoard) => {
    e.preventDefault();
    setDropGhost(null);
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const mx = (e.clientX - rect.left) / zoom;
    const my = (e.clientY - rect.top) / zoom;

    if (!disabled && onUploadToModule && isFileDrag(e.dataTransfer) && e.dataTransfer.files?.length) {
      const file = e.dataTransfer.files[0]!;
      const kind = mediaKindFromFile(file);
      if (!kind) {
        toast.error("รองรับเฉพาะภาพ, GIF, วิดีโอ หรือไฟล์ 3D (.stl/.obj)");
        return;
      }
      const mod = placeModule(kind, board.id, mx, my);
      if (!mod) return;
      pendingFileUploadRef.current = { boardId: board.id, moduleId: mod.id, file };
      return;
    }

    const raw =
      activeFlexGridDragType ||
      e.dataTransfer.getData(FLEX_GRID_TOOL_MIME) ||
      e.dataTransfer.getData("text/plain");
    if (
      raw !== "image" &&
      raw !== "gif" &&
      raw !== "text" &&
      raw !== "video" &&
      raw !== "model3d"
    )
      return;
    placeModule(raw, board.id, mx, my);
  };

  const startPan = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (panningRef.current) return;
    const isMiddle = e.button === 1;
    const isHand = panMode && e.button === 0;
    if (!isMiddle && !isHand) return;
    e.preventDefault();
    e.stopPropagation();
    panningRef.current = { lastX: e.clientX, lastY: e.clientY, pointerId: e.pointerId };
    setIsPanning(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const movePan = (e: ReactPointerEvent<HTMLDivElement>) => {
    const pan = panningRef.current;
    const el = scrollRef.current;
    if (!pan || !el || pan.pointerId !== e.pointerId) return;
    el.scrollLeft += pan.lastX - e.clientX;
    el.scrollTop += pan.lastY - e.clientY;
    pan.lastX = e.clientX;
    pan.lastY = e.clientY;
  };

  const endPan = (e: ReactPointerEvent<HTMLDivElement>) => {
    const pan = panningRef.current;
    if (!pan || pan.pointerId !== e.pointerId) return;
    panningRef.current = null;
    setIsPanning(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-card px-1.5 py-1">
          <button
            type="button"
            className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            onClick={() => setZoom(zoom - 0.1)}
            aria-label="ซูมออก"
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            className="min-w-[3.25rem] px-1 text-center text-[11px] tabular-nums text-muted-foreground"
            onClick={() => setZoom(1)}
            title="รีเซ็ตซูม"
          >
            {Math.round(zoom * 100)}%
          </button>
          <button
            type="button"
            className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            onClick={() => setZoom(zoom + 0.1)}
            aria-label="ซูมเข้า"
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </button>
        </div>
        <button
          type="button"
          title={panMode ? "ปิดโหมดเลื่อนหน้า" : "เลื่อนหน้า (หรือคลิกเมาส์กลางลาก)"}
          aria-label="เลื่อนหน้า"
          aria-pressed={panMode}
          onClick={() => setPanMode((v) => !v)}
          className={cn(
            "inline-flex items-center justify-center rounded-full border border-border/70 bg-card p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
            panMode && "border-primary bg-primary/10 text-primary",
          )}
        >
          <Hand className="h-3.5 w-3.5" />
        </button>
        <div className="inline-flex items-center gap-0.5 rounded-full border border-border/70 bg-card px-1 py-1">
          <button
            type="button"
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
            aria-label="Undo"
            onClick={() => onUndo?.()}
            className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30"
          >
            <Undo2 className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            disabled={!canRedo}
            title="Redo (Ctrl+Y)"
            aria-label="Redo"
            onClick={() => onRedo?.()}
            className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30"
          >
            <Redo2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className={cn(
          "overflow-auto rounded-xl border border-border/70 bg-muted/20 p-3 sm:p-4",
          (panMode || isPanning) && "cursor-grab",
          isPanning && "cursor-grabbing",
        )}
        onWheel={(e) => {
          if (!(e.ctrlKey || e.metaKey)) return;
          e.preventDefault();
          setZoom(zoom + (e.deltaY > 0 ? -0.05 : 0.05));
        }}
        onPointerDown={startPan}
        onPointerDownCapture={(e) => {
          if (e.button === 1) startPan(e);
        }}
        onPointerMove={movePan}
        onPointerUp={endPan}
        onPointerCancel={endPan}
        onAuxClick={(e) => {
          if (e.button === 1) e.preventDefault();
        }}
      >
        <div
          className={cn(
            "mx-auto flex w-max max-w-full flex-col gap-0",
            panMode && "pointer-events-none",
          )}
        >
          {layout.boards.map((board, bi) => (
            <BoardSurface
              key={board.id}
              board={board}
              boardIndex={bi}
              layout={layout}
              zoom={zoom}
              gridVisible={gridVisible}
              snapEnabled={snapEnabled}
              selected={selected}
              selection={selection}
              onSelectModule={selectModule}
              disabled={disabled}
              uploadingModuleId={uploadingModuleId}
              uploadStageLabel={uploadStageLabel}
              uploadStagePercent={uploadStagePercent}
              dropGhost={dropGhost?.boardId === board.id ? dropGhost : null}
              onDragOver={(e) => handleBoardDragOver(e, board)}
              onDragLeave={() => setDropGhost(null)}
              onDrop={(e) => handleBoardDrop(e, board)}
              onChangeModule={(moduleId, patch, live) => {
                const next = updateModule(layout, board.id, moduleId, patch);
                if (live) onChange(next);
                else onCommit(next);
              }}
              onHistoryBegin={onHistoryBegin}
              onHistoryEnd={onHistoryEnd}
              onDeleteModule={(moduleId) => {
                const mod = board.modules.find((m) => m.id === moduleId);
                if (mod?.locked) return;
                onCommit({
                  ...layout,
                  boards: layout.boards.map((b) =>
                    b.id === board.id
                      ? { ...b, modules: b.modules.filter((m) => m.id !== moduleId) }
                      : b,
                  ),
                });
                onSelectionChange(
                  selection.filter((s) => !(s.boardId === board.id && s.moduleId === moduleId)),
                );
              }}
              onArrangeModule={(moduleId, act) => arrangeModule(board.id, moduleId, act)}
              onCopyModule={(moduleId) => copySelected(board.id, moduleId)}
              onUploadClick={openUpload}
              onUploadFile={(moduleId, kind, files) => {
                const file = pickFileForKind(kind, files);
                if (!file) {
                  toastWrongModuleFile(kind);
                  return;
                }
                submitModuleFile(board.id, moduleId, kind, file);
              }}
              onCropModule={onCropModule}
            />
          ))}

          <div className="flex items-stretch gap-2">
            <div className="w-14 shrink-0 sm:w-16" aria-hidden />
            <button
              type="button"
              disabled={disabled || panMode}
              onClick={addBoard}
              style={{ width: layout.canvasWidth * zoom }}
              className="flex items-center justify-center gap-1.5 border border-dashed border-border/80 bg-card/60 py-3 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground disabled:opacity-50"
            >
              <Plus className="h-3.5 w-3.5" />
              Add board
            </button>
          </div>
        </div>
      </div>

      <input
        ref={imageInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/*"
        className="hidden"
        onChange={(e) => onFileChange(e, "image")}
      />
      <input
        ref={videoInputRef}
        type="file"
        accept={PROJECT_VIDEO_ACCEPT}
        className="hidden"
        onChange={(e) => onFileChange(e, "video")}
      />
      <input
        ref={gifInputRef}
        type="file"
        accept={PROJECT_GIF_ACCEPT}
        className="hidden"
        onChange={(e) => onFileChange(e, "gif")}
      />
      <input
        ref={model3dInputRef}
        type="file"
        accept={PROJECT_MODEL3D_ACCEPT}
        className="hidden"
        onChange={(e) => onFileChange(e, "model3d")}
      />

    </div>
  );
}

function ArrangeBtn({
  children,
  onClick,
  title,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={cn(
        "rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground",
        danger && "hover:bg-destructive/10 hover:text-destructive",
      )}
    >
      {children}
    </button>
  );
}

function BoardSurface({
  board,
  boardIndex,
  layout,
  zoom,
  gridVisible,
  snapEnabled,
  selected,
  selection,
  onSelectModule,
  disabled,
  uploadingModuleId,
  uploadStageLabel,
  uploadStagePercent,
  dropGhost,
  onDragOver,
  onDragLeave,
  onDrop,
  onChangeModule,
  onHistoryBegin,
  onHistoryEnd,
  onDeleteModule,
  onArrangeModule,
  onCopyModule,
  onUploadClick,
  onUploadFile,
  onCropModule,
}: {
  board: FlexGridBoard;
  boardIndex: number;
  layout: FlexGridLayout;
  zoom: number;
  gridVisible: boolean;
  snapEnabled: boolean;
  selected: FlexGridLayerRef | null;
  selection: FlexGridLayerRef[];
  onSelectModule: (ref: FlexGridLayerRef | null, additive?: boolean) => void;
  disabled?: boolean;
  uploadingModuleId?: string | null;
  uploadStageLabel?: string | null;
  uploadStagePercent?: number | null;
  dropGhost: { x: number; y: number; w: number; h: number } | null;
  onDragOver: (e: DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: DragEvent) => void;
  onChangeModule: (
    moduleId: string,
    patch: Partial<FlexGridModule>,
    live?: boolean,
  ) => void;
  onHistoryBegin: () => void;
  onHistoryEnd: () => void;
  onDeleteModule: (moduleId: string) => void;
  onArrangeModule: (moduleId: string, act: "front" | "forward" | "backward" | "back") => void;
  onCopyModule: (moduleId: string) => void;
  onUploadClick: (boardId: string, moduleId: string, type: ModuleUploadKind) => void;
  onUploadFile: (moduleId: string, kind: ModuleUploadKind, files: FileList) => void;
  onCropModule?: (boardId: string, moduleId: string, imageUrl: string) => void;
}) {
  const ctx = boardCtx(layout, board);
  const cw = colWidth(ctx);

  return (
    <div id={flexGridBoardDomId(board.id)} className="relative flex scroll-mt-3 items-stretch gap-2">
      <div
        className="flex w-14 shrink-0 items-start justify-end pt-2 sm:w-16"
        aria-hidden={false}
      >
        <span className="max-w-full truncate text-right text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          {boardDisplayName(board, boardIndex)}
        </span>
      </div>
      <div
        className={cn(
          "relative overflow-visible border-x border-b border-border bg-background",
          boardIndex === 0 && "border-t",
        )}
        style={{
          width: layout.canvasWidth * zoom,
          height: board.height * zoom,
        }}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => onSelectModule(null)}
      >
        <div
          className="absolute left-0 top-0 origin-top-left"
          style={{
            width: layout.canvasWidth,
            height: board.height,
            transform: `scale(${zoom})`,
          }}
        >
          {/* Grid scales with zoom; board overflow-hidden keeps strokes inside the frame. */}
          {gridVisible ? (
            <svg
              className="pointer-events-none absolute inset-0 h-full w-full overflow-hidden text-primary"
              width={layout.canvasWidth}
              height={board.height}
              viewBox={`0 0 ${layout.canvasWidth} ${board.height}`}
              aria-hidden
            >
              {Array.from({ length: layout.grid.columns }, (_, i) => {
                const left = Math.min(Math.max(0.5, colStart(ctx, i)), layout.canvasWidth - 0.5);
                const right = Math.min(Math.max(0.5, colStart(ctx, i) + cw), layout.canvasWidth - 0.5);
                return (
                  <Fragment key={`c-${i}`}>
                    <line
                      x1={left}
                      y1={0}
                      x2={left}
                      y2={board.height}
                      className="stroke-primary/40"
                      stroke="currentColor"
                      strokeWidth={1}
                      strokeDasharray="4 3"
                      vectorEffect="non-scaling-stroke"
                    />
                    <line
                      x1={right}
                      y1={0}
                      x2={right}
                      y2={board.height}
                      className="stroke-primary/40"
                      stroke="currentColor"
                      strokeWidth={1}
                      strokeDasharray="4 3"
                      vectorEffect="non-scaling-stroke"
                    />
                  </Fragment>
                );
              })}
              {layout.grid.rows > 0
                ? Array.from({ length: layout.grid.rows }, (_, i) => {
                    const rh =
                      (board.height -
                        layout.grid.rowMargin * 2 -
                        layout.grid.rowGap * (layout.grid.rows - 1)) /
                      layout.grid.rows;
                    const topRaw = rowStart(ctx, i);
                    const top = Math.min(Math.max(0.5, topRaw), board.height - 0.5);
                    const bottom = Math.min(Math.max(0.5, topRaw + rh), board.height - 0.5);
                    return (
                      <Fragment key={`r-${i}`}>
                        <line
                          x1={0}
                          y1={top}
                          x2={layout.canvasWidth}
                          y2={top}
                          className="stroke-primary/35"
                          stroke="currentColor"
                          strokeWidth={1}
                          strokeDasharray="4 3"
                          vectorEffect="non-scaling-stroke"
                        />
                        <line
                          x1={0}
                          y1={bottom}
                          x2={layout.canvasWidth}
                          y2={bottom}
                          className="stroke-primary/35"
                          stroke="currentColor"
                          strokeWidth={1}
                          strokeDasharray="4 3"
                          vectorEffect="non-scaling-stroke"
                        />
                      </Fragment>
                    );
                  })
                : null}
            </svg>
          ) : null}

          {board.modules.length === 0 ? (
            <p className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
              ลากโมดูลจากแถบซ้ายมาวางที่นี่
            </p>
          ) : null}

          {dropGhost ? (
            <div
              className="pointer-events-none absolute rounded-md border-2 border-dashed border-primary/50 bg-primary/10"
              style={{
                left: dropGhost.x,
                top: dropGhost.y,
                width: dropGhost.w,
                height: dropGhost.h,
              }}
            />
          ) : null}

          {board.modules.map((mod) => (
            <PlacedModule
              key={mod.id}
              module={mod}
              board={board}
              layout={layout}
              selected={selected?.boardId === board.id && selected?.moduleId === mod.id}
              inSelection={selection.some(
                (s) => s.boardId === board.id && s.moduleId === mod.id,
              )}
              disabled={disabled}
              snapEnabled={snapEnabled}
              uploading={uploadingModuleId === mod.id}
              uploadStageLabel={uploadStageLabel}
              uploadStagePercent={uploadStagePercent}
              onSelect={(additive) =>
                onSelectModule({ boardId: board.id, moduleId: mod.id }, additive)
              }
              onChange={(patch, live) => onChangeModule(mod.id, patch, live)}
              onHistoryBegin={onHistoryBegin}
              onHistoryEnd={onHistoryEnd}
              onDelete={() => onDeleteModule(mod.id)}
              onArrange={(act) => onArrangeModule(mod.id, act)}
              onCopy={() => onCopyModule(mod.id)}
              onUploadClick={() => {
                if (
                  mod.type === "image" ||
                  mod.type === "gif" ||
                  mod.type === "video" ||
                  mod.type === "model3d"
                ) {
                  onUploadClick(board.id, mod.id, mod.type);
                }
              }}
              onUploadFile={(files) => {
                if (
                  mod.type === "image" ||
                  mod.type === "gif" ||
                  mod.type === "video" ||
                  mod.type === "model3d"
                ) {
                  onUploadFile(mod.id, mod.type, files);
                }
              }}
              onCrop={
                mod.type === "image" && mod.url && onCropModule
                  ? () => onCropModule(board.id, mod.id, mod.url!)
                  : undefined
              }
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function ModuleUploadingOverlay({
  className,
  label = "กำลังอัปโหลด",
  percent,
}: {
  className?: string;
  label?: string;
  /** Real progress (0–100) when known; falls back to a simulated ramp otherwise. */
  percent?: number | null;
}) {
  return (
    <div
      className={cn(
        "absolute inset-0 z-20 flex items-center justify-center bg-background/60 px-4",
        className,
      )}
    >
      <AutoLoadPercentBar percent={percent} label={label} showLabel />
    </div>
  );
}

/** Compact "what's happening now" strip shown in the module's name bar while uploading. */
function ModuleBarProgress({
  label,
  percent,
}: {
  label?: string | null;
  percent?: number | null;
}) {
  const pct = Math.min(100, Math.max(0, Math.round(useAutoPercent(percent))));
  return (
    <div className="pointer-events-none flex min-w-0 flex-col gap-0.5 rounded border border-border/60 bg-card/95 px-1.5 py-1 shadow-sm">
      <div className="flex items-center justify-between gap-1.5">
        <span className="min-w-0 flex-1 truncate text-[10px] font-medium text-foreground/90">
          {label ?? "กำลังอัปโหลด..."}
        </span>
        <span className="shrink-0 text-[9px] font-semibold tabular-nums text-muted-foreground">
          {pct}%
        </span>
      </div>
      <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-150 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function PlacedModule({
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
  onUploadFile,
  onCrop,
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
  onUploadFile?: (files: FileList) => void;
  onCrop?: () => void;
}) {
  const ctx = boardCtx(layout, board);
  const textEditorRef = useRef<TextModuleBodyHandle>(null);
  const skipClickSelectRef = useRef(false);
  const locked = !!module.locked;
  const [fileDragOver, setFileDragOver] = useState(false);
  const acceptsFileDrop =
    !!onUploadFile &&
    !disabled &&
    !locked &&
    !uploading &&
    (module.type === "image" ||
      module.type === "gif" ||
      module.type === "video" ||
      module.type === "model3d");

  const onMovePointerDown = (e: ReactPointerEvent) => {
    if (disabled || locked) return;
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
    if (disabled || locked) return;
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

    const onMove = (ev: PointerEvent) => {
      const nw = Math.max(40, Math.min(layout.canvasWidth - left, originW + (ev.clientX - startX)));
      const nh = Math.max(20, Math.min(board.height - top, originH + (ev.clientY - startY)));
      onChange({ w: nw, h: nh }, true);
    };
    const onUp = (ev: PointerEvent) => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
      const nw = Math.max(40, Math.min(layout.canvasWidth - left, originW + (ev.clientX - startX)));
      const nh = Math.max(20, Math.min(board.height - top, originH + (ev.clientY - startY)));
      if (snapEnabled) {
        onChange(
          {
            w: snapWidth(ctx, nw, left),
            h: snapHeight(ctx, nh, top),
          },
          true,
        );
      } else {
        onChange({ w: nw, h: nh }, true);
      }
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
        zIndex: fileDragOver ? Math.max(module.z, 10_000) : module.z,
      }}
      onClick={(e) => {
        e.stopPropagation();
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
        if (disabled) return;
        if (!(e.ctrlKey || e.metaKey)) return;
        const el = e.target as HTMLElement;
        if (el.closest("button") && !el.closest("[data-flex-move-handle]")) return;
        e.preventDefault();
        e.stopPropagation();
        onSelect(true);
        skipClickSelectRef.current = true;
      }}
    >
      <div
        className={cn(
          "absolute bottom-full left-0 right-0 z-20 mb-1 flex flex-col items-stretch gap-0.5",
          "opacity-0 transition-opacity group-hover:opacity-100",
          (selected || inSelection || uploading) && "opacity-100",
        )}
      >
        {module.type === "text" && !disabled ? (
          <FlexTextFormatToolbar
            className="pointer-events-auto w-max max-w-none self-center"
            onCommand={(cmd) => textEditorRef.current?.applyCommand(cmd)}
          />
        ) : null}
        {uploading ? (
          <ModuleBarProgress label={uploadStageLabel} percent={uploadStagePercent} />
        ) : (
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
        )}
      </div>

      <div
        className={cn(
          "relative h-full w-full overflow-hidden",
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
                  selected || inSelection
                    ? "border-primary ring-2 ring-primary/30"
                    : "border-border/80",
                ),
          fileDragOver && "border-primary ring-2 ring-primary bg-primary/5",
        )}
      >
        <div className="relative h-full w-full overflow-hidden">
          {module.type === "image" ? (
            module.url ? (
              <div
                className={cn(
                  "relative h-full w-full",
                  !locked && !disabled && "cursor-grab active:cursor-grabbing",
                )}
                data-flex-move-handle={locked || disabled ? undefined : true}
                onPointerDown={locked || disabled ? undefined : onMovePointerDown}
              >
                <img
                  src={module.url}
                  alt=""
                  className="pointer-events-none h-full w-full object-cover"
                  draggable={false}
                />
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
                    {onCrop ? (
                      <button
                        type="button"
                        title="ครอบภาพ"
                        aria-label="ครอบภาพ"
                        className="flex h-7 w-7 items-center justify-center rounded-md border border-border/70 bg-card/95 text-foreground shadow-sm"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          onCrop();
                        }}
                      >
                        <Crop className="h-3.5 w-3.5" strokeWidth={2} />
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
                  <img
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
                <video
                  src={module.url}
                  className="pointer-events-none h-full w-full object-cover"
                  muted
                  playsInline
                />
                {!disabled ? (
                  <button
                    type="button"
                    title="เปลี่ยนวิดีโอ"
                    aria-label="เปลี่ยนวิดีโอ"
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
                    <Film className="h-3.5 w-3.5" strokeWidth={2} />
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

      {!disabled && !locked ? (
        <div
          className={cn(
            "absolute bottom-0 right-0 z-30 flex h-4 w-4 cursor-se-resize items-center justify-center bg-primary text-primary-foreground opacity-0 transition-opacity group-hover:opacity-100",
            selected && "opacity-100",
          )}
          title="ลากเพื่อขยาย/หด"
          aria-label="ขยายหรือหดโมดูล"
          onPointerDown={onResizePointerDown}
        >
          <ArrowDownRight className="h-3 w-3" strokeWidth={2.5} />
        </div>
      ) : null}
      </div>

      {!disabled ? (
        <div
          className={cn(
            "absolute left-1/2 top-full z-40 mt-1 flex -translate-x-1/2 items-center gap-0.5 rounded-full border border-border/70 bg-card px-1 py-0.5 shadow-sm",
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

type FlexTextCommand =
  | { kind: "inline"; cmd: InlineCmd }
  | { kind: "align"; cmd: AlignCmd }
  | { kind: "font"; stack: string }
  | { kind: "size"; size: string };

function FlexTextFormatToolbar({
  onCommand,
  className,
}: {
  onCommand: (cmd: FlexTextCommand) => void;
  className?: string;
}) {
  const btn = (label: string, cmd: FlexTextCommand, icon: ReactNode) => (
    <button
      type="button"
      title={label}
      aria-label={label}
      className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
      onMouseDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onCommand(cmd);
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {icon}
    </button>
  );

  return (
    <div
      role="toolbar"
      aria-label="จัดรูปแบบข้อความ"
      className={cn(
        "flex flex-wrap items-center gap-0.5 rounded-md border border-border/60 bg-card/95 px-1 py-0.5 shadow-sm",
        className,
      )}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <select
        aria-label="ฟอนต์"
        className="mr-0.5 h-6 max-w-[7.5rem] rounded border border-border/50 bg-background px-1 text-[10px] text-foreground"
        defaultValue="inherit"
        onMouseDown={(e) => e.stopPropagation()}
        onChange={(e) => onCommand({ kind: "font", stack: e.target.value })}
      >
        {PROJECT_TEXT_FONTS.map((f) => (
          <option key={f.id} value={f.stack}>
            {f.label}
          </option>
        ))}
      </select>
      <select
        aria-label="ขนาดตัวอักษร"
        className="mr-0.5 h-6 w-[3.25rem] rounded border border-border/50 bg-background px-0.5 text-[10px] text-foreground"
        defaultValue=""
        onMouseDown={(e) => e.stopPropagation()}
        onChange={(e) => onCommand({ kind: "size", size: e.target.value })}
      >
        {PROJECT_TEXT_SIZES.map((s) => (
          <option key={s.id} value={s.size}>
            {s.label}
          </option>
        ))}
      </select>
      {btn("ตัวหนา", { kind: "inline", cmd: "bold" }, <Bold className="h-3.5 w-3.5" />)}
      {btn("ตัวเอียง", { kind: "inline", cmd: "italic" }, <Italic className="h-3.5 w-3.5" />)}
      {btn("ขีดเส้นใต้", { kind: "inline", cmd: "underline" }, <Underline className="h-3.5 w-3.5" />)}
      {btn(
        "ขีดกลาง",
        { kind: "inline", cmd: "strikeThrough" },
        <Strikethrough className="h-3.5 w-3.5" />,
      )}
      <span className="mx-0.5 h-3.5 w-px shrink-0 bg-border" aria-hidden />
      {btn("ชิดซ้าย", { kind: "align", cmd: "justifyLeft" }, <AlignLeft className="h-3.5 w-3.5" />)}
      {btn(
        "กึ่งกลาง",
        { kind: "align", cmd: "justifyCenter" },
        <AlignCenter className="h-3.5 w-3.5" />,
      )}
      {btn("ชิดขวา", { kind: "align", cmd: "justifyRight" }, <AlignRight className="h-3.5 w-3.5" />)}
    </div>
  );
}

type TextModuleBodyHandle = {
  applyCommand: (cmd: FlexTextCommand) => void;
};

const TextModuleBody = forwardRef<
  TextModuleBodyHandle,
  {
    initialHtml: string;
    editing: boolean;
    disabled?: boolean;
    onCommit: (html: string) => void;
  }
>(function TextModuleBody({ initialHtml, editing, disabled, onCommit }, ref) {
  const editorRef = useRef<HTMLDivElement>(null);
  const seeded = useRef(false);
  useEffect(() => {
    if (!editorRef.current) return;
    if (!seeded.current) {
      editorRef.current.innerHTML = initialHtml;
      seeded.current = true;
      return;
    }
    if (document.activeElement !== editorRef.current) {
      editorRef.current.innerHTML = initialHtml;
    }
  }, [initialHtml]);

  const commit = (el: HTMLElement) => {
    onCommit(sanitizeProjectRichText(el.innerHTML));
  };

  useImperativeHandle(ref, () => ({
    applyCommand(cmd: FlexTextCommand) {
      const el = editorRef.current;
      if (!el || disabled) return;
      const saved = saveSelection(el);
      el.focus();
      restoreSelection(saved);
      if (cmd.kind === "inline") {
        toggleInlineFormat(el, INLINE_BY_CMD[cmd.cmd]);
      } else if (cmd.kind === "align") {
        applyAlign(cmd.cmd);
      } else if (cmd.kind === "font") {
        applyFontFamily(el, cmd.stack);
      } else {
        applyFontSize(el, cmd.size);
      }
      // Normalize markup after format (select-all bold/font especially).
      const safe = sanitizeProjectRichText(el.innerHTML);
      if (el.innerHTML !== safe) el.innerHTML = safe;
      onCommit(safe);
    },
  }));

  return (
    <div
      ref={editorRef}
      className={cn(
        "h-full w-full overflow-auto text-sm leading-relaxed outline-none",
        "[&_p]:my-0 [&_p+p]:mt-1.5 [&_b]:font-bold [&_strong]:font-bold",
        "bg-transparent text-foreground",
        editing ? "p-3" : "p-1",
      )}
      contentEditable={!disabled}
      suppressContentEditableWarning
      onBlur={(e) => commit(e.currentTarget)}
    />
  );
});

/** Place a module at board center — used by tools sidebar click-to-place. */
export function placeFlexGridModuleAtCenter(
  layout: FlexGridLayout,
  type: FlexGridModuleType,
  boardId?: string,
): { layout: FlexGridLayout; ref: FlexGridLayerRef } {
  const board = layout.boards.find((b) => b.id === boardId) ?? layout.boards[0];
  const ctx = boardCtx(layout, board);
  const mod = createFlexGridModule(type, ctx, layout.canvasWidth / 2, board.height / 3, {
    z: nextZIndex(board),
    text: type === "text" ? "พิมพ์ข้อความของคุณที่นี่…" : undefined,
    name: `${FLEX_GRID_MODULE_DEFAULTS[type].label} ${board.modules.filter((m) => m.type === type).length + 1}`,
  });
  return {
    layout: {
      ...layout,
      boards: layout.boards.map((b) =>
        b.id === board.id ? { ...b, modules: [...b.modules, mod] } : b,
      ),
    },
    ref: { boardId: board.id, moduleId: mod.id },
  };
}
