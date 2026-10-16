import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProfilesByIds } from "@/core/profiles";

/** Keeps the request URL short; people you follow most recently matter most here. */
const MY_FOLLOWING_CAP = 100;

export type FollowedByPerson = { id: string; name: string; avatar: string | null };

/**
 * For each designer on screen: which people you follow also follow them ("ติดตามโดย …").
 * Follows are public, so this shows nothing a profile page does not already show.
 */
export function useFollowedBy(designerIds: string[]): Map<string, FollowedByPerson[]> {
  const { user } = useAuth();
  const ids = useMemo(() => [...new Set(designerIds)].sort(), [designerIds]);

  const { data: pairs = [] } = useQuery({
    queryKey: ["followed-by", user?.id, ids],
    enabled: !!user?.id && ids.length > 0,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<{ follower_id: string; following_id: string }[]> => {
      const mine = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(MY_FOLLOWING_CAP);
      if (mine.error) return [];
      const myFollowing = (mine.data ?? []).map((r) => r.following_id);
      if (!myFollowing.length) return [];
      const { data, error } = await supabase
        .from("follows")
        .select("follower_id, following_id")
        .in("follower_id", myFollowing)
        .in("following_id", ids);
      if (error) return [];
      return (data ?? []).filter((r) => r.follower_id !== user!.id);
    },
  });

  const peopleIds = useMemo(() => [...new Set(pairs.map((p) => p.follower_id))], [pairs]);
  const { data: profiles } = useProfilesByIds(peopleIds);

  return useMemo(() => {
    const out = new Map<string, FollowedByPerson[]>();
    for (const { follower_id, following_id } of pairs) {
      const p = profiles?.map[follower_id];
      if (!p) continue;
      const list = out.get(following_id) ?? [];
      list.push({ id: follower_id, name: p.display_name || p.username || "ครีเอเตอร์", avatar: p.avatar_url ?? null });
      out.set(following_id, list);
    }
    return out;
  }, [pairs, profiles]);
}
