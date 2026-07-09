export type ProjectContentBlockType = "heading" | "heading_body" | "body";

export type ProjectContentBlock = {
  id: string;
  type: ProjectContentBlockType;
  heading?: string;
  body?: string;
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
  ProjectContentBlockType,
  { label: string; description: string }
> = {
  heading: { label: "หัวข้อ", description: "หัวข้อเด่นกลางภาพ" },
  heading_body: { label: "หัวข้อ + เนื้อหา", description: "หัวข้อและย่อหน้าอธิบาย" },
  body: { label: "เนื้อหา", description: "ย่อหน้าอธิบายอย่างเดียว" },
};

export const PROJECT_CONTENT_BLOCKS_MAX = 24;
export const PROJECT_BLOCK_HEADING_MAX = 200;
export const PROJECT_BLOCK_BODY_MAX = 3000;

function newBlockId(): string {
  return crypto.randomUUID();
}

export function createContentBlock(type: ProjectContentBlockType): ProjectContentBlock {
  return { id: newBlockId(), type, heading: "", body: "" };
}

function isBlockType(v: unknown): v is ProjectContentBlockType {
  return v === "heading" || v === "heading_body" || v === "body";
}

export function parseContentBlocks(raw: unknown): ProjectContentBlock[] {
  if (!Array.isArray(raw)) return [];
  const out: ProjectContentBlock[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    if (!isBlockType(row.type)) continue;
    const heading = typeof row.heading === "string" ? row.heading : "";
    const body = typeof row.body === "string" ? row.body : "";
    const id = typeof row.id === "string" && row.id ? row.id : newBlockId();
    if (row.type === "heading" && !heading.trim()) continue;
    if (row.type === "body" && !body.trim()) continue;
    if (row.type === "heading_body" && !heading.trim() && !body.trim()) continue;
    out.push({
      id,
      type: row.type,
      heading: heading.slice(0, PROJECT_BLOCK_HEADING_MAX),
      body: body.slice(0, PROJECT_BLOCK_BODY_MAX),
    });
  }
  return out.slice(0, PROJECT_CONTENT_BLOCKS_MAX);
}

export function blocksFromLegacyDescription(description: string | null | undefined): ProjectContentBlock[] {
  const text = description?.trim();
  if (!text) return [];
  return [{ id: newBlockId(), type: "body", body: text }];
}

export function mergeContentBlocks(
  blocks: ProjectContentBlock[],
  legacyDescription?: string | null,
): ProjectContentBlock[] {
  const parsed = parseContentBlocks(blocks);
  if (parsed.length) return parsed;
  return blocksFromLegacyDescription(legacyDescription);
}

export function flattenContentBlocks(blocks: ProjectContentBlock[]): string {
  return blocks
    .map((b) => {
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
  return parseContentBlocks(blocks).map((b) => ({
    id: b.id,
    type: b.type,
    ...(b.type !== "body" ? { heading: (b.heading ?? "").trim() } : {}),
    ...(b.type !== "heading" ? { body: (b.body ?? "").trim() } : {}),
  }));
}

export function parseGalleryDisplayMode(raw: unknown): GalleryDisplayMode {
  if (raw === "single") return "single";
  if (raw === "grid") return "grid";
  return "gallery";
}

export function isSchemaContentPresentationError(error: unknown): boolean {
  const msg = String((error as { message?: string })?.message ?? error ?? "");
  return /content_blocks|gallery_display_mode|grid_layout|does not exist|PGRST204/i.test(msg);
}

export function hasContentBlockDraft(blocks: ProjectContentBlock[]): boolean {
  return blocks.some((b) => {
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
