import { sanitizeProjectRichText } from "@/lib/projectRichText";
import {
  blockImageUrls,
  PROJECT_BLOCK_BODY_MAX,
  type ProjectContentBlock,
} from "@/lib/projectContentBlocks";
import type { PortfolioMediaItem } from "@/lib/portfolioMedia";

export type ProjectEditorMode = "casual" | "flex_grid";

export type FlexGridModuleType = "image" | "text" | "video";

export type FlexGridModule = {
  id: string;
  type: FlexGridModuleType;
  x: number;
  y: number;
  w: number;
  h: number;
  z: number;
  /** image / video storage URL */
  url?: string;
  /** text module HTML (sanitized) */
  text?: string;
  bgTransparent?: boolean;
  name?: string;
  /** When true, module cannot be moved/resized/deleted */
  locked?: boolean;
};

export type FlexGridBoard = {
  id: string;
  height: number;
  name?: string;
  modules: FlexGridModule[];
};

export type FlexGridSettings = {
  columns: number;
  colGap: number;
  colMargin: number;
  rows: number;
  rowGap: number;
  rowMargin: number;
};

export type FlexGridLayout = {
  version: 1;
  canvasWidth: number;
  grid: FlexGridSettings;
  boards: FlexGridBoard[];
};

export const FLEX_GRID_CANVAS_WIDTH = 780;
export const FLEX_GRID_CANVAS_HEIGHT = 700;
export const FLEX_GRID_FALLBACK_ROW_UNIT = 20;

export const FLEX_GRID_MODULE_DEFAULTS: Record<
  FlexGridModuleType,
  { spanCols: number; spanRows: number; label: string }
> = {
  image: { spanCols: 4, spanRows: 8, label: "IMAGE" },
  text: { spanCols: 6, spanRows: 5, label: "TEXT" },
  video: { spanCols: 6, spanRows: 10, label: "VIDEO" },
};

export const FLEX_GRID_PRESETS: Record<string, FlexGridSettings> = {
  col12: { columns: 12, colGap: 16, colMargin: 24, rows: 0, rowGap: 0, rowMargin: 0 },
  grid6x6: { columns: 6, colGap: 12, colMargin: 24, rows: 6, rowGap: 12, rowMargin: 24 },
  grid4x4: { columns: 4, colGap: 16, colMargin: 24, rows: 4, rowGap: 16, rowMargin: 24 },
};

export const FLEX_GRID_PRESET_META: {
  key: keyof typeof FLEX_GRID_PRESETS;
  badge: string;
  label: string;
  kind: "columns" | "grid";
  wireCols: number;
  wireRows: number;
}[] = [
  { key: "col12", badge: "12", label: "12 Columns", kind: "columns", wireCols: 4, wireRows: 1 },
  { key: "grid6x6", badge: "6×6", label: "6×6 Grid", kind: "grid", wireCols: 6, wireRows: 6 },
  { key: "grid4x4", badge: "4×4", label: "4×4 Grid", kind: "grid", wireCols: 4, wireRows: 4 },
];

function newId(): string {
  return crypto.randomUUID();
}

export function defaultFlexGridSettings(): FlexGridSettings {
  return { ...FLEX_GRID_PRESETS.col12 };
}

export function createEmptyFlexGridBoard(
  height = FLEX_GRID_CANVAS_HEIGHT,
  name?: string,
): FlexGridBoard {
  return { id: newId(), height, name: name?.trim() || undefined, modules: [] };
}

export function boardDisplayName(board: FlexGridBoard, index: number): string {
  const custom = board.name?.trim();
  if (custom) return custom;
  return `Board ${index + 1}`;
}

export function defaultFlexGridLayout(): FlexGridLayout {
  return {
    version: 1,
    canvasWidth: FLEX_GRID_CANVAS_WIDTH,
    grid: defaultFlexGridSettings(),
    boards: [createEmptyFlexGridBoard(undefined, "Board 1")],
  };
}

export function parseEditorMode(raw: unknown): ProjectEditorMode {
  return raw === "flex_grid" ? "flex_grid" : "casual";
}

function clampNum(n: unknown, min: number, max: number, fallback: number): number {
  const v = typeof n === "number" && Number.isFinite(n) ? n : fallback;
  return Math.max(min, Math.min(max, v));
}

function parseModule(raw: unknown): FlexGridModule | null {
  if (!raw || typeof raw !== "object") return null;
  const m = raw as Record<string, unknown>;
  const type = m.type === "image" || m.type === "text" || m.type === "video" ? m.type : null;
  if (!type) return null;
  return {
    id: typeof m.id === "string" && m.id ? m.id : newId(),
    type,
    x: clampNum(m.x, 0, 4000, 0),
    y: clampNum(m.y, 0, 4000, 0),
    w: clampNum(m.w, 20, 4000, 160),
    h: clampNum(m.h, 20, 4000, 100),
    z: clampNum(m.z, 0, 10000, 10),
    url: typeof m.url === "string" ? m.url : undefined,
    text: typeof m.text === "string" ? m.text : undefined,
    bgTransparent: m.bgTransparent === true,
    name: typeof m.name === "string" ? m.name : undefined,
    locked: m.locked === true,
  };
}

function parseBoard(raw: unknown): FlexGridBoard | null {
  if (!raw || typeof raw !== "object") return null;
  const b = raw as Record<string, unknown>;
  const modules = Array.isArray(b.modules)
    ? b.modules.map(parseModule).filter((m): m is FlexGridModule => !!m)
    : [];
  return {
    id: typeof b.id === "string" && b.id ? b.id : newId(),
    height: clampNum(b.height, 200, 4000, FLEX_GRID_CANVAS_HEIGHT),
    name: typeof b.name === "string" && b.name.trim() ? b.name.trim() : undefined,
    modules,
  };
}

export function parseFlexGridLayout(raw: unknown): FlexGridLayout {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return defaultFlexGridLayout();
  }
  const root = raw as Record<string, unknown>;
  const keys = Object.keys(root);
  if (keys.length === 0) return defaultFlexGridLayout();

  const gridRaw = root.grid && typeof root.grid === "object" ? (root.grid as Record<string, unknown>) : {};
  const grid: FlexGridSettings = {
    columns: clampNum(gridRaw.columns, 1, 16, 12),
    colGap: clampNum(gridRaw.colGap, 0, 60, 16),
    colMargin: clampNum(gridRaw.colMargin, 0, 100, 24),
    rows: clampNum(gridRaw.rows, 0, 24, 0),
    rowGap: clampNum(gridRaw.rowGap, 0, 60, 0),
    rowMargin: clampNum(gridRaw.rowMargin, 0, 100, 0),
  };

  const boards = Array.isArray(root.boards)
    ? root.boards.map(parseBoard).filter((b): b is FlexGridBoard => !!b)
    : [];

  return {
    version: 1,
    canvasWidth: clampNum(root.canvasWidth, 320, 1600, FLEX_GRID_CANVAS_WIDTH),
    grid,
    boards: boards.length > 0 ? boards : [createEmptyFlexGridBoard()],
  };
}

export function toStoredFlexGridLayout(layout: FlexGridLayout): FlexGridLayout {
  return {
    version: 1,
    canvasWidth: layout.canvasWidth || FLEX_GRID_CANVAS_WIDTH,
    grid: { ...layout.grid },
    boards: layout.boards.map((b) => ({
      id: b.id,
      height: b.height,
      ...(b.name?.trim() ? { name: b.name.trim() } : {}),
      modules: b.modules.map((m) => {
        const out: FlexGridModule = {
          id: m.id,
          type: m.type,
          x: Math.round(m.x),
          y: Math.round(m.y),
          w: Math.round(m.w),
          h: Math.round(m.h),
          z: m.z,
        };
        if (m.type === "text") {
          const text = sanitizeProjectRichText(m.text ?? "").slice(0, PROJECT_BLOCK_BODY_MAX);
          if (text) out.text = text;
          if (m.bgTransparent) out.bgTransparent = true;
        } else if (m.url?.trim()) {
          out.url = m.url.trim();
        }
        if (m.name?.trim()) out.name = m.name.trim();
        if (m.locked) out.locked = true;
        return out;
      }),
    })),
  };
}

export function flexGridHasContent(layout: FlexGridLayout | null | undefined): boolean {
  if (!layout) return false;
  return layout.boards.some((b) =>
    b.modules.some((m) => {
      if (m.type === "text") return !!(m.text?.trim());
      return !!(m.url?.trim());
    }),
  );
}

export function flexGridModuleCount(layout: FlexGridLayout): number {
  return layout.boards.reduce((n, b) => n + b.modules.length, 0);
}

export function flexGridMediaItems(layout: FlexGridLayout): PortfolioMediaItem[] {
  const out: PortfolioMediaItem[] = [];
  for (const board of layout.boards) {
    for (const m of board.modules) {
      if (m.type !== "image" && m.type !== "video") continue;
      const url = (m.url ?? "").trim();
      if (!url) continue;
      out.push({ id: m.id, kind: m.type, url });
    }
  }
  return out;
}

export function splitMediaFromFlexGrid(layout: FlexGridLayout): {
  gallery_urls: string[];
  video_urls: string[];
} {
  const items = flexGridMediaItems(layout);
  return {
    gallery_urls: items.map((m) => m.url),
    video_urls: items.filter((m) => m.kind === "video").map((m) => m.url),
  };
}

/* ---------- snap math (ported from prototype) ---------- */

export type FlexGridSnapContext = {
  canvasWidth: number;
  canvasHeight: number;
  grid: FlexGridSettings;
};

function rowsActive(grid: FlexGridSettings): boolean {
  return grid.rows > 0;
}

export function colWidth(ctx: FlexGridSnapContext): number {
  const { canvasWidth, grid } = ctx;
  return (canvasWidth - grid.colMargin * 2 - grid.colGap * (grid.columns - 1)) / grid.columns;
}

export function colStart(ctx: FlexGridSnapContext, i: number): number {
  return ctx.grid.colMargin + i * (colWidth(ctx) + ctx.grid.colGap);
}

export function rowHeight(ctx: FlexGridSnapContext): number {
  const { canvasHeight, grid } = ctx;
  if (!rowsActive(grid) || grid.rows <= 0) return FLEX_GRID_FALLBACK_ROW_UNIT;
  return (canvasHeight - grid.rowMargin * 2 - grid.rowGap * (grid.rows - 1)) / grid.rows;
}

export function effectiveRowUnit(ctx: FlexGridSnapContext): number {
  return rowsActive(ctx.grid) ? rowHeight(ctx) : FLEX_GRID_FALLBACK_ROW_UNIT;
}

export function rowStart(ctx: FlexGridSnapContext, i: number): number {
  return ctx.grid.rowMargin + i * (rowHeight(ctx) + ctx.grid.rowGap);
}

export function snapX(ctx: FlexGridSnapContext, px: number): number {
  const cw = colWidth(ctx);
  let idx = Math.round((px - ctx.grid.colMargin) / (cw + ctx.grid.colGap));
  idx = Math.max(0, Math.min(ctx.grid.columns - 1, idx));
  return colStart(ctx, idx);
}

export function snapWidth(ctx: FlexGridSnapContext, px: number, startX: number): number {
  const cw = colWidth(ctx);
  const startIdx = Math.round((startX - ctx.grid.colMargin) / (cw + ctx.grid.colGap));
  let n = Math.round((px + ctx.grid.colGap) / (cw + ctx.grid.colGap));
  n = Math.max(1, Math.min(ctx.grid.columns - startIdx, n));
  return n * cw + (n - 1) * ctx.grid.colGap;
}

export function snapY(ctx: FlexGridSnapContext, px: number): number {
  if (!rowsActive(ctx.grid)) {
    return Math.max(0, Math.round(px / FLEX_GRID_FALLBACK_ROW_UNIT) * FLEX_GRID_FALLBACK_ROW_UNIT);
  }
  const rh = rowHeight(ctx);
  let idx = Math.round((px - ctx.grid.rowMargin) / (rh + ctx.grid.rowGap));
  idx = Math.max(0, Math.min(ctx.grid.rows - 1, idx));
  return rowStart(ctx, idx);
}

export function snapHeight(ctx: FlexGridSnapContext, px: number, startY: number): number {
  if (!rowsActive(ctx.grid)) {
    return Math.max(
      FLEX_GRID_FALLBACK_ROW_UNIT * 2,
      Math.round(px / FLEX_GRID_FALLBACK_ROW_UNIT) * FLEX_GRID_FALLBACK_ROW_UNIT,
    );
  }
  const rh = rowHeight(ctx);
  const startIdx = Math.round((startY - ctx.grid.rowMargin) / (rh + ctx.grid.rowGap));
  let n = Math.round((px + ctx.grid.rowGap) / (rh + ctx.grid.rowGap));
  n = Math.max(1, Math.min(ctx.grid.rows - startIdx, n));
  return n * rh + (n - 1) * ctx.grid.rowGap;
}

export function defaultModuleSize(
  type: FlexGridModuleType,
  ctx: FlexGridSnapContext,
): { w: number; h: number } {
  const def = FLEX_GRID_MODULE_DEFAULTS[type];
  const cw = colWidth(ctx);
  const rh = effectiveRowUnit(ctx);
  const w = def.spanCols * cw + (def.spanCols - 1) * ctx.grid.colGap;
  const h = def.spanRows * rh + (def.spanRows - 1) * ctx.grid.rowGap;
  return { w, h };
}

export function createFlexGridModule(
  type: FlexGridModuleType,
  ctx: FlexGridSnapContext,
  xRaw: number,
  yRaw: number,
  extras?: Partial<Pick<FlexGridModule, "url" | "text" | "name" | "z">> & { snap?: boolean },
): FlexGridModule {
  const size = defaultModuleSize(type, ctx);
  const snap = extras?.snap !== false;
  let x = xRaw - size.w / 2;
  let y = yRaw - size.h / 2;
  let w = size.w;
  let h = size.h;
  if (snap) {
    x = snapX(ctx, x);
    w = snapWidth(ctx, w, x);
    y = snapY(ctx, y);
    h = snapHeight(ctx, h, y);
  } else {
    x = Math.max(0, Math.min(ctx.canvasWidth - w, x));
    y = Math.max(0, Math.min(ctx.canvasHeight - h, y));
  }
  return {
    id: newId(),
    type,
    x,
    y,
    w,
    h,
    z: extras?.z ?? 10,
    url: extras?.url,
    text: extras?.text,
    name: extras?.name,
  };
}

export function nextZIndex(board: FlexGridBoard): number {
  if (!board.modules.length) return 10;
  return Math.max(...board.modules.map((m) => m.z)) + 1;
}

export function reSnapLayout(layout: FlexGridLayout): FlexGridLayout {
  return {
    ...layout,
    boards: layout.boards.map((board) => {
      const ctx: FlexGridSnapContext = {
        canvasWidth: layout.canvasWidth,
        canvasHeight: board.height,
        grid: layout.grid,
      };
      return {
        ...board,
        modules: board.modules.map((m) => {
          const x = snapX(ctx, m.x);
          const w = snapWidth(ctx, m.w, x);
          const y = snapY(ctx, m.y);
          const h = snapHeight(ctx, m.h, y);
          return { ...m, x, y, w, h };
        }),
      };
    }),
  };
}

/** Best-effort Casual → Flex Grid conversion (stacks modules on first board). */
export function contentBlocksToFlexGrid(blocks: ProjectContentBlock[]): FlexGridLayout {
  const layout = defaultFlexGridLayout();
  const board = layout.boards[0];
  const ctx: FlexGridSnapContext = {
    canvasWidth: layout.canvasWidth,
    canvasHeight: board.height,
    grid: layout.grid,
  };

  let cursorY = 40;
  let z = 10;
  const modules: FlexGridModule[] = [];

  const place = (
    type: FlexGridModuleType,
    extras: Partial<Pick<FlexGridModule, "url" | "text" | "name">>,
  ) => {
    const size = defaultModuleSize(type, ctx);
    const x = snapX(ctx, ctx.grid.colMargin);
    const w = snapWidth(ctx, size.w, x);
    const y = snapY(ctx, cursorY);
    const h = snapHeight(ctx, size.h, y);
    modules.push({
      id: newId(),
      type,
      x,
      y,
      w,
      h,
      z: z++,
      ...extras,
    });
    cursorY = y + h + 24;
    if (cursorY + 80 > board.height) {
      board.height = Math.min(4000, Math.ceil((cursorY + 200) / 100) * 100);
      ctx.canvasHeight = board.height;
    }
  };

  for (const block of blocks) {
    if (block.type === "heading" || block.type === "heading_body" || block.type === "body") {
      const parts: string[] = [];
      if (block.heading?.trim()) parts.push(`<strong>${block.heading.trim()}</strong>`);
      if (block.body?.trim()) parts.push(block.body.trim());
      const text = sanitizeProjectRichText(parts.join("<br/>")).slice(0, PROJECT_BLOCK_BODY_MAX);
      if (!text.trim()) continue;
      place("text", { text });
      continue;
    }

    if (block.type === "video") {
      const url = (block.url ?? "").trim();
      if (!url) continue;
      place("video", { url });
      continue;
    }

    if (block.type === "image_text") {
      const url = (block.url ?? "").trim();
      if (url) place("image", { url });
      const text = sanitizeProjectRichText(block.body ?? "").slice(0, PROJECT_BLOCK_BODY_MAX);
      if (text.trim()) place("text", { text });
      continue;
    }

    if (block.type === "image") {
      const urls = blockImageUrls(block).map((u) => u.trim()).filter(Boolean);
      for (const url of urls) {
        place("image", { url });
      }
    }
  }

  board.modules = modules;
  return layout;
}

export function gridSettingsSummary(grid: FlexGridSettings): string {
  const parts = [`${grid.columns} columns`];
  if (grid.rows > 0) parts.push(`${grid.rows} rows`);
  parts.push(`${grid.colGap}px gutter`);
  return parts.join(" · ");
}

export function duplicateFlexBoard(
  layout: FlexGridLayout,
  boardId: string,
): { layout: FlexGridLayout; newBoardId: string } | null {
  const idx = layout.boards.findIndex((b) => b.id === boardId);
  if (idx < 0) return null;
  const src = layout.boards[idx];
  const copy: FlexGridBoard = {
    id: newId(),
    height: src.height,
    name: src.name?.trim() ? `${src.name.trim()} copy` : undefined,
    modules: src.modules.map((m) => ({
      ...m,
      id: newId(),
    })),
  };
  const boards = [...layout.boards];
  boards.splice(idx + 1, 0, copy);
  return { layout: { ...layout, boards }, newBoardId: copy.id };
}

export function setModuleLocked(
  layout: FlexGridLayout,
  boardId: string,
  moduleId: string,
  locked: boolean,
): FlexGridLayout {
  return {
    ...layout,
    boards: layout.boards.map((b) =>
      b.id !== boardId
        ? b
        : {
            ...b,
            modules: b.modules.map((m) =>
              m.id === moduleId ? { ...m, locked: locked || undefined } : m,
            ),
          },
    ),
  };
}

export type FlexAlignKind = "left" | "center" | "right" | "top" | "middle" | "bottom";
export type FlexDistributeKind = "horizontal" | "vertical";

export function alignFlexModules(
  layout: FlexGridLayout,
  boardId: string,
  moduleIds: string[],
  kind: FlexAlignKind,
): FlexGridLayout {
  const board = layout.boards.find((b) => b.id === boardId);
  if (!board || moduleIds.length < 2) return layout;
  const idSet = new Set(moduleIds);
  const targets = board.modules.filter((m) => idSet.has(m.id) && !m.locked);
  if (targets.length < 2) return layout;

  const left = Math.min(...targets.map((m) => m.x));
  const right = Math.max(...targets.map((m) => m.x + m.w));
  const top = Math.min(...targets.map((m) => m.y));
  const bottom = Math.max(...targets.map((m) => m.y + m.h));
  const midX = (left + right) / 2;
  const midY = (top + bottom) / 2;

  const patch = new Map<string, Partial<FlexGridModule>>();
  for (const m of targets) {
    if (kind === "left") patch.set(m.id, { x: left });
    else if (kind === "right") patch.set(m.id, { x: right - m.w });
    else if (kind === "center") patch.set(m.id, { x: midX - m.w / 2 });
    else if (kind === "top") patch.set(m.id, { y: top });
    else if (kind === "bottom") patch.set(m.id, { y: bottom - m.h });
    else patch.set(m.id, { y: midY - m.h / 2 });
  }

  return {
    ...layout,
    boards: layout.boards.map((b) =>
      b.id !== boardId
        ? b
        : {
            ...b,
            modules: b.modules.map((m) => {
              const p = patch.get(m.id);
              return p ? { ...m, ...p } : m;
            }),
          },
    ),
  };
}

export function distributeFlexModules(
  layout: FlexGridLayout,
  boardId: string,
  moduleIds: string[],
  kind: FlexDistributeKind,
): FlexGridLayout {
  const board = layout.boards.find((b) => b.id === boardId);
  if (!board || moduleIds.length < 3) return layout;
  const idSet = new Set(moduleIds);
  const targets = board.modules.filter((m) => idSet.has(m.id) && !m.locked);
  if (targets.length < 3) return layout;

  const sorted =
    kind === "horizontal"
      ? [...targets].sort((a, b) => a.x - b.x || a.y - b.y)
      : [...targets].sort((a, b) => a.y - b.y || a.x - b.x);

  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const patch = new Map<string, Partial<FlexGridModule>>();

  if (kind === "horizontal") {
    const span = last.x + last.w - first.x;
    const totalW = sorted.reduce((s, m) => s + m.w, 0);
    const gap = (span - totalW) / (sorted.length - 1);
    let cursor = first.x;
    for (const m of sorted) {
      patch.set(m.id, { x: cursor });
      cursor += m.w + gap;
    }
  } else {
    const span = last.y + last.h - first.y;
    const totalH = sorted.reduce((s, m) => s + m.h, 0);
    const gap = (span - totalH) / (sorted.length - 1);
    let cursor = first.y;
    for (const m of sorted) {
      patch.set(m.id, { y: cursor });
      cursor += m.h + gap;
    }
  }

  return {
    ...layout,
    boards: layout.boards.map((b) =>
      b.id !== boardId
        ? b
        : {
            ...b,
            modules: b.modules.map((m) => {
              const p = patch.get(m.id);
              return p ? { ...m, ...p } : m;
            }),
          },
    ),
  };
}
