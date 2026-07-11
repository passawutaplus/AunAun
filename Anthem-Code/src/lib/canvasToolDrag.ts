import type { PhotoGridLayout } from "@/lib/photoGridLayouts";
import type { ImageTextSplitSide, ProjectTextBlockType } from "@/lib/projectContentBlocks";

export const CANVAS_TOOL_MIME = "application/x-aplus1-canvas-tool";

export type CanvasToolPayload =
  | { tool: "single" }
  | { tool: "gallery" }
  | { tool: "multi"; columns: 2 | 3 | 4 }
  | { tool: "grid"; layout: PhotoGridLayout }
  | { tool: "image_text"; side: ImageTextSplitSide }
  | { tool: "video" }
  | { tool: ProjectTextBlockType };

export function encodeCanvasTool(payload: CanvasToolPayload): string {
  return JSON.stringify(payload);
}

export function parseCanvasTool(raw: string | undefined | null): CanvasToolPayload | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as CanvasToolPayload;
    if (!data || typeof data !== "object" || !("tool" in data)) return null;
    const t = data.tool;
    if (
      t === "single" ||
      t === "gallery" ||
      t === "video" ||
      t === "heading" ||
      t === "heading_body" ||
      t === "body"
    ) {
      return data;
    }
    if (t === "multi" && "columns" in data && (data.columns === 2 || data.columns === 3 || data.columns === 4)) {
      return data;
    }
    if (t === "grid" && "layout" in data) return data;
    if (
      t === "image_text" &&
      "side" in data &&
      (data.side === "image_left" || data.side === "text_left")
    ) {
      return data;
    }
    return null;
  } catch {
    return null;
  }
}

export function setCanvasToolDragData(dt: DataTransfer, payload: CanvasToolPayload) {
  const encoded = encodeCanvasTool(payload);
  dt.setData(CANVAS_TOOL_MIME, encoded);
  dt.setData("text/plain", encoded);
  dt.effectAllowed = "copy";
}

export function readCanvasToolDragData(dt: DataTransfer): CanvasToolPayload | null {
  return parseCanvasTool(dt.getData(CANVAS_TOOL_MIME) || dt.getData("text/plain"));
}
