import type { FlexGridBoard, FlexGridLayout, FlexGridModule, FlexGridSnapContext } from "@/lib/flexGridLayout";

/** Pure layout helpers shared by the Full Grid editor pieces. */
export function boardCtx(layout: FlexGridLayout, board: FlexGridBoard): FlexGridSnapContext {
  return {
    canvasWidth: layout.canvasWidth,
    canvasHeight: board.height,
    grid: layout.grid,
  };
}

export function updateModule(
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
