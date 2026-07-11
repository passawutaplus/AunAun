const KEY_PREFIX = "anthem-portfolio-editor";

export type PortfolioEditorSnapshot = {
  title: string;
  subtitle: string;
  description: string;
  category: string;
  cover_url: string;
  gallery_urls: string[];
  video_urls: string[];
  tools: string[];
  tags: string[];
  projectId: string | null;
  savedAt: number;
};

function storageKey(userId: string) {
  return `${KEY_PREFIX}:${userId}`;
}

export function loadPortfolioEditorLocal(userId: string): PortfolioEditorSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return null;
    return JSON.parse(raw) as PortfolioEditorSnapshot;
  } catch {
    return null;
  }
}

export function savePortfolioEditorLocal(userId: string, snap: PortfolioEditorSnapshot) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(snap));
  } catch {
    /* quota */
  }
}

export function clearPortfolioEditorLocal(userId: string) {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(storageKey(userId));
  } catch {
    /* ignore */
  }
}

export function portfolioEditorHasContent(snap: {
  title?: string;
  subtitle?: string;
  description?: string;
  content_blocks?: unknown[];
  cover_url?: string;
  gallery_urls?: string[];
  video_urls?: string[];
  tools?: string[];
  tags?: string[];
}): boolean {
  const hasBlocks =
    Array.isArray(snap.content_blocks) &&
    snap.content_blocks.some((b) => {
      if (!b || typeof b !== "object") return false;
      const row = b as { heading?: string; body?: string; url?: string; type?: string };
      return !!(row.heading?.trim() || row.body?.trim() || row.url?.trim());
    });
  return !!(
    snap.title?.trim() ||
    snap.subtitle?.trim() ||
    snap.description?.trim() ||
    hasBlocks ||
    snap.cover_url?.trim() ||
    (snap.gallery_urls?.length ?? 0) > 0 ||
    (snap.video_urls?.length ?? 0) > 0 ||
    (snap.tools?.length ?? 0) > 0 ||
    (snap.tags?.length ?? 0) > 0
  );
}
