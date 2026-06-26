const KEY_PREFIX = "anthem-community-composer";

export type ComposerSnapshot = {
  title: string;
  body: string;
  tags: string[];
  tools: string[];
  gallery_urls: string[];
  video_urls: string[];
  draftId: string | null;
  savedAt: number;
};

function storageKey(userId: string) {
  return `${KEY_PREFIX}:${userId}`;
}

export function loadComposerLocal(userId: string): ComposerSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return null;
    return JSON.parse(raw) as ComposerSnapshot;
  } catch {
    return null;
  }
}

export function saveComposerLocal(userId: string, snap: ComposerSnapshot) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(snap));
  } catch {
    /* quota */
  }
}

export function clearComposerLocal(userId: string) {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(storageKey(userId));
  } catch {
    /* ignore */
  }
}

export function composerHasContent(snap: {
  title?: string;
  body?: string;
  tags?: string[];
  tools?: string[];
  gallery_urls?: string[];
  video_urls?: string[];
}): boolean {
  return Boolean(
    snap.title?.trim() ||
      snap.body?.trim() ||
      (snap.tags?.length ?? 0) > 0 ||
      (snap.tools?.length ?? 0) > 0 ||
      (snap.gallery_urls?.length ?? 0) > 0 ||
      (snap.video_urls?.length ?? 0) > 0,
  );
}
