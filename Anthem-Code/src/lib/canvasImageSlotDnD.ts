import type { ProjectContentBlock } from "@/lib/projectContentBlocks";
import { blockImageUrls, imageModuleSlotCapacity, isImageTextBlockType } from "@/lib/projectContentBlocks";

export const CANVAS_IMAGE_SLOT_MIME = "application/x-aplus1-canvas-image-slot";
export const CANVAS_IMAGE_SLOT_PLAIN_PREFIX = "aplus1-canvas-image-slot:";

export type CanvasImageSlotRef = {
  blockId: string;
  slotIndex: number;
  url: string;
};

export type CanvasImageSlotTarget = {
  blockId: string;
  slotIndex: number;
};

export type CanvasImageSlotAction = "swap" | "replace" | "move";

/** In-memory drag payload — custom MIME is often hidden from `types` during dragover. */
let activeCanvasImageSlotDrag: CanvasImageSlotRef | null = null;

export function beginCanvasImageSlotDrag(slot: CanvasImageSlotRef) {
  activeCanvasImageSlotDrag = slot;
}

export function endCanvasImageSlotDrag() {
  activeCanvasImageSlotDrag = null;
}

export function getActiveCanvasImageSlotDrag(): CanvasImageSlotRef | null {
  return activeCanvasImageSlotDrag;
}

export function isCanvasImageSlotDrag(dt: DataTransfer): boolean {
  if (activeCanvasImageSlotDrag) return true;
  const types = Array.from(dt.types);
  if (types.includes(CANVAS_IMAGE_SLOT_MIME)) return true;
  // text/plain alone is too broad — only trust in-memory flag or our MIME during dragover
  return false;
}

export function writeCanvasImageSlotDrag(dt: DataTransfer, slot: CanvasImageSlotRef) {
  beginCanvasImageSlotDrag(slot);
  dt.setData(CANVAS_IMAGE_SLOT_MIME, JSON.stringify(slot));
  dt.setData("text/plain", `${CANVAS_IMAGE_SLOT_PLAIN_PREFIX}${JSON.stringify(slot)}`);
  dt.effectAllowed = "move";
}

export function readCanvasImageSlotDrag(dt: DataTransfer): CanvasImageSlotRef | null {
  if (activeCanvasImageSlotDrag) return activeCanvasImageSlotDrag;
  const raw =
    dt.getData(CANVAS_IMAGE_SLOT_MIME) ||
    (() => {
      const plain = dt.getData("text/plain");
      if (plain.startsWith(CANVAS_IMAGE_SLOT_PLAIN_PREFIX)) {
        return plain.slice(CANVAS_IMAGE_SLOT_PLAIN_PREFIX.length);
      }
      return "";
    })();
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as CanvasImageSlotRef;
    if (!parsed?.blockId || typeof parsed.slotIndex !== "number" || !parsed.url) return null;
    return parsed;
  } catch {
    return null;
  }
}

function slotArrayFor(block: ProjectContentBlock, minLength = 1): string[] {
  if (isImageTextBlockType(block.type)) {
    return [(block.url ?? "").trim()];
  }
  if (block.type !== "image") return [];

  if (block.mediaLayout === "gallery") {
    return blockImageUrls(block).map((u) => u.trim()).filter(Boolean);
  }

  if (block.mediaLayout === "single" || block.mediaLayout == null) {
    const url = (block.url ?? blockImageUrls(block)[0] ?? "").trim();
    return [url];
  }

  const capacity = Math.max(imageModuleSlotCapacity(block), minLength);
  const urls = blockImageUrls(block);
  return Array.from({ length: capacity }, (_, i) => (urls[i] ?? "").trim());
}

function commitSlotArray(block: ProjectContentBlock, slots: string[]): ProjectContentBlock {
  if (isImageTextBlockType(block.type)) {
    return { ...block, url: slots[0] ?? "" };
  }
  if (block.type !== "image") return block;

  if (block.mediaLayout === "gallery") {
    const next = slots.map((u) => u.trim()).filter(Boolean);
    return { ...block, mediaLayout: "gallery", urls: next, url: next[0] ?? "" };
  }

  if (block.mediaLayout === "single" || block.mediaLayout == null) {
    const url = (slots[0] ?? "").trim();
    return { ...block, mediaLayout: "single", url, urls: url ? [url] : [] };
  }

  const capacity = imageModuleSlotCapacity(block);
  const next = Array.from({ length: capacity }, (_, i) => (slots[i] ?? "").trim());
  return {
    ...block,
    urls: next,
    url: next.find((u) => u.trim()) ?? "",
  };
}

export function readCanvasImageSlotUrl(block: ProjectContentBlock, slotIndex: number): string {
  const slots = slotArrayFor(block, slotIndex + 1);
  return (slots[slotIndex] ?? "").trim();
}

export function applyCanvasImageSlotAction(
  blocks: ProjectContentBlock[],
  from: CanvasImageSlotRef,
  to: CanvasImageSlotTarget,
  mode: CanvasImageSlotAction,
): ProjectContentBlock[] {
  if (from.blockId === to.blockId && from.slotIndex === to.slotIndex) return blocks;

  const fromBlock = blocks.find((b) => b.id === from.blockId);
  const toBlock = blocks.find((b) => b.id === to.blockId);
  if (!fromBlock || !toBlock) return blocks;

  const sourceUrl = readCanvasImageSlotUrl(fromBlock, from.slotIndex) || from.url.trim();
  if (!sourceUrl) return blocks;
  const targetUrl = readCanvasImageSlotUrl(toBlock, to.slotIndex);

  if (from.blockId === to.blockId) {
    const slots = slotArrayFor(fromBlock, Math.max(from.slotIndex, to.slotIndex) + 1);
    while (slots.length <= Math.max(from.slotIndex, to.slotIndex)) slots.push("");
    if (mode === "swap") {
      const tmp = slots[to.slotIndex] ?? "";
      slots[to.slotIndex] = slots[from.slotIndex] ?? "";
      slots[from.slotIndex] = tmp;
    } else {
      // replace / move: target gets source, source cleared (target image discarded on replace)
      slots[to.slotIndex] = sourceUrl;
      slots[from.slotIndex] = "";
    }
    return blocks.map((b) => (b.id === from.blockId ? commitSlotArray(b, slots) : b));
  }

  const fromSlots = slotArrayFor(fromBlock, from.slotIndex + 1);
  const toSlots = slotArrayFor(toBlock, to.slotIndex + 1);
  while (fromSlots.length <= from.slotIndex) fromSlots.push("");
  while (toSlots.length <= to.slotIndex) toSlots.push("");

  if (mode === "swap") {
    fromSlots[from.slotIndex] = targetUrl;
    toSlots[to.slotIndex] = sourceUrl;
  } else {
    toSlots[to.slotIndex] = sourceUrl;
    fromSlots[from.slotIndex] = "";
  }

  return blocks.map((b) => {
    if (b.id === from.blockId) return commitSlotArray(b, fromSlots);
    if (b.id === to.blockId) return commitSlotArray(b, toSlots);
    return b;
  });
}
