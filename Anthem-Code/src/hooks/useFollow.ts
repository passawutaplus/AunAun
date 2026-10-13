import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { notifyAnthem } from "@/lib/notifyAnthem";
import { createBatchLoader } from "@/lib/batchLoader";
import { FOLLOWED_DESIGNERS_KEY } from "@/hooks/useFollowedDesigners";

type FollowSummary = { followers: number; following: number; isFollowing: boolean };

const followSummaryLoader = createBatchLoader<FollowSummary>(async (ids) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.rpc as any)("follow_summary", { ids });
  if (error || !Array.isArray(data)) return null;
  return new Map(
    (data as { user_id: string; followers: number; following: number; is_following: boolean }[]).map((r) => [
      r.user_id,
      { followers: r.followers, following: r.following, isFollowing: r.is_following },
    ]),
  );
});

/** "Does <target> follow <viewer>?" for every card on screen in one request. Keys are `viewer|target`. */
const followsYouLoader = createBatchLoader<boolean>(async (keys) => {
  const byViewer = new Map<string, string[]>();
  for (const key of keys) {
    const [viewer, target] = key.split("|");
    if (!viewer || !target) continue;
    byViewer.set(viewer, [...(byViewer.get(viewer) ?? []), target]);
  }
  const out = new Map<string, boolean>();
  for (const [viewer, targets] of byViewer) {
    const { data, error } = await supabase
      .from("follows")
      .select("follower_id")
      .eq("following_id", viewer)
      .in("follower_id", targets);
    if (error) return null;
    const followers = new Set((data ?? []).map((r) => r.follower_id));
    for (const target of targets) out.set(`${viewer}|${target}`, followers.has(target));
  }
  return out;
});

/** True when `userId` follows the signed-in user (shown as "ติดตามคุณ" / "ติดตามกลับ"). */
export const useFollowsYou = (userId: string | undefined) => {
  const { user } = useAuth();
  const { data } = useQuery({
    queryKey: ["follows-you", user?.id, userId],
    enabled: !!user?.id && !!userId && user.id !== userId,
    staleTime: 60_000,
    queryFn: async () => (await followsYouLoader.load(`${user!.id}|${userId}`)) ?? false,
  });
  return !!data;
};

export const useFollowState = (followingId: string | undefined) => {
  const { user } = useAuth();
  const qc = useQueryClient();

  const counts = useQuery({
    queryKey: ["follow-counts", followingId],
    enabled: !!followingId,
    queryFn: async () => {
      const batched = await followSummaryLoader.load(followingId!);
      if (batched) return { followers: batched.followers, following: batched.following };
      const [followers, following] = await Promise.all([
        supabase.from("follows").select("follower_id", { count: "exact", head: true }).eq("following_id", followingId!),
        supabase.from("follows").select("following_id", { count: "exact", head: true }).eq("follower_id", followingId!),
      ]);
      return { followers: followers.count ?? 0, following: following.count ?? 0 };
    },
  });

  const isFollowing = useQuery({
    queryKey: ["is-following", followingId, user?.id],
    enabled: !!followingId && !!user?.id,
    queryFn: async () => {
      const batched = await followSummaryLoader.load(followingId!);
      if (batched) return batched.isFollowing;
      const { data, error } = await supabase
        .from("follows")
        .select("follower_id")
        .eq("follower_id", user!.id)
        .eq("following_id", followingId!)
        .maybeSingle();
      if (error) throw error;
      return !!data;
    },
  });

  const toggle = useMutation({
    mutationFn: async () => {
      if (!user || !followingId) throw new Error("ต้องเข้าสู่ระบบก่อน");
      if (user.id === followingId) throw new Error("ติดตามตัวเองไม่ได้");
      if (isFollowing.data) {
        const { error } = await supabase
          .from("follows")
          .delete()
          .eq("follower_id", user.id)
          .eq("following_id", followingId);
        if (error) throw error;
        return { followed: false as const };
      }
      const { error } = await supabase
        .from("follows")
        .insert({ follower_id: user.id, following_id: followingId });
      if (error) throw error;
      return { followed: true as const };
    },
    onSuccess: (result) => {
      if (result.followed) {
        notifyAnthem({ event: "follow", following_id: followingId! });
      }
      qc.invalidateQueries({ queryKey: ["follow-counts", followingId] });
      // The viewer's own "following" count changes too (profile header, Portfolio → Designers tab).
      qc.invalidateQueries({ queryKey: ["follow-counts", user?.id] });
      qc.invalidateQueries({ queryKey: ["is-following", followingId, user?.id] });
      qc.invalidateQueries({ queryKey: ["followers-list"] });
      qc.invalidateQueries({ queryKey: ["following-list"] });
      qc.invalidateQueries({ queryKey: ["followed-user-ids", user?.id] });
      qc.invalidateQueries({ queryKey: [FOLLOWED_DESIGNERS_KEY, user?.id] });
      // Following back can make someone taggable as a collaborator.
      qc.invalidateQueries({ queryKey: ["mutual-follow-candidates", user?.id] });
    },
  });

  return {
    followers: counts.data?.followers ?? 0,
    following: counts.data?.following ?? 0,
    isFollowing: !!isFollowing.data,
    isSelf: user?.id === followingId,
    canFollow: !!user,
    toggle: toggle.mutate,
    isPending: toggle.isPending,
  };
};

/** User ids the viewer follows — for Designers "ติดตาม" feed. */
export const useFollowedUserIds = (userId: string | undefined) =>
  useQuery({
    queryKey: ["followed-user-ids", userId],
    enabled: !!userId,
    queryFn: async (): Promise<Set<string>> => {
      const { data, error } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", userId!);
      if (error) throw error;
      return new Set((data ?? []).map((r) => r.following_id));
    },
  });
