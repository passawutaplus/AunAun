import { supabase } from "@/integrations/supabase/client";

export const MAX_PORTFOLIO_LINKED_POSTS = 5;

export type LinkedPostSummary = {
  id: string;
  title: string;
  author_id: string;
  gallery_urls: string[];
  author_name?: string;
};

export function linkedPostIds(posts: LinkedPostSummary[]): string[] {
  return posts.map((p) => p.id);
}

export async function fetchLinkedPostSummaries(ids: string[]): Promise<LinkedPostSummary[]> {
  if (!ids.length) return [];
  const { data, error } = await supabase
    .from("community_posts")
    .select("id, title, author_id, gallery_urls")
    .in("id", ids)
    .eq("status", "published");
  if (error) throw error;

  const rows = data ?? [];
  const authorIds = Array.from(new Set(rows.map((r) => r.author_id)));
  const { data: profs } = await supabase
    .from("profiles")
    .select("user_id, display_name, username")
    .in("user_id", authorIds);
  const nameById = new Map(
    (profs ?? []).map((p) => [p.user_id, p.display_name ?? p.username ?? "ผู้ใช้"]),
  );

  const byId = new Map(
    rows.map((r) => [
      r.id,
      {
        id: r.id,
        title: r.title,
        author_id: r.author_id,
        gallery_urls: r.gallery_urls ?? [],
        author_name: nameById.get(r.author_id),
      } satisfies LinkedPostSummary,
    ]),
  );
  return ids.filter((id) => byId.has(id)).map((id) => byId.get(id)!);
}

export async function resolveLinkedPostIds(
  ownerId: string,
  ids: string[] | undefined,
): Promise<string[]> {
  const unique = Array.from(new Set(ids ?? []));
  if (!unique.length) return [];

  const { data, error } = await supabase
    .from("community_posts")
    .select("id")
    .in("id", unique)
    .eq("author_id", ownerId)
    .eq("status", "published");
  if (error) throw error;

  const ownIds = new Set((data ?? []).map((r) => r.id));
  const valid = unique.filter((id) => ownIds.has(id));
  if (valid.length !== unique.length) {
    throw new Error("ลิงก์ได้เฉพาะโพสต์ที่เผยแพร่ของคุณ");
  }
  return valid;
}

/** Owner's linked posts → ensure posts mention this project (bidirectional). */
export async function syncProjectMentionsOnPosts(
  projectId: string,
  postIds: string[],
  ownerId: string,
): Promise<void> {
  if (!postIds.length) return;

  const { data: posts, error } = await supabase
    .from("community_posts")
    .select("id, mentioned_project_ids")
    .in("id", postIds)
    .eq("author_id", ownerId)
    .eq("status", "published");
  if (error) throw error;

  await Promise.all(
    (posts ?? []).map(async (post) => {
      const current = post.mentioned_project_ids ?? [];
      if (current.includes(projectId) || current.length >= 3) return;
      const next = [...current, projectId];
      const { error: uErr } = await supabase
        .from("community_posts")
        .update({ mentioned_project_ids: next, updated_at: new Date().toISOString() })
        .eq("id", post.id)
        .eq("author_id", ownerId);
      if (uErr) throw uErr;
    }),
  );
}

export async function fetchPostsMentioningProject(projectId: string): Promise<LinkedPostSummary[]> {
  const { data, error } = await supabase
    .from("community_posts")
    .select("id, title, author_id, gallery_urls, created_at")
    .contains("mentioned_project_ids", [projectId])
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) throw error;

  const ids = (data ?? []).map((r) => r.id);
  return fetchLinkedPostSummaries(ids);
}

export function isMissingProjectLinkColumnError(err: unknown): boolean {
  const raw = err instanceof Error ? err.message : String(err ?? "");
  return /linked_community_post_ids|collab_user_ids|video_urls|project_collab_invites|does not exist|PGRST204/i.test(
    raw,
  );
}
