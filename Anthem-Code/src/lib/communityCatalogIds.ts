/** Fixed UUIDs for demo catalog community posts (matches scripts/ecosystem/community-posts-seed-data.mjs). */

export function catalogCommunityPostId(categoryIndex: number, postIndex: number): string {
  const n = categoryIndex * 3 + postIndex;
  const hex = n.toString(16).padStart(2, "0");
  return `00000000-0000-0000-0004-0000000000${hex}`;
}

export function catalogUserId(index: number): string {
  const hex = index.toString(16).padStart(2, "0");
  return `00000000-0000-0000-0000-00000000a0${hex}`;
}

/** Text-only catalog posts (one question/tip per work category). */
export const CATALOG_TEXT_COVER_POST_IDS = Array.from({ length: 8 }, (_, ci) =>
  catalogCommunityPostId(ci, 2),
);
