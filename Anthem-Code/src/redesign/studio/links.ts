export type LinkRow = { id: string; title: string; url: string };

/** Same limits as the old profile links (validators.ts socialLinks). */
export const LINKS_MAX = 12;
export const LINK_TITLE_MAX = 60;
export const LINK_URL_MAX = 255;

/** "behance.net/x" → "https://behance.net/x"; "" when it is not a web link. */
export function cleanLinkUrl(raw: string): string {
  const s = raw.trim();
  if (!s) return "";
  const withScheme = /^https?:\/\//i.test(s) ? s : `https://${s}`;
  try {
    const u = new URL(withScheme);
    return /^https?:$/.test(u.protocol) && u.hostname.includes(".") ? withScheme.slice(0, LINK_URL_MAX) : "";
  } catch {
    return "";
  }
}

export const newLinkId = () => `link-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
