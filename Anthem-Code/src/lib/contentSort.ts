import type { CommunityPost } from "@/hooks/useCommunityPosts";

export type ProfileContentSort = "newest" | "popular";

/** Views + weighted likes (same weight as community hero). */
export function popularityScore(views: number, likes: number): number {
  return Math.max(0, views) + Math.max(0, likes) * 3;
}

export function sortCommunityPostsForProfile(
  posts: CommunityPost[],
  mode: ProfileContentSort,
): CommunityPost[] {
  const arr = [...posts];
  if (mode === "newest") {
    return arr.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  }
  return arr.sort(
    (a, b) =>
      popularityScore(b.view_count ?? 0, b.like_count ?? 0) -
      popularityScore(a.view_count ?? 0, a.like_count ?? 0),
  );
}

type ProfileProjectLike = {
  publishedDate?: string;
  created_at?: string;
  views?: number;
  likes?: number;
};

export function sortProjectsForProfile<T extends ProfileProjectLike>(
  projects: T[],
  mode: ProfileContentSort,
): T[] {
  const arr = [...projects];
  if (mode === "newest") {
    return arr.sort(
      (a, b) =>
        new Date(b.publishedDate ?? b.created_at ?? 0).getTime() -
        new Date(a.publishedDate ?? a.created_at ?? 0).getTime(),
    );
  }
  return arr.sort(
    (a, b) =>
      popularityScore(b.views ?? 0, b.likes ?? 0) -
      popularityScore(a.views ?? 0, a.likes ?? 0),
  );
}
