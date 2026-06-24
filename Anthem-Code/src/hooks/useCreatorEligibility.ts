import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  computeCreatorEligibility,
  type CreatorEligibilitySnapshot,
} from "@/lib/creatorEligibility";

export function useCreatorEligibility(userId: string | undefined) {
  return useQuery({
    queryKey: ["creator-eligibility", userId],
    enabled: !!userId,
    staleTime: 30_000,
    queryFn: async (): Promise<CreatorEligibilitySnapshot> => {
      const uid = userId!;
      const [claimsRes, publishedRes, followersRes, profileRes] = await Promise.all([
        supabase.from("welcome_mission_claims").select("reward_px").eq("user_id", uid),
        supabase
          .from("projects")
          .select("id", { count: "exact", head: true })
          .eq("owner_id", uid)
          .eq("status", "Published"),
        supabase
          .from("follows")
          .select("follower_id", { count: "exact", head: true })
          .eq("following_id", uid),
        supabase.from("profiles").select("is_verified").eq("user_id", uid).maybeSingle(),
      ]);

      if (claimsRes.error) throw claimsRes.error;
      if (publishedRes.error) throw publishedRes.error;
      if (followersRes.error) throw followersRes.error;
      if (profileRes.error) throw profileRes.error;

      const welcomeClaimedPx = (claimsRes.data ?? []).reduce((s, c) => s + (c.reward_px ?? 0), 0);

      return computeCreatorEligibility({
        welcomeClaimedPx,
        publishedCount: publishedRes.count ?? 0,
        followerCount: followersRes.count ?? 0,
        isVerified: !!(profileRes.data as { is_verified?: boolean } | null)?.is_verified,
      });
    },
  });
}
