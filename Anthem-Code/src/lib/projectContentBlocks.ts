import { sanitizeProjectRichText } from "@/lib/projectRichText";
import {
  mediaItemsFromProject,
  type PortfolioMediaItem,
} from "@/lib/portfolioMedia";
import { photoGridSlotCount, type PhotoGridLayout } from "@/lib/photoGridLayouts";

export type ProjectTextBlockType = "heading" | "heading_body" | "body";
export type ProjectMediaBlockType = "image" | "video";
export type ImageTextSplitSide = "image_left" | "text_left";
export type TextVerticalAlign = "top" | "middle" | "bottom";
/** Spacing after this block before the next (default spaced). */
export type BlockGapAfter = "spaced" | "tight";
export type ProjectContentBlockType = ProjectTextBlockType | ProjectMediaBlockType | "image_text";

export type ProjectContentBlock = {
  id: string;
  type: ProjectContentBlockType;
  heading?: string;
  body?: string;
  url?: string;
  /** Multi-slot image module (gallery / grid / multi-row). Empty string = slot awaiting upload. */
  urls?: string[];
  mediaLayout?: "single" | "gallery" | "grid" | "multi";
  gridLayout?: "two_stack" | "two_side" | "three_split" | "three_split_rev" | "four_quad";
  /** Columns for mediaLayout "multi" (single row). */
  rowColumns?: 2 | 3 | 4;
  /** Side-by-side image + text module. */
  splitSide?: ImageTextSplitSide;
  /** Vertical position of text column in image_text modules. */
  textVerticalAlign?: TextVerticalAlign;
  /** Gap below this block. Omit / spaced = normal; tight = flush with next. */
  gapAfter?: BlockGapAfter;
};

export type GalleryDisplayMode = "single" | "gallery" | "grid";

export const GALLERY_DISPLAY_MODES: { id: GalleryDisplayMode; label: string; hint: string }[] = [
  { id: "single", label: "ภาพเดียว", hint: "โชว์ภาพหลักเต็มจอ" },
  { id: "gallery", label: "แกลเลอรีสไลด์", hint: "หลายภาพเลื่อนดูได้" },
  { id: "grid", label: "Photo grid", hint: "หลายภาพเรียงตาราง" },
];

export function gallerySectionTitle(mode: GalleryDisplayMode): string {
  if (mode === "single") return "ภาพผลงาน";
  if (mode === "grid") return "Photo grid";
  return "แกลเลอรีผลงาน";
}

export const CONTENT_BLOCK_META: Record<
  ProjectTextBlockType,
  { label: string; description: string }
> = {
  heading: { label: "หัวข้อ", description: "หัวข้อเด่นกลางภาพ" },
  heading_body: { label: "หัวข้อ + เนื้อหา", description: "หัวข้อและย่อหน้าอธิบาย" },
  body: { label: "เนื้อหา", description: "ย่อหน้าอธิบายอย่างเดียว" },
};

/** Safety ceiling only (JSON / abuse) — UI does not treat this as a product cap. */
export const PROJECT_CONTENT_BLOCKS_MAX = 500;
export const PROJECT_BLOCK_HEADING_MAX = 200;
export const PROJECT_BLOCK_BODY_MAX = 3000;

function newBlockId(): string {
  return crypto.randomUUID();
}

/** Clone a canvas block with a fresh id (for duplicate). */
export function duplicateContentBlock(block: ProjectContentBlock): ProjectContentBlock {
  return {
    ...block,
    id: newBlockId(),
    urls: block.urls ? [...block.urls] : undefined,
  };
}

export function isTextBlockType(v: unknown): v is ProjectTextBlockType {
  return v === "heading" || v === "heading_body" || v === "body";
}

export function isMediaBlockType(v: unknown): v is ProjectMediaBlockType {
  return v === "image" || v === "video";
}

export function isImageTextBlockType(v: unknown): v is "image_text" {
  return v === "image_text";
}

export function isImageTextSplitSide(v: unknown): v is ImageTextSplitSide {
  return v === "image_left" || v === "text_left";
}

export function isTextVerticalAlign(v: unknown): v is TextVerticalAlign {
  return v === "top" || v === "middle" || v === "bottom";
}

export function parseBlockGapAfter(raw: unknown): BlockGapAfter {
  return raw === "tight" ? "tight" : "spaced";
}

/** Only persist non-default gap to keep stored JSON lean. */
export function gapAfterFields(gapAfter: unknown): { gapAfter?: BlockGapAfter } {
  return gapAfter === "tight" ? { gapAfter: "tight" } : {};
}

/** Margin below a block before the next (public / editor). */
export function blockGapAfterClass(
  gapAfter: BlockGapAfter | undefined,
  isLast: boolean,
  density: "editor" | "public" = "public",
): string {
  if (isLast) return "";
  if (gapAfter === "tight") return "mb-0";
  return density === "editor" ? "mb-5" : "mb-6";
}

export function textVerticalAlignClass(align: TextVerticalAlign | undefined): string {
  if (align === "top") return "items-start";
  if (align === "bottom") return "items-end";
  return "items-center";
}

function isBlockType(v: unknown): v is ProjectContentBlockType {
  return isTextBlockType(v) || isMediaBlockType(v) || isImageTextBlockType(v);
}

export function isHttpUrl(url: string): boolean {
  return /^https?:\/\//i.test(url.trim());
}

export function createContentBlock(type: ProjectTextBlockType): ProjectContentBlock {
  return { id: newBlockId(), type, heading: "", body: "" };
}

export function createMediaBlock(
  type: ProjectMediaBlockType,
  url = "",
  id?: string,
): ProjectContentBlock {
  return { id: id ?? newBlockId(), type, url, mediaLayout: type === "image" ? "single" : undefined };
}

/** Empty media slot on canvas — upload later. */
export function createMediaPlaceholder(type: ProjectMediaBlockType): ProjectContentBlock {
  return createMediaBlock(type, "");
}

export function createGalleryPlaceholder(_slotCount = 0): ProjectContentBlock {
  return {
    id: newBlockId(),
    type: "image",
    mediaLayout: "gallery",
    urls: [],
  };
}

export type MultiRowColumns = 2 | 3 | 4;

export const MULTI_ROW_LAYOUTS: { columns: MultiRowColumns; label: string }[] = [
  { columns: 2, label: "2 ภาพ" },
  { columns: 3, label: "3 ภาพ" },
  { columns: 4, label: "4 ภาพ" },
];

export function createMultiRowPlaceholder(columns: MultiRowColumns = 2): ProjectContentBlock {
  const n = columns;
  return {
    id: newBlockId(),
    type: "image",
    mediaLayout: "multi",
    rowColumns: n,
    urls: Array.from({ length: n }, () => ""),
  };
}

export function resizeImageSlots(urls: string[], slotCount: number): string[] {
  const n = Math.max(1, Math.min(slotCount, 8));
  const next = urls.slice(0, n);
  while (next.length < n) next.push("");
  return next;
}

export function createGridPlaceholder(
  layout: "two_stack" | "two_side" | "three_split" | "three_split_rev" | "four_quad",
  slotCount: number,
): ProjectContentBlock {
  const n = Math.max(1, Math.min(slotCount, 8));
  return {
    id: newBlockId(),
    type: "image",
    mediaLayout: "grid",
    gridLayout: layout,
    urls: Array.from({ length: n }, () => ""),
  };
}

export const IMAGE_TEXT_SPLIT_LAYOUTS: { side: ImageTextSplitSide; label: string }[] = [
  { side: "image_left", label: "ซ้ายภาพ · ขวาข้อความ" },
  { side: "text_left", label: "ซ้ายข้อความ · ขวาภาพ" },
];

export function createImageTextPlaceholder(side: ImageTextSplitSide = "image_left"): ProjectContentBlock {
  return {
    id: newBlockId(),
    type: "image_text",
    splitSide: side,
    textVerticalAlign: "middle",
    url: "",
    body: "",
  };
}

export function blockImageUrls(block: ProjectContentBlock): string[] {
  if (block.type !== "image") return [];
  if (Array.isArray(block.urls) && block.urls.length) return block.urls;
  if (block.url != null) return [block.url];
  return [];
}

export function isMediaPlaceholder(block: ProjectContentBlock): boolean {
  if (isImageTextBlockType(block.type)) return !(block.url ?? "").trim();
  if (!isMediaBlockType(block.type)) return false;
  if (block.type === "video") return !(block.url ?? "").trim();
  const urls = blockImageUrls(block);
  if (!urls.length) return true;
  return urls.every((u) => !u.trim());
}

export function canvasBlockLabel(block: ProjectContentBlock): string {
  if (block.type === "video") return "วิดีโอ";
  if (block.type === "heading") return "หัวข้อ";
  if (block.type === "heading_body") return "หัวข้อ + เนื้อหา";
  if (block.type === "body") return "เนื้อหา";
  if (block.type === "image_text") {
    return block.splitSide === "text_left" ? "ข้อความ + ภาพ" : "ภาพ + ข้อความ";
  }
  if (block.type === "image") {
    if (block.mediaLayout === "multi") return "รูปภาพหลายรูป";
    if (block.mediaLayout === "gallery") return "แกลเลอรีสไลด์";
    if (block.mediaLayout === "grid") return "Photo grid";
    return "รูปภาพเดี่ยว";
  }
  return "บล็อก";
}

export function parseContentBlocks(raw: unknown): ProjectContentBlock[] {
  if (!Array.isArray(raw)) return [];
  const out: ProjectContentBlock[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    if (!isBlockType(row.type)) continue;
    const id = typeof row.id === "string" && row.id ? row.id : newBlockId();

    if (isMediaBlockType(row.type)) {
      const urlsRaw = Array.isArray(row.urls)
        ? row.urls.filter((u): u is string => typeof u === "string").map((u) => u.trim())
        : [];
      const url = typeof row.url === "string" ? row.url.trim() : "";
      const mediaLayout =
        row.mediaLayout === "gallery" ||
        row.mediaLayout === "grid" ||
        row.mediaLayout === "single" ||
        row.mediaLayout === "multi"
          ? row.mediaLayout
          : urlsRaw.length > 1
            ? "gallery"
            : "single";
      const gridLayout =
        row.gridLayout === "two_stack" ||
        row.gridLayout === "two_side" ||
        row.gridLayout === "three_split" ||
        row.gridLayout === "three_split_rev" ||
        row.gridLayout === "four_quad"
          ? row.gridLayout
          : undefined;
      const rowColumns =
        row.rowColumns === 2 || row.rowColumns === 3 || row.rowColumns === 4
          ? row.rowColumns
          : undefined;

      if (row.type === "video") {
        if (!url || !isHttpUrl(url)) continue;
        out.push({ id, type: "video", url, ...gapAfterFields(row.gapAfter) });
        continue;
      }

      const slotUrls = (urlsRaw.length ? urlsRaw : url ? [url] : []).map((u) =>
        u && isHttpUrl(u) ? u : "",
      );
      const filled = slotUrls.filter(Boolean);
      if (!filled.length) continue;

      if (mediaLayout === "grid" || mediaLayout === "multi") {
        const layoutSlots =
          mediaLayout === "grid" && gridLayout
            ? photoGridSlotCount(gridLayout as PhotoGridLayout)
            : mediaLayout === "multi"
              ? (rowColumns ?? (Math.min(4, Math.max(2, slotUrls.length || 2)) as 2 | 3 | 4))
              : Math.max(2, slotUrls.length);
        const urls = resizeImageSlots(slotUrls, layoutSlots);
        out.push({
          id,
          type: "image",
          mediaLayout,
          ...(gridLayout ? { gridLayout } : {}),
          ...(mediaLayout === "multi"
            ? {
                rowColumns:
                  rowColumns ?? (Math.min(4, Math.max(2, layoutSlots)) as 2 | 3 | 4),
              }
            : {}),
          urls,
          url: filled[0],
          ...gapAfterFields(row.gapAfter),
        });
      } else if (mediaLayout === "gallery" || filled.length > 1) {
        out.push({
          id,
          type: "image",
          mediaLayout: mediaLayout === "single" ? "gallery" : mediaLayout,
          urls: filled,
          url: filled[0],
          ...gapAfterFields(row.gapAfter),
        });
      } else {
        out.push({
          id,
          type: "image",
          url: filled[0],
          mediaLayout: "single",
          ...gapAfterFields(row.gapAfter),
        });
      }
      continue;
    }

    if (isImageTextBlockType(row.type)) {
      const url = typeof row.url === "string" ? row.url.trim() : "";
      const body = sanitizeProjectRichText(typeof row.body === "string" ? row.body : "");
      const splitSide = isImageTextSplitSide(row.splitSide) ? row.splitSide : "image_left";
      const textVerticalAlign = isTextVerticalAlign(row.textVerticalAlign)
        ? row.textVerticalAlign
        : "middle";
      const safeUrl = url && isHttpUrl(url) ? url : "";
      if (!safeUrl && !body.trim()) continue;
      out.push({
        id,
        type: "image_text",
        splitSide,
        textVerticalAlign,
        url: safeUrl,
        body: body.slice(0, PROJECT_BLOCK_BODY_MAX),
        ...gapAfterFields(row.gapAfter),
      });
      continue;
    }

    const heading = sanitizeProjectRichText(typeof row.heading === "string" ? row.heading : "");
    const body = sanitizeProjectRichText(typeof row.body === "string" ? row.body : "");
    if (row.type === "heading" && !heading.trim()) continue;
    if (row.type === "body" && !body.trim()) continue;
    if (row.type === "heading_body" && !heading.trim() && !body.trim()) continue;
    out.push({
      id,
      type: row.type,
      heading: heading.slice(0, PROJECT_BLOCK_HEADING_MAX),
      body: body.slice(0, PROJECT_BLOCK_BODY_MAX),
      ...gapAfterFields(row.gapAfter),
    });
  }
  return out.slice(0, PROJECT_CONTENT_BLOCKS_MAX);
}

/** Keep empty text drafts and empty media placeholders while editing. */
export function normalizeEditorBlocks(blocks: ProjectContentBlock[]): ProjectContentBlock[] {
  const out: ProjectContentBlock[] = [];
  for (const b of blocks) {
    if (!isBlockType(b.type)) continue;
    if (isMediaBlockType(b.type)) {
      if (b.type === "video") {
        const url = (b.url ?? "").trim();
        if (url && !isHttpUrl(url)) continue;
        out.push({
          id: b.id || newBlockId(),
          type: "video",
          url: url && isHttpUrl(url) ? url : "",
          ...gapAfterFields(b.gapAfter),
        });
        continue;
      }
      const urls = blockImageUrls(b).map((u) => u.trim());
      const mediaLayout = b.mediaLayout ?? (urls.length > 1 ? "gallery" : "single");
      const cleaned = urls.map((u) => (u && isHttpUrl(u) ? u : u ? "" : ""));
      // drop slots with invalid non-empty urls
      const safe = cleaned.map((u) => (u && !isHttpUrl(u) ? "" : u));
      if (mediaLayout === "gallery" || mediaLayout === "grid" || mediaLayout === "multi" || safe.length > 1) {
        out.push({
          id: b.id || newBlockId(),
          type: "image",
          mediaLayout,
          ...(b.gridLayout ? { gridLayout: b.gridLayout } : {}),
          ...(mediaLayout === "multi"
            ? {
                rowColumns:
                  b.rowColumns === 2 || b.rowColumns === 3 || b.rowColumns === 4
                    ? b.rowColumns
                    : ((Math.min(4, Math.max(2, safe.length || 2)) as 2 | 3 | 4)),
              }
            : {}),
          urls: safe.length ? safe : [""],
          url: safe.find((u) => u) ?? "",
          ...gapAfterFields(b.gapAfter),
        });
      } else {
        const url = safe[0] ?? "";
        out.push({
          id: b.id || newBlockId(),
          type: "image",
          mediaLayout: "single",
          url: url && isHttpUrl(url) ? url : "",
          ...gapAfterFields(b.gapAfter),
        });
      }
      continue;
    }
    if (isImageTextBlockType(b.type)) {
      const url = (b.url ?? "").trim();
      out.push({
        id: b.id || newBlockId(),
        type: "image_text",
        splitSide: isImageTextSplitSide(b.splitSide) ? b.splitSide : "image_left",
        textVerticalAlign: isTextVerticalAlign(b.textVerticalAlign) ? b.textVerticalAlign : "middle",
        url: url && isHttpUrl(url) ? url : "",
        body: (b.body ?? "").slice(0, PROJECT_BLOCK_BODY_MAX),
        ...gapAfterFields(b.gapAfter),
      });
      continue;
    }
    out.push({
      id: b.id || newBlockId(),
      type: b.type,
      heading: (b.heading ?? "").slice(0, PROJECT_BLOCK_HEADING_MAX),
      body: (b.body ?? "").slice(0, PROJECT_BLOCK_BODY_MAX),
      ...gapAfterFields(b.gapAfter),
    });
  }
  return out.slice(0, PROJECT_CONTENT_BLOCKS_MAX);
}

export function blocksFromLegacyDescription(description: string | null | undefined): ProjectContentBlock[] {
  const text = description?.trim();
  if (!text) return [];
  return [{ id: newBlockId(), type: "body", body: text }];
}

export function hasMediaBlocks(blocks: ProjectContentBlock[]): boolean {
  return blocks.some((b) => {
    if (isImageTextBlockType(b.type)) return !!(b.url ?? "").trim();
    if (!isMediaBlockType(b.type)) return false;
    if (b.type === "video") return !!(b.url ?? "").trim();
    return blockImageUrls(b).some((u) => !!u.trim());
  });
}

export function mediaItemsFromBlocks(blocks: ProjectContentBlock[]): PortfolioMediaItem[] {
  const out: PortfolioMediaItem[] = [];
  for (const b of blocks) {
    if (isImageTextBlockType(b.type)) {
      const url = (b.url ?? "").trim();
      if (url) out.push({ id: b.id, kind: "image", url });
      continue;
    }
    if (!isMediaBlockType(b.type)) continue;
    if (b.type === "video") {
      const url = (b.url ?? "").trim();
      if (url) out.push({ id: b.id, kind: "video", url });
      continue;
    }
    blockImageUrls(b).forEach((url, i) => {
      const u = url.trim();
      if (!u) return;
      out.push({ id: `${b.id}:${i}`, kind: "image", url: u });
    });
  }
  return out;
}

export function splitMediaFromBlocks(blocks: ProjectContentBlock[]): {
  gallery_urls: string[];
  video_urls: string[];
} {
  const items = mediaItemsFromBlocks(blocks);
  return {
    gallery_urls: items.map((m) => m.url),
    video_urls: items.filter((m) => m.kind === "video").map((m) => m.url),
  };
}

/**
 * Load canvas for editor/public:
 * - If content_blocks already has image/video → use as source of truth
 * - Else synthesize media blocks from gallery/video arrays, then text blocks
 */
export function hydrateProjectCanvas(input: {
  content_blocks?: unknown;
  description?: string | null;
  gallery_urls?: string[] | null;
  video_urls?: string[] | null;
}): ProjectContentBlock[] {
  const parsed = parseContentBlocks(input.content_blocks);
  if (hasMediaBlocks(parsed)) {
    return parsed;
  }

  const media = mediaItemsFromProject(input.gallery_urls ?? [], input.video_urls ?? []);
  const mediaBlocks = media.map((m) => createMediaBlock(m.kind, m.url, m.id));
  const textBlocks = parsed.length
    ? parsed.filter((b) => isTextBlockType(b.type))
    : blocksFromLegacyDescription(input.description);

  return [...mediaBlocks, ...textBlocks].slice(0, PROJECT_CONTENT_BLOCKS_MAX);
}

export function mergeContentBlocks(
  blocks: ProjectContentBlock[],
  legacyDescription?: string | null,
): ProjectContentBlock[] {
  const parsed = parseContentBlocks(blocks);
  if (parsed.length) return parsed;
  return blocksFromLegacyDescription(legacyDescription);
}

/** Prefer hydrated canvas (media+text interleaved) for public/detail. */
export function resolveProjectCanvas(input: {
  content_blocks?: unknown;
  description?: string | null;
  gallery_urls?: string[] | null;
  video_urls?: string[] | null;
}): ProjectContentBlock[] {
  return hydrateProjectCanvas(input);
}

export function flattenContentBlocks(blocks: ProjectContentBlock[]): string {
  return blocks
    .map((b) => {
      if (isMediaBlockType(b.type)) return "";
      if (isImageTextBlockType(b.type)) return b.body?.trim() ?? "";
      if (b.type === "heading") return b.heading?.trim() ?? "";
      if (b.type === "body") return b.body?.trim() ?? "";
      const h = b.heading?.trim() ?? "";
      const body = b.body?.trim() ?? "";
      return [h, body].filter(Boolean).join("\n\n");
    })
    .filter(Boolean)
    .join("\n\n")
    .slice(0, 5000);
}

export function toStoredContentBlocks(blocks: ProjectContentBlock[]): ProjectContentBlock[] {
  const out: ProjectContentBlock[] = [];
  for (const b of normalizeEditorBlocks(blocks)) {
    if (b.type === "video") {
      const url = (b.url ?? "").trim();
      if (!url || !isHttpUrl(url)) continue;
      out.push({ id: b.id, type: "video", url, ...gapAfterFields(b.gapAfter) });
      continue;
    }
    if (b.type === "image_text") {
      const url = (b.url ?? "").trim();
      const body = sanitizeProjectRichText(b.body ?? "").slice(0, PROJECT_BLOCK_BODY_MAX);
      const safeUrl = url && isHttpUrl(url) ? url : "";
      if (!safeUrl && !body.trim()) continue;
      out.push({
        id: b.id,
        type: "image_text",
        splitSide: isImageTextSplitSide(b.splitSide) ? b.splitSide : "image_left",
        textVerticalAlign: isTextVerticalAlign(b.textVerticalAlign) ? b.textVerticalAlign : "middle",
        url: safeUrl,
        body,
        ...gapAfterFields(b.gapAfter),
      });
      continue;
    }
    if (b.type === "image") {
      const rawUrls = blockImageUrls(b).map((u) => u.trim());
      const slotUrls = rawUrls.map((u) => (u && isHttpUrl(u) ? u : ""));
      const filled = slotUrls.filter(Boolean);
      if (!filled.length) continue;

      if (b.mediaLayout === "grid" || b.mediaLayout === "multi") {
        const layoutSlots =
          b.mediaLayout === "grid" && b.gridLayout
            ? photoGridSlotCount(b.gridLayout)
            : b.mediaLayout === "multi"
              ? b.rowColumns === 2 || b.rowColumns === 3 || b.rowColumns === 4
                ? b.rowColumns
                : (Math.min(4, Math.max(2, slotUrls.length || 2)) as 2 | 3 | 4)
              : Math.max(2, slotUrls.length);
        const urls = resizeImageSlots(slotUrls, layoutSlots);
        out.push({
          id: b.id,
          type: "image",
          mediaLayout: b.mediaLayout,
          ...(b.gridLayout ? { gridLayout: b.gridLayout } : {}),
          ...(b.mediaLayout === "multi"
            ? {
                rowColumns:
                  b.rowColumns === 2 || b.rowColumns === 3 || b.rowColumns === 4
                    ? b.rowColumns
                    : (Math.min(4, Math.max(2, layoutSlots)) as 2 | 3 | 4),
              }
            : {}),
          urls,
          url: filled[0],
          ...gapAfterFields(b.gapAfter),
        });
        continue;
      }

      if (b.mediaLayout === "gallery" || filled.length > 1) {
        out.push({
          id: b.id,
          type: "image",
          mediaLayout: b.mediaLayout === "single" ? "gallery" : b.mediaLayout ?? "gallery",
          urls: filled,
          url: filled[0],
          ...gapAfterFields(b.gapAfter),
        });
        continue;
      }

      out.push({
        id: b.id,
        type: "image",
        url: filled[0],
        mediaLayout: "single",
        ...gapAfterFields(b.gapAfter),
      });
      continue;
    }

    const heading = sanitizeProjectRichText(b.heading ?? "").slice(0, PROJECT_BLOCK_HEADING_MAX);
    const body = sanitizeProjectRichText(b.body ?? "").slice(0, PROJECT_BLOCK_BODY_MAX);
    if (b.type === "heading" && !heading.trim()) continue;
    if (b.type === "body" && !body.trim()) continue;
    if (b.type === "heading_body" && !heading.trim() && !body.trim()) continue;
    out.push({
      id: b.id,
      type: b.type,
      ...(b.type !== "body" ? { heading } : {}),
      ...(b.type !== "heading" ? { body } : {}),
      ...gapAfterFields(b.gapAfter),
    });
  }
  return out.slice(0, PROJECT_CONTENT_BLOCKS_MAX);
}

export function parseGalleryDisplayMode(raw: unknown): GalleryDisplayMode {
  if (raw === "single") return "single";
  if (raw === "grid") return "grid";
  return "gallery";
}

export function isSchemaContentPresentationError(error: unknown): boolean {
  const msg = String((error as { message?: string })?.message ?? error ?? "");
  const code = String((error as { code?: string })?.code ?? "");
  // Only fall back when presentation columns are missing — not on unrelated content_blocks errors.
  if (code === "PGRST204") {
    return /content_blocks|gallery_display_mode|grid_layout/i.test(msg);
  }
  return (
    /Could not find the '?(content_blocks|gallery_display_mode|grid_layout)'? column/i.test(msg) ||
    (/does not exist/i.test(msg) && /content_blocks|gallery_display_mode|grid_layout/i.test(msg))
  );
}

export function hasContentBlockDraft(blocks: ProjectContentBlock[]): boolean {
  return blocks.some((b) => {
    if (isMediaBlockType(b.type)) {
      if (b.type === "video") return true; // placeholder or filled counts as draft structure
      return true; // image module (even empty slots) is draft content
    }
    const h = b.heading?.trim() ?? "";
    const body = b.body?.trim() ?? "";
    if (b.type === "heading") return !!h;
    if (b.type === "body") return !!body;
    return !!h || !!body;
  });
}

export function stripOptionalProjectContentFields<T extends Record<string, unknown>>(row: T): T {
  const next = { ...row };
  delete next.content_blocks;
  delete next.gallery_display_mode;
  delete next.grid_layout;
  return next as T;
}

export function stripOptionalAiDisclosureFields<T extends Record<string, unknown>>(row: T): T {
  const next = { ...row };
  delete next.ai_assisted;
  delete next.ai_disclosure_note;
  return next as T;
}

export function stripOptionalClientPermissionFields<T extends Record<string, unknown>>(row: T): T {
  const next = { ...row };
  delete next.client_permission_confirmed;
  return next as T;
}

export function isSchemaAiDisclosureError(error: unknown): boolean {
  const msg = String((error as { message?: string })?.message ?? error ?? "");
  const code = String((error as { code?: string })?.code ?? "");
  if (code === "PGRST204") {
    return /ai_assisted|ai_disclosure_note/i.test(msg);
  }
  return (
    /Could not find the '?(ai_assisted|ai_disclosure_note)'? column/i.test(msg) ||
    (/does not exist/i.test(msg) && /ai_assisted|ai_disclosure_note/i.test(msg))
  );
}

export function isSchemaClientPermissionError(error: unknown): boolean {
  const msg = String((error as { message?: string })?.message ?? error ?? "");
  const code = String((error as { code?: string })?.code ?? "");
  if (code === "PGRST204") {
    return /client_permission_confirmed/i.test(msg);
  }
  return (
    /Could not find the '?client_permission_confirmed'? column/i.test(msg) ||
    (/does not exist/i.test(msg) && /client_permission_confirmed/i.test(msg))
  );
}
