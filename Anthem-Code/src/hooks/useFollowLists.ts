import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getProfilesByIds } from "@/server/queries/profiles";
import { useAuth } from "./useAuth";

export type FollowUser = {
  userId: string;
  displayName: string;
  username: string | null;
  avatarUrl: string | null;
  followedAt: string;
};

async function fetchFollowUsers(
  column: "follower_id" | "following_id",
  userId: string,
  peerColumn: "following_id" | "follower_id",
): Promise<FollowUser[]> {
  const { data, error } = await supabase
    .from("follows")
    .select(`${peerColumn}, created_at`)
    .eq(column, userId)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  const rows = data ?? [];
  if (rows.length === 0) return [];

  const peerIds = rows.map((r) => r[peerColumn] as string);
  const profiles = await getProfilesByIds(peerIds);
  const profileMap = Object.fromEntries(profiles.map((p) => [p.id, p]));

  return rows.map((r) => {
    const peerId = r[peerColumn] as string;
    const profile = profileMap[peerId];
    return {
      userId: peerId,
      displayName: profile?.display_name || profile?.username || "ผู้ใช้",
      username: profile?.username ?? null,
      avatarUrl: profile?.avatar_url ?? null,
      followedAt: r.created_at as string,
    };
  });
}

export const useFollowersList = (userId: string | undefined) =>
  useQuery({
    queryKey: ["followers-list", userId],
    enabled: !!userId,
    queryFn: () => fetchFollowUsers("following_id", userId!, "follower_id"),
  });

export const useFollowingList = (userId: string | undefined) =>
  useQuery({
    queryKey: ["following-list", userId],
    enabled: !!userId,
    queryFn: () => fetchFollowUsers("follower_id", userId!, "following_id"),
  });

export type FollowNotif = FollowUser;

/** Recent users who followed the current user — used in notifications. */
export const useFollowNotifications = () => {
  const { user } = useAuth();
  return useFollowersList(user?.id);
};
