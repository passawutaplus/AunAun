import { Plus, Undo2, Redo2, ZoomIn, ZoomOut, Hand } from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type DragEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { FLEX_GRID_TOOL_MIME, activeFlexGridDragType } from "@/components/project/FlexGridToolsSidebar";
import type { FlexGridLayerRef } from "@/components/project/FlexGridToolsSidebar";
import { DeleteConfirmDialog } from "@/components/ui/DeleteConfirmDialog";
import {
  FLEX_GRID_MODULE_DEFAULTS,
  boardDisplayName,
  colWidth,
  createEmptyFlexGridBoard,
  createFlexGridModule,
  effectiveRowUnit,
  moveFlexBoard,
  nextZIndex,
  setBoardLocked,
  snapHeight,
  snapWidth,
  snapX,
  snapY,
  type FlexGridBoard,
  type FlexGridLayout,
  type FlexGridModule,
  type FlexGridModuleType,
} from "@/lib/flexGridLayout";
import type { FlexGridInlineCropResult } from "@/components/project/FlexGridInlineCrop";
import { PROJECT_VIDEO_ACCEPT } from "@/lib/videoAccept";
import { PROJECT_MODEL3D_ACCEPT } from "@/lib/model3dAccept";
import { loadProjectTextFonts } from "@/lib/projectTextFonts";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { PROJECT_GIF_ACCEPT, ModuleUploadKind, isFileDrag, mediaKindFromFile, mediaKindFromDataTransfer, fileMatchesKind, pickFileForKind, toastWrongModuleFile } from "@/components/project/flexGrid/moduleFiles";
import { boardCtx, updateModule } from "@/components/project/flexGrid/flexGridEditorUtils";
import { BoardSurface } from "@/components/project/flexGrid/BoardSurface";

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
  /** Custom video thumbnail for a flex video module. */
  onSetModulePoster?: (boardId: string, moduleId: string, file: File) => void;
  /** Module currently in inline crop mode (Full Grid). */
  croppingModuleId?: string | null;
  onBeginCropModule?: (boardId: string, moduleId: string, imageUrl: string) => void;
  onConfirmInlineCrop?: (
    boardId: string,
    moduleId: string,
    result: FlexGridInlineCropResult,
  ) => void;
  onRestoreOriginalModule?: (boardId: string, moduleId: string) => void;
  onCancelInlineCrop?: () => void;
  /** True while uploading a confirmed inline crop. */
  inlineCropSaving?: boolean;
  className?: string;
};

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
  onSetModulePoster,
  croppingModuleId,
  onBeginCropModule,
  onConfirmInlineCrop,
  onRestoreOriginalModule,
  onCancelInlineCrop,
  inlineCropSaving,
  className,
}: Props) {
  useEffect(() => {
    loadProjectTextFonts();
  }, []);

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
  const posterInputRef = useRef<HTMLInputElement>(null);
  const model3dInputRef = useRef<HTMLInputElement>(null);
  const pendingUploadRef = useRef<{
    boardId: string;
    moduleId: string;
    kind: ModuleUploadKind;
  } | null>(null);
  const pendingPosterRef = useRef<{ boardId: string; moduleId: string } | null>(null);
  /** After placing a module from a file drop, upload once the new module is in `layout`. */
  const pendingFileUploadRef = useRef<{
    boardId: string;
    moduleId: string;
    file: File;
  } | null>(null);

  const [renamingBoardId, setRenamingBoardId] = useState<string | null>(null);
  const [pendingDeleteBoard, setPendingDeleteBoard] = useState<{
    id: string;
    name: string;
    moduleCount: number;
  } | null>(null);

  const placeModule = useCallback(
    (type: FlexGridModuleType, boardId: string, xRaw: number, yRaw: number): FlexGridModule | null => {
      const board = layout.boards.find((b) => b.id === boardId);
      if (!board) return null;
      if (board.locked) {
        toast.error("บอร์ดถูกล็อก — ปลดล็อกก่อนเพิ่มโมดูล");
        return null;
      }
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

  const renameBoard = (boardId: string, name: string) => {
    const trimmed = name.trim();
    onCommit({
      ...layout,
      boards: layout.boards.map((b) =>
        b.id === boardId ? { ...b, name: trimmed || undefined } : b,
      ),
    });
    setRenamingBoardId(null);
  };

  const toggleBoardLock = (boardId: string) => {
    const board = layout.boards.find((b) => b.id === boardId);
    if (!board) return;
    onCommit(setBoardLocked(layout, boardId, !board.locked));
  };

  const moveBoard = (boardId: string, direction: -1 | 1) => {
    const next = moveFlexBoard(layout, boardId, direction);
    if (next === layout) return;
    onCommit(next);
  };

  const requestDeleteBoard = (boardId: string) => {
    const board = layout.boards.find((b) => b.id === boardId);
    if (!board) return;
    if (layout.boards.length <= 1) {
      toast.error("ต้องมีอย่างน้อย 1 บอร์ด");
      return;
    }
    if (board.locked) {
      toast.error("บอร์ดถูกล็อก — ปลดล็อกก่อนลบ");
      return;
    }
    setPendingDeleteBoard({
      id: board.id,
      name: boardDisplayName(board, layout.boards.findIndex((b) => b.id === boardId)),
      moduleCount: board.modules.length,
    });
  };

  const copySelected = (boardId: string, moduleId: string) => {
    const board = layout.boards.find((b) => b.id === boardId);
    const mod = board?.modules.find((m) => m.id === moduleId);
    if (!board || !mod || mod.locked || board.locked) return;
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
    if (!board || board.locked) return;
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

  const openPosterPicker = (boardId: string, moduleId: string) => {
    if (disabled || !onSetModulePoster) return;
    pendingPosterRef.current = { boardId, moduleId };
    const input = posterInputRef.current;
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
    if (board.locked) {
      setDropGhost(null);
      return;
    }
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
    if (board.locked) {
      toast.error("บอร์ดถูกล็อก — ปลดล็อกก่อนเพิ่มโมดูล");
      return;
    }
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
          // Isolate so module/board z-index (selection/crop chrome) cannot paint above Dialogs (z-50).
          "relative z-0 isolate overflow-auto rounded-xl border border-border/70 bg-muted/20 p-3 sm:p-4",
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
              boardCount={layout.boards.length}
              layout={layout}
              zoom={zoom}
              gridVisible={gridVisible}
              snapEnabled={snapEnabled}
              selected={selected}
              selection={selection}
              onSelectModule={selectModule}
              disabled={disabled || !!croppingModuleId}
              uploadingModuleId={uploadingModuleId}
              uploadStageLabel={uploadStageLabel}
              uploadStagePercent={uploadStagePercent}
              dropGhost={dropGhost?.boardId === board.id ? dropGhost : null}
              onDragOver={(e) => handleBoardDragOver(e, board)}
              onDragLeave={() => setDropGhost(null)}
              onDrop={(e) => handleBoardDrop(e, board)}
              onChangeModule={(moduleId, patch, live) => {
                if (board.locked) return;
                const next = updateModule(layout, board.id, moduleId, patch);
                if (live) onChange(next);
                else onCommit(next);
              }}
              onHistoryBegin={onHistoryBegin}
              onHistoryEnd={onHistoryEnd}
              onDeleteModule={(moduleId) => {
                const mod = board.modules.find((m) => m.id === moduleId);
                if (mod?.locked || board.locked) return;
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
              onSetPosterClick={openPosterPicker}
              onUploadFile={(moduleId, kind, files) => {
                if (board.locked) {
                  toast.error("บอร์ดถูกล็อก — ปลดล็อกก่อนอัปไฟล์");
                  return;
                }
                const file = pickFileForKind(kind, files);
                if (!file) {
                  toastWrongModuleFile(kind);
                  return;
                }
                submitModuleFile(board.id, moduleId, kind, file);
              }}
              croppingModuleId={croppingModuleId}
              onBeginCropModule={onBeginCropModule}
              onConfirmInlineCrop={onConfirmInlineCrop}
              onRestoreOriginalModule={onRestoreOriginalModule}
              onCancelInlineCrop={onCancelInlineCrop}
              inlineCropSaving={inlineCropSaving}
              renaming={renamingBoardId === board.id}
              onBeginRename={() => setRenamingBoardId(board.id)}
              onRename={(name) => renameBoard(board.id, name)}
              onCancelRename={() => setRenamingBoardId(null)}
              onToggleLock={() => toggleBoardLock(board.id)}
              onMoveUp={() => moveBoard(board.id, -1)}
              onMoveDown={() => moveBoard(board.id, 1)}
              onDeleteBoard={() => requestDeleteBoard(board.id)}
            />
          ))}

          <div className="flex items-stretch gap-2">
            <div className="w-[4.25rem] shrink-0 sm:w-20" aria-hidden />
            <button
              type="button"
              disabled={disabled || panMode || !!croppingModuleId}
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
        accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,.heic,.heif,.hif,image/*"
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
        ref={posterInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          const pending = pendingPosterRef.current;
          e.target.value = "";
          pendingPosterRef.current = null;
          if (!file || !pending) return;
          if (!/^image\//i.test(file.type) && !/\.(jpe?g|png|webp|heic|heif)$/i.test(file.name)) {
            toast.error("รองรับ JPG, PNG, WebP, HEIC");
            return;
          }
          onSetModulePoster?.(pending.boardId, pending.moduleId, file);
        }}
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

      <DeleteConfirmDialog
        open={!!pendingDeleteBoard}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteBoard(null);
        }}
        title={`ลบ ${pendingDeleteBoard?.name ?? "Board"}?`}
        description={
          pendingDeleteBoard && pendingDeleteBoard.moduleCount > 0
            ? `การลบ Board นี้จะลบโมดูลทั้งหมดใน board ด้วย (${pendingDeleteBoard.moduleCount} โมดูล) ไม่สามารถกู้คืนได้`
            : "ยืนยันลบ Board นี้หรือไม่"
        }
        confirmLabel="ลบ board"
        onConfirm={() => {
          if (!pendingDeleteBoard) return;
          onCommit({
            ...layout,
            boards: layout.boards.filter((b) => b.id !== pendingDeleteBoard.id),
          });
          onSelectionChange(selection.filter((s) => s.boardId !== pendingDeleteBoard.id));
          setPendingDeleteBoard(null);
        }}
      />
    </div>
  );
}

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
