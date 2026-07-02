import { normalizeTag } from "@/lib/exploreRoutes";

/** Home feed — Designer Area filtered by hashtag. */
export function communityTagFeedUrl(tag: string): string {
  const trimmed = tag.trim().replace(/^#+/, "");
  if (!trimmed) return "/?mode=community";
  return `/?mode=community&tag=${encodeURIComponent(trimmed)}`;
}

export function decodeCommunityTagParam(raw: string | null | undefined): string {
  if (!raw) return "";
  try {
    return raw.trim().replace(/^#+/, "");
  } catch {
    return raw.trim();
  }
}

export function tagsMatchFilter(postTags: string[] | undefined, filterTag: string): boolean {
  const norm = normalizeTag(filterTag);
  if (!norm) return true;
  return (postTags ?? []).some((t) => normalizeTag(t) === norm);
}
