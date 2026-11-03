import { ArrowDown, ArrowUp, Trash2, Lock, LockOpen, Pencil } from "lucide-react";
import { Fragment, type DragEvent } from "react";
import { flexGridBoardDomId } from "@/components/project/FlexGridToolsSidebar";
import type { FlexGridLayerRef } from "@/components/project/FlexGridToolsSidebar";
import {
  boardDisplayName,
  colStart,
  colWidth,
  rowStart,
  type FlexGridBoard,
  type FlexGridLayout,
  type FlexGridModule,
} from "@/lib/flexGridLayout";
import type { FlexGridInlineCropResult } from "@/components/project/FlexGridInlineCrop";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ModuleUploadKind } from "@/components/project/flexGrid/moduleFiles";
import { boardCtx } from "@/components/project/flexGrid/flexGridEditorUtils";
import { BoardGutterBtn } from "@/components/project/flexGrid/FlexGridButtons";
import { PlacedModule } from "@/components/project/flexGrid/PlacedModule";

/** One board of the Full Grid canvas: drop target, grid overlay, gutter controls and its placed modules. */
export function BoardSurface({
  board,
  boardIndex,
  boardCount,
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
  onSetPosterClick,
  onUploadFile,
  croppingModuleId,
  onBeginCropModule,
  onConfirmInlineCrop,
  onRestoreOriginalModule,
  onCancelInlineCrop,
  inlineCropSaving,
  renaming,
  onBeginRename,
  onRename,
  onCancelRename,
  onToggleLock,
  onMoveUp,
  onMoveDown,
  onDeleteBoard,
}: {
  board: FlexGridBoard;
  boardIndex: number;
  boardCount: number;
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
  onSetPosterClick?: (boardId: string, moduleId: string) => void;
  onUploadFile: (moduleId: string, kind: ModuleUploadKind, files: FileList) => void;
  croppingModuleId?: string | null;
  onBeginCropModule?: (boardId: string, moduleId: string, imageUrl: string) => void;
  onConfirmInlineCrop?: (
    boardId: string,
    moduleId: string,
    result: FlexGridInlineCropResult,
  ) => void;
  onRestoreOriginalModule?: (boardId: string, moduleId: string) => void;
  onCancelInlineCrop?: () => void;
  inlineCropSaving?: boolean;
  renaming?: boolean;
  onBeginRename: () => void;
  onRename: (name: string) => void;
  onCancelRename: () => void;
  onToggleLock: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDeleteBoard: () => void;
}) {
  const ctx = boardCtx(layout, board);
  const cw = colWidth(ctx);
  const title = boardDisplayName(board, boardIndex);
  const boardLocked = !!board.locked;
  const boardIsCropping =
    !!croppingModuleId && board.modules.some((m) => m.id === croppingModuleId);
  const boardHasSelection = selection.some((s) => s.boardId === board.id);
  // Module toolbars / crop chrome stick out past the board edge — lift this board
  // above neighbors so chrome isn't painted under the board below.
  const boardElevated = boardIsCropping || boardHasSelection;

  return (
    <div
      id={flexGridBoardDomId(board.id)}
      className="relative flex scroll-mt-3 items-stretch gap-2"
      style={{
        zIndex: boardElevated ? 80 : boardIndex + 1,
      }}
    >
      <div className="flex w-[4.25rem] shrink-0 flex-col items-end gap-1.5 pt-2 sm:w-20">
        {renaming ? (
          <input
            autoFocus
            defaultValue={board.name?.trim() || title}
            className="w-full rounded border border-border bg-card px-1 py-0.5 text-right text-[10px] font-semibold text-foreground outline-none ring-1 ring-primary/40"
            aria-label={`ชื่อ ${title}`}
            onBlur={(e) => onRename(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
              if (e.key === "Escape") onCancelRename();
            }}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span
            className={cn(
              "max-w-full truncate text-right text-[10px] font-semibold uppercase tracking-wide text-muted-foreground",
              boardLocked && "text-primary",
            )}
            title={title}
          >
            {title}
          </span>
        )}
        {!disabled ? (
          <div className="flex flex-col items-end gap-0.5">
            <BoardGutterBtn
              title={boardLocked ? "ปลดล็อกบอร์ด" : "ล็อกบอร์ด"}
              active={boardLocked}
              onClick={onToggleLock}
            >
              {boardLocked ? (
                <Lock className="h-3 w-3" strokeWidth={2.2} />
              ) : (
                <LockOpen className="h-3 w-3" strokeWidth={2.2} />
              )}
            </BoardGutterBtn>
            <BoardGutterBtn
              title="แก้ไขชื่อบอร์ด"
              disabled={boardLocked}
              onClick={onBeginRename}
            >
              <Pencil className="h-3 w-3" strokeWidth={2.2} />
            </BoardGutterBtn>
            <BoardGutterBtn
              title="ย้ายบอร์ดขึ้น"
              disabled={boardIndex <= 0}
              onClick={onMoveUp}
            >
              <ArrowUp className="h-3 w-3" strokeWidth={2.2} />
            </BoardGutterBtn>
            <BoardGutterBtn
              title="ย้ายบอร์ดลง"
              disabled={boardIndex >= boardCount - 1}
              onClick={onMoveDown}
            >
              <ArrowDown className="h-3 w-3" strokeWidth={2.2} />
            </BoardGutterBtn>
            <BoardGutterBtn
              title="ลบบอร์ด"
              danger
              disabled={boardCount <= 1 || boardLocked}
              onClick={onDeleteBoard}
            >
              <Trash2 className="h-3 w-3" strokeWidth={2.2} />
            </BoardGutterBtn>
          </div>
        ) : null}
      </div>
      <div
        className={cn(
          "relative overflow-visible border-x border-b border-border bg-background",
          boardIndex === 0 && "border-t",
          boardElevated && "z-10",
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
            zIndex: boardElevated ? 20 : undefined,
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
              {boardLocked ? "บอร์ดถูกล็อก" : "ลากโมดูลจากแถบซ้ายมาวางที่นี่"}
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
              module={
                boardLocked && !mod.locked ? { ...mod, locked: true } : mod
              }
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
                if (boardLocked) {
                  toast.error("บอร์ดถูกล็อก — ปลดล็อกก่อนแก้ไข");
                  return;
                }
                if (
                  mod.type === "image" ||
                  mod.type === "gif" ||
                  mod.type === "video" ||
                  mod.type === "model3d"
                ) {
                  onUploadClick(board.id, mod.id, mod.type);
                }
              }}
              onSetPosterClick={
                mod.type === "video" && onSetPosterClick
                  ? () => {
                      if (boardLocked) {
                        toast.error("บอร์ดถูกล็อก — ปลดล็อกก่อนแก้ไข");
                        return;
                      }
                      onSetPosterClick(board.id, mod.id);
                    }
                  : undefined
              }
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
              cropping={croppingModuleId === mod.id}
              onBeginCrop={
                mod.type === "image" && mod.url && onBeginCropModule && !boardLocked
                  ? () => onBeginCropModule(board.id, mod.id, mod.url!)
                  : undefined
              }
              onConfirmInlineCrop={
                onConfirmInlineCrop
                  ? (result) => onConfirmInlineCrop(board.id, mod.id, result)
                  : undefined
              }
              onRestoreOriginal={
                onRestoreOriginalModule
                  ? () => onRestoreOriginalModule(board.id, mod.id)
                  : undefined
              }
              onCancelInlineCrop={onCancelInlineCrop}
              inlineCropSaving={inlineCropSaving && croppingModuleId === mod.id}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
