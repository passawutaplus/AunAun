import {
  createContentBlock,
  createGalleryPlaceholder,
  createGridPlaceholder,
  createImageTextPlaceholder,
  createMediaPlaceholder,
  createMultiRowPlaceholder,
  type ImageTextSplitSide,
  type MultiRowColumns,
  type ProjectContentBlock,
} from "@/lib/projectContentBlocks";
import { photoGridSlotCount, type PhotoGridLayout } from "@/lib/photoGridLayouts";

export type CanvasTemplateSourceKey = "case_short" | "gallery_heavy" | "story_case";

/** Structure-only module descriptor stored in DB / used for sidebar wireframes. */
export type CanvasTemplateModule =
  | { kind: "heading" }
  | { kind: "heading_body" }
  | { kind: "body" }
  | { kind: "image" }
  | { kind: "video" }
  | { kind: "gallery" }
  | { kind: "grid"; layout: PhotoGridLayout }
  | { kind: "multi"; columns: MultiRowColumns }
  | { kind: "image_text"; side: ImageTextSplitSide };

/** @deprecated Use CanvasTemplateModule — kept as alias for sidebar preview. */
export type CanvasTemplatePreviewSlot = CanvasTemplateModule;

export type CanvasTemplateSeed = {
  sourceKey: CanvasTemplateSourceKey;
  label: string;
  hint: string;
  modules: CanvasTemplateModule[];
  openContext?: boolean;
  recommended?: boolean;
};

export const CANVAS_TEMPLATE_MAX = 5;

export const CANVAS_TEMPLATE_SEEDS: CanvasTemplateSeed[] = [
  {
    sourceKey: "case_short",
    label: "ลงเร็ว",
    hint: "ลงผลงานเร็ว · โครงกระชับ",
    recommended: true,
    openContext: true,
    modules: [
      { kind: "heading" },
      { kind: "image" },
      { kind: "body" },
      { kind: "grid", layout: "three_split" },
      { kind: "image_text", side: "image_left" },
    ],
  },
  {
    sourceKey: "gallery_heavy",
    label: "เน้นภาพ",
    hint: "โชว์ภาพเป็นหลัก เลื่อนดูได้",
    modules: [
      { kind: "heading" },
      { kind: "gallery" },
      { kind: "grid", layout: "four_quad" },
      { kind: "body" },
    ],
  },
  {
    sourceKey: "story_case",
    label: "เล่าเรื่องครบ",
    hint: "โจทย์ → ภาพ → ผลลัพธ์",
    openContext: true,
    modules: [
      { kind: "heading_body" },
      { kind: "image" },
      { kind: "image_text", side: "image_left" },
      { kind: "grid", layout: "three_split" },
      { kind: "heading_body" },
    ],
  },
];

/** Legacy static list for tests / fallbacks — mirrors seeds. */
export const CANVAS_TEMPLATES = CANVAS_TEMPLATE_SEEDS.map((s) => ({
  id: s.sourceKey,
  label: s.label,
  hint: s.hint,
  moduleCount: s.modules.length,
  preview: s.modules,
  recommended: s.recommended,
  openContext: s.openContext,
}));

export type CanvasTemplateId = CanvasTemplateSourceKey;

function isPhotoGridLayout(v: unknown): v is PhotoGridLayout {
  return (
    v === "two_stack" ||
    v === "two_side" ||
    v === "three_split" ||
    v === "three_split_rev" ||
    v === "four_quad" ||
    v === "tower_stack_tower" ||
    v === "two_over_wide" ||
    v === "stack_tower_stack" ||
    v === "wide_over_two" ||
    v === "alt_stack_tower_4" ||
    v === "alt_tower_stack_4"
  );
}

function isImageTextSide(v: unknown): v is ImageTextSplitSide {
  return v === "image_left" || v === "text_left";
}

function isMultiColumns(v: unknown): v is MultiRowColumns {
  return v === 2 || v === 3 || v === 4;
}

/** Parse modules jsonb from DB into typed structure. */
export function parseCanvasTemplateModules(raw: unknown): CanvasTemplateModule[] {
  if (!Array.isArray(raw)) return [];
  const out: CanvasTemplateModule[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const kind = row.kind;
    if (kind === "heading" || kind === "heading_body" || kind === "body" || kind === "image" || kind === "video" || kind === "gallery") {
      out.push({ kind });
      continue;
    }
    if (kind === "grid" && isPhotoGridLayout(row.layout)) {
      out.push({ kind: "grid", layout: row.layout });
      continue;
    }
    if (kind === "multi" && isMultiColumns(row.columns)) {
      out.push({ kind: "multi", columns: row.columns });
      continue;
    }
    if (kind === "image_text" && isImageTextSide(row.side)) {
      out.push({ kind: "image_text", side: row.side });
    }
  }
  return out;
}

/** Strip live canvas blocks down to structure-only modules (no media / copy). */
export function blocksToTemplateModules(blocks: ProjectContentBlock[]): CanvasTemplateModule[] {
  const out: CanvasTemplateModule[] = [];
  for (const b of blocks) {
    if (b.type === "heading" || b.type === "heading_body" || b.type === "body") {
      out.push({ kind: b.type });
      continue;
    }
    if (b.type === "video") {
      out.push({ kind: "video" });
      continue;
    }
    if (b.type === "image_text") {
      out.push({
        kind: "image_text",
        side: b.splitSide === "text_left" ? "text_left" : "image_left",
      });
      continue;
    }
    if (b.type === "image") {
      if (b.mediaLayout === "gallery") {
        out.push({ kind: "gallery" });
      } else if (b.mediaLayout === "grid") {
        out.push({
          kind: "grid",
          layout: isPhotoGridLayout(b.gridLayout) ? b.gridLayout : "four_quad",
        });
      } else if (b.mediaLayout === "multi") {
        out.push({
          kind: "multi",
          columns: isMultiColumns(b.rowColumns) ? b.rowColumns : 2,
        });
      } else {
        out.push({ kind: "image" });
      }
    }
  }
  return out;
}

function withHint(block: ProjectContentBlock, hint: { heading?: string; body?: string }): ProjectContentBlock {
  if (block.type === "heading" || block.type === "heading_body") {
    return {
      ...block,
      heading: hint.heading ?? block.heading ?? "",
      body: hint.body ?? block.body ?? "",
    };
  }
  if (block.type === "body" || block.type === "image_text") {
    return { ...block, body: hint.body ?? block.body ?? "" };
  }
  return block;
}

/** Build placeholder canvas blocks from stored modules. */
export function buildBlocksFromTemplateModules(modules: CanvasTemplateModule[]): ProjectContentBlock[] {
  return modules.map((m) => {
    switch (m.kind) {
      case "heading":
        return withHint(createContentBlock("heading"), { heading: "หัวข้อ" });
      case "heading_body":
        return withHint(createContentBlock("heading_body"), {
          heading: "หัวข้อ",
          body: "รายละเอียดสั้น ๆ",
        });
      case "body":
        return withHint(createContentBlock("body"), { body: "รายละเอียดสั้น ๆ" });
      case "image":
        return createMediaPlaceholder("image");
      case "video":
        return createMediaPlaceholder("video");
      case "gallery":
        return createGalleryPlaceholder();
      case "grid":
        return createGridPlaceholder(m.layout, photoGridSlotCount(m.layout));
      case "multi":
        return createMultiRowPlaceholder(m.columns);
      case "image_text":
        return withHint(createImageTextPlaceholder(m.side), {
          body: "อธิบายรายละเอียดข้างภาพสั้น ๆ",
        });
      default:
        return createContentBlock("body");
    }
  });
}

/** @deprecated Prefer buildBlocksFromTemplateModules with DB row modules. */
export function buildCanvasTemplateBlocks(id: CanvasTemplateId): ProjectContentBlock[] {
  const seed = CANVAS_TEMPLATE_SEEDS.find((s) => s.sourceKey === id);
  if (!seed) return [];
  return buildBlocksFromTemplateModules(seed.modules);
}

export function getCanvasTemplate(id: CanvasTemplateId) {
  return CANVAS_TEMPLATES.find((t) => t.id === id);
}

export function getCanvasTemplateSeed(sourceKey: string | null | undefined) {
  if (!sourceKey) return undefined;
  return CANVAS_TEMPLATE_SEEDS.find((s) => s.sourceKey === sourceKey);
}
