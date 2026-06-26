export const COMMUNITY_QA_TAG = "Q&A";

export function isCommunityQaTag(tag: string): boolean {
  const key = tag.trim().replace(/^#+/, "").toLowerCase();
  return key === "q&a" || key === "qa";
}

export function hasCommunityQaBadge(tags: string[] | undefined): boolean {
  return (tags ?? []).some(isCommunityQaTag);
}

export function toggleCommunityQaTag(tags: string[]): string[] {
  if (hasCommunityQaBadge(tags)) {
    return tags.filter((t) => !isCommunityQaTag(t));
  }
  return [...tags, COMMUNITY_QA_TAG];
}

/** Hashtags shown in UI — hides the Q&A marker (shown as badge instead). */
export function communityDisplayTags(tags: string[] | undefined): string[] {
  return (tags ?? []).filter((t) => !isCommunityQaTag(t));
}
