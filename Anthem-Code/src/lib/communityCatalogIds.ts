/** Fixed UUIDs for demo catalog (matches scripts/demo-catalog-ids.mjs). */

export const CATALOG_CREATOR_COUNT = 20;

export function catalogCommunityPostId(categoryIndex: number, postIndex: number): string {
  const n = categoryIndex * 3 + postIndex;
  const hex = n.toString(16).padStart(2, "0");
  return `00000000-0000-0000-0004-0000000000${hex}`;
}

export function catalogUserId(index: number): string {
  const hex = index.toString(16).padStart(2, "0");
  return `00000000-0000-0000-0000-00000000a0${hex}`;
}

export function catalogProjectId(index: number): string {
  const hex = index.toString(16).padStart(2, "0");
  return `00000000-0000-0000-0002-0000000000${hex}`;
}

export function catalogIndexFromUserId(userId: string | null | undefined): number | null {
  if (!userId) return null;
  const match = /^00000000-0000-0000-0000-00000000a0([0-9a-f]{2})$/i.exec(userId);
  if (!match) return null;
  const index = Number.parseInt(match[1]!, 16);
  if (index < 0 || index >= CATALOG_CREATOR_COUNT) return null;
  return index;
}

/** Text-only catalog posts (one question/tip per work category). */
export const CATALOG_TEXT_COVER_POST_IDS = Array.from({ length: 8 }, (_, ci) =>
  catalogCommunityPostId(ci, 2),
);
