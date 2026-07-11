import { supabase } from "@/integrations/supabase/client";

export const MAX_COMMUNITY_USER_TAGS = 5;

export type TaggedUserSummary = {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  username: string | null;
};

export function taggedUserIds(users: TaggedUserSummary[]): string[] {
  return users.map((u) => u.user_id);
}

export async function fetchMutualFollowCandidates(userId: string): Promise<TaggedUserSummary[]> {
  const [followingRes, followersRes] = await Promise.all([
    supabase.from("follows").select("following_id").eq("follower_id", userId),
    supabase.from("follows").select("follower_id").eq("following_id", userId),
  ]);
  if (followingRes.error) throw followingRes.error;
  if (followersRes.error) throw followersRes.error;

  const followingIds = new Set((followingRes.data ?? []).map((r) => r.following_id));
  const mutualIds = (followersRes.data ?? [])
    .map((r) => r.follower_id)
    .filter((id) => id !== userId && followingIds.has(id));

  if (!mutualIds.length) return [];

  const { data: profs, error } = await supabase
    .from("profiles_public")
    .select("user_id, display_name, avatar_url, username")
    .in("user_id", mutualIds);
  if (error) throw error;

  const byId = new Map((profs ?? []).map((p) => [p.user_id, p]));
  return mutualIds
    .filter((id) => byId.has(id))
    .map((id) => {
      const p = byId.get(id)!;
      return {
        user_id: p.user_id,
        display_name: p.display_name ?? p.username ?? "ผู้ใช้",
        avatar_url: p.avatar_url,
        username: p.username,
      };
    });
}

export async function fetchTaggedUserSummaries(ids: string[]): Promise<TaggedUserSummary[]> {
  if (!ids.length) return [];
  const { data, error } = await supabase
    .from("profiles_public")
    .select("user_id, display_name, avatar_url, username")
    .in("user_id", ids);
  if (error) throw error;
  const byId = new Map((data ?? []).map((p) => [p.user_id, p as TaggedUserSummary]));
  return ids
    .filter((id) => byId.has(id))
    .map((id) => {
      const p = byId.get(id)!;
      return {
        user_id: p.user_id,
        display_name: p.display_name ?? p.username ?? "ผู้ใช้",
        avatar_url: p.avatar_url,
        username: p.username,
      };
    });
}

export async function resolveTaggedUserIds(
  authorId: string,
  ids: string[] | undefined,
): Promise<string[]> {
  const unique = Array.from(new Set(ids ?? [])).filter((id) => id !== authorId);
  if (!unique.length) return [];

  const candidates = await fetchMutualFollowCandidates(authorId);
  const allowed = new Set(candidates.map((c) => c.user_id));
  const valid = unique.filter((id) => allowed.has(id));
  if (valid.length !== unique.length) {
    throw new Error("แท็กได้เฉพาะคนที่ติดตามกันและกัน");
  }
  return valid;
}
