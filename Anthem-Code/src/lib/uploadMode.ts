import type { ProjectContentBlock } from "@/lib/projectContentBlocks";

/** Quick drop = one-column fast post. Studio = full module editor. */
export type UploadMode = "quick" | "studio";

const STORAGE_KEY = "samecor.uploadMode";

export function readUploadMode(): UploadMode {
  try {
    return localStorage.getItem(STORAGE_KEY) === "studio" ? "studio" : "quick";
  } catch {
    return "quick";
  }
}

export function writeUploadMode(mode: UploadMode): void {
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    /* private mode — the choice just won't persist */
  }
}

/** Quick drop can show single images and plain body text only. */
export function isQuickDropCompatible(blocks: ProjectContentBlock[], editorMode: string): boolean {
  if (editorMode !== "casual") return false;
  return blocks.every((b) => {
    if (b.type === "body") return true;
    if (b.type === "image") return !b.urls?.length && (!b.mediaLayout || b.mediaLayout === "single");
    return false;
  });
}
