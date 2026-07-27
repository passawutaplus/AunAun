import type { SocialLinkItem } from "@/lib/validators";

/** Parse profiles.social_links jsonb safely for UI. */
export function parseSocialLinks(raw: unknown): SocialLinkItem[] {
  if (!Array.isArray(raw)) return [];
  const out: SocialLinkItem[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const o = row as Record<string, unknown>;
    const id = typeof o.id === "string" ? o.id.trim() : "";
    const title = typeof o.title === "string" ? o.title.trim() : "";
    const url = typeof o.url === "string" ? o.url.trim() : "";
    if (!id || !title || !url) continue;
    out.push({ id, title, url });
  }
  return out.slice(0, 12);
}
