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

