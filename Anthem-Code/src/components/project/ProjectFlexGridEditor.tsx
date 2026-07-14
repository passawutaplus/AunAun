import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowDown,
  ArrowDownRight,
  ArrowUp,
  Bold,
  ChevronsDown,
  ChevronsUp,
  Copy,
  Film,
  Image as ImageIcon,
  ImagePlus,
  Italic,
  Loader2,
  Move,
  Plus,
  Strikethrough,
  Trash2,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Hand,
  Lock,
  LockOpen,
} from "lucide-react";
import { Fragment, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState, forwardRef, type DragEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
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
import { PROJECT_VIDEO_ACCEPT, isVideoFile } from "@/lib/videoAccept";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

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
  onUploadToModule?: (boardId: string, moduleId: string, file: File) => void;
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
  onUploadToModule,
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
  const videoInputRef = useRef<HTMLInputElement>(null);
  const pendingUploadRef = useRef<{ boardId: string; moduleId: string; kind: "image" | "video" } | null>(
    null,
  );

  const placeModule = useCallback(
    (type: FlexGridModuleType, boardId: string, xRaw: number, yRaw: number) => {
      const board = layout.boards.find((b) => b.id === boardId);
      if (!board) return;
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
    },
    [layout, onCommit, selectModule, snapEnabled],
  );

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

  const openUpload = (boardId: string, moduleId: string, type: "image" | "video") => {
    if (disabled || !onUploadToModule) return;
    pendingUploadRef.current = { boardId, moduleId, kind: type };
    const input = type === "video" ? videoInputRef.current : imageInputRef.current;
    if (!input) return;
    input.value = "";
    input.click();
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>, kind: "image" | "video") => {
    const file = e.target.files?.[0];
    const pending = pendingUploadRef.current;
    e.target.value = "";
    pendingUploadRef.current = null;
    if (!file || !pending || pending.kind !== kind) return;
    if (kind === "video" && !isVideoFile(file)) {
      toast.error("โมดูลวิดีโอรับเฉพาะไฟล์วิดีโอ");
      return;
    }
    if (kind === "image" && file.type.startsWith("video/")) {
      toast.error("โมดูลภาพรับเฉพาะไฟล์รูปภาพ");
      return;
    }
    onUploadToModule?.(pending.boardId, pending.moduleId, file);
  };

  const handleBoardDragOver = (e: DragEvent, board: FlexGridBoard) => {
    const raw =
      activeFlexGridDragType ||
      e.dataTransfer.getData(FLEX_GRID_TOOL_MIME) ||
      e.dataTransfer.getData("text/plain");
    const probeType: FlexGridModuleType =
      raw === "image" || raw === "text" || raw === "video" ? raw : "text";
    if (
      !activeFlexGridDragType &&
      !e.dataTransfer.types.includes(FLEX_GRID_TOOL_MIME) &&
      !e.dataTransfer.types.includes("text/plain")
    ) {
      return;
    }
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
    const raw =
      activeFlexGridDragType ||
      e.dataTransfer.getData(FLEX_GRID_TOOL_MIME) ||
      e.dataTransfer.getData("text/plain");
    if (raw !== "image" && raw !== "text" && raw !== "video") return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const mx = (e.clientX - rect.left) / zoom;
    const my = (e.clientY - rect.top) / zoom;
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
              snapEnabled={snapEnabled}
              uploadingModuleId={uploadingModuleId}
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
  onUploadClick: (boardId: string, moduleId: string, type: "image" | "video") => void;
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
                if (mod.type === "image" || mod.type === "video") {
                  onUploadClick(board.id, mod.id, mod.type);
                }
              }}
            />
          ))}
        </div>
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
  onSelect,
  onChange,
  onHistoryBegin,
  onHistoryEnd,
  onDelete,
  onArrange,
  onCopy,
  onUploadClick,
}: {
  module: FlexGridModule;
  board: FlexGridBoard;
  layout: FlexGridLayout;
  selected: boolean;
  inSelection: boolean;
  disabled?: boolean;
  snapEnabled: boolean;
  uploading?: boolean;
  onSelect: (additive?: boolean) => void;
  onChange: (patch: Partial<FlexGridModule>, live?: boolean) => void;
  onHistoryBegin: () => void;
  onHistoryEnd: () => void;
  onDelete: () => void;
  onArrange: (act: "front" | "forward" | "backward" | "back") => void;
  onCopy: () => void;
  onUploadClick: () => void;
}) {
  const ctx = boardCtx(layout, board);
  const textEditorRef = useRef<TextModuleBodyHandle>(null);
  const locked = !!module.locked;

  const onMovePointerDown = (e: ReactPointerEvent) => {
    if (disabled || locked) return;
    const el = e.target as HTMLElement;
    if (el.closest("[contenteditable], input, textarea")) return;
    if (el.closest("button") && !el.closest("[data-flex-move-handle]")) return;
    e.preventDefault();
    e.stopPropagation();
    onSelect(e.ctrlKey || e.metaKey);
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
        zIndex: module.z,
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(e.ctrlKey || e.metaKey);
      }}
    >
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

      <div
        className={cn(
          "relative h-full w-full overflow-hidden",
          module.type === "text"
            ? selected || inSelection
              ? "border border-primary bg-card shadow-sm ring-2 ring-primary/30"
              : "border border-transparent bg-transparent shadow-none"
            : cn(
                "border bg-card shadow-sm",
                selected || inSelection
                  ? "border-primary ring-2 ring-primary/30"
                  : "border-border/80",
              ),
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
                  <button
                    type="button"
                    title="เปลี่ยนภาพ"
                    aria-label="เปลี่ยนภาพ"
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
                    <ImagePlus className="h-3.5 w-3.5" strokeWidth={2} />
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
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
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

          {module.type === "video" ? (
            module.url ? (
              <div className="relative h-full w-full bg-black">
                <video src={module.url} className="h-full w-full object-cover" muted playsInline />
                <button
                  type="button"
                  className="absolute inset-0 flex items-center justify-center bg-black/20 text-white"
                  onClick={(e) => {
                    e.stopPropagation();
                    onUploadClick();
                  }}
                  title="เปลี่ยนวิดีโอ"
                >
                  <Film className="h-7 w-7" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onUploadClick();
                }}
                className="flex h-full w-full flex-col items-center justify-center gap-1 bg-muted/40 text-muted-foreground hover:bg-muted/60"
              >
                {uploading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <Film className="h-6 w-6" strokeWidth={1.4} />
                    <span className="text-[10px]">เลือกวิดีโอ</span>
                  </>
                )}
              </button>
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
            <div className="absolute inset-0 flex items-center justify-center bg-background/60">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
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

function FlexTextFormatToolbar({
  onCommand,
  className,
}: {
  onCommand: (cmd: string) => void;
  className?: string;
}) {
  const btn = (
    label: string,
    cmd: string,
    icon: ReactNode,
  ) => (
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
        "flex items-center gap-0.5 rounded-md border border-border/60 bg-card/95 px-1 py-0.5 shadow-sm",
        className,
      )}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {btn("ตัวหนา", "bold", <Bold className="h-3.5 w-3.5" />)}
      {btn("ตัวเอียง", "italic", <Italic className="h-3.5 w-3.5" />)}
      {btn("ขีดเส้นใต้", "underline", <Underline className="h-3.5 w-3.5" />)}
      {btn("ขีดกลาง", "strikeThrough", <Strikethrough className="h-3.5 w-3.5" />)}
      <span className="mx-0.5 h-3.5 w-px shrink-0 bg-border" aria-hidden />
      {btn("ชิดซ้าย", "justifyLeft", <AlignLeft className="h-3.5 w-3.5" />)}
      {btn("กึ่งกลาง", "justifyCenter", <AlignCenter className="h-3.5 w-3.5" />)}
      {btn("ชิดขวา", "justifyRight", <AlignRight className="h-3.5 w-3.5" />)}
    </div>
  );
}

type TextModuleBodyHandle = {
  applyCommand: (cmd: string) => void;
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

  useImperativeHandle(ref, () => ({
    applyCommand(cmd: string) {
      const el = editorRef.current;
      if (!el || disabled) return;
      el.focus();
      try {
        document.execCommand("styleWithCSS", false, "false");
      } catch {
        /* ignore */
      }
      document.execCommand(cmd, false);
      onCommit(el.innerHTML);
    },
  }));

  return (
    <div
      ref={editorRef}
      className={cn(
        "h-full w-full overflow-auto text-sm leading-relaxed outline-none",
        "[&_p]:my-0 [&_p+p]:mt-1.5",
        "bg-transparent text-foreground",
        editing ? "p-3" : "p-1",
      )}
      contentEditable={!disabled}
      suppressContentEditableWarning
      onBlur={(e) => onCommit(e.currentTarget.innerHTML)}
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
