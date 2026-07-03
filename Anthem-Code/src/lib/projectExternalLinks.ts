export type ProjectExternalLink = {
  id: string;
  label: string;
  url: string;
};

/** Stored in DB — no id */
export type StoredProjectExternalLink = {
  label: string;
  url: string;
};

export const PROJECT_EXTERNAL_LINKS_MAX = 10;

function newLinkId(): string {
  return crypto.randomUUID();
}

export function createProjectExternalLink(label: string, url: string): ProjectExternalLink {
  return { id: newLinkId(), label, url };
}

export function parseProjectExternalLinks(raw: unknown): ProjectExternalLink[] {
  if (!Array.isArray(raw)) return [];
  const out: ProjectExternalLink[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const label = String((item as { label?: unknown }).label ?? "").trim();
    const url = String((item as { url?: unknown }).url ?? "").trim();
    if (!url) continue;
    out.push({ id: newLinkId(), label: label || url, url });
    if (out.length >= PROJECT_EXTERNAL_LINKS_MAX) break;
  }
  return out;
}

export function toStoredExternalLinks(links: ProjectExternalLink[]): StoredProjectExternalLink[] {
  return links
    .map((l) => ({
      label: l.label.trim(),
      url: l.url.trim(),
    }))
    .filter((l) => l.url.length > 0)
    .slice(0, PROJECT_EXTERNAL_LINKS_MAX);
}

/** @deprecated use toStoredExternalLinks */
export function normalizeProjectExternalLinks(links: ProjectExternalLink[]): StoredProjectExternalLink[] {
  return toStoredExternalLinks(links);
}
