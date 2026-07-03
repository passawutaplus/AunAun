import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWelcomePxCap } from "@/hooks/useWelcomeMissionCatalog";
import {
  dismissOnboarding,
  getOnboardingVisits,
  isOnboardingCelebrated,
  isOnboardingDismissed,
  markOnboardingCelebrated,
  ONBOARDING_VISIT_IDS,
  parseOnboardingVisits,
  subscribeOnboardingUpdates,
} from "@/lib/onboardingStorage";
import {
  isTaskDone,
  ONBOARDING_TASKS,
  type OnboardingSignals,
  type OnboardingTaskId,
} from "@/lib/onboardingTasks";

export type OnboardingTaskItem = {
  id: OnboardingTaskId;
  title: string;
  description: string;
  href: string;
  done: boolean;
};

export function useOnboardingChecklist(userId: string | undefined) {
  const qc = useQueryClient();
  const { data: welcomeCap = 100 } = useWelcomePxCap();
  const [dismissed, setDismissed] = useState(false);
  const [celebrated, setCelebrated] = useState(false);
  const [visitTick, setVisitTick] = useState(0);

  useEffect(() => {
    if (!userId) return;
    setDismissed(isOnboardingDismissed(userId));
    setCelebrated(isOnboardingCelebrated(userId));
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    return subscribeOnboardingUpdates(() => {
      setVisitTick((t) => t + 1);
      qc.invalidateQueries({ queryKey: ["onboarding-checklist", userId] });
    });
  }, [userId, qc]);

  const { data, isLoading } = useQuery({
    queryKey: ["onboarding-checklist", userId, visitTick],
    enabled: !!userId,
    staleTime: 60_000,
    queryFn: async (): Promise<
      OnboardingSignals & { claimedPx: number; claimedMissionIds: string[] }
    > => {
      const uid = userId!;
      const [
        profileRes,
        publishedRes,
        communityPostRes,
        followRes,
        likeRes,
        communityLikeRes,
        claimsRes,
      ] = await Promise.all([
        supabase
          .from("profiles")
          .select("avatar_url, username, bio, skills, onboarding_visits")
          .eq("user_id", uid)
          .maybeSingle(),
        supabase
          .from("projects")
          .select("id", { count: "exact", head: true })
          .eq("owner_id", uid)
          .eq("status", "Published"),
        supabase
          .from("community_posts")
          .select("id", { count: "exact", head: true })
          .eq("author_id", uid)
          .eq("status", "published"),
        supabase
          .from("follows")
          .select("follower_id", { count: "exact", head: true })
          .eq("follower_id", uid),
        supabase
          .from("project_likes")
          .select("project_id", { count: "exact", head: true })
          .eq("user_id", uid),
        supabase
          .from("community_post_likes")
          .select("post_id", { count: "exact", head: true })
          .eq("user_id", uid),
        supabase
          .from("welcome_mission_claims")
          .select("mission_id, reward_px")
          .eq("user_id", uid),
      ]);

      if (profileRes.error) throw profileRes.error;
      if (publishedRes.error) throw publishedRes.error;
      if (communityPostRes.error) throw communityPostRes.error;
      if (followRes.error) throw followRes.error;
      if (likeRes.error) throw likeRes.error;
      if (communityLikeRes.error) throw communityLikeRes.error;
      if (claimsRes.error) throw claimsRes.error;

      const profile = profileRes.data;
      const skills = (profile?.skills as string[] | null) ?? [];

      const dbVisits = parseOnboardingVisits(profile?.onboarding_visits);
      const localVisits = getOnboardingVisits(uid);
      const visits = { ...dbVisits };

      const pendingVisitSync = ONBOARDING_VISIT_IDS.filter((id) => localVisits[id] && !dbVisits[id]);
      if (pendingVisitSync.length > 0) {
        await Promise.all(
          pendingVisitSync.map((id) =>
            supabase.rpc("mark_onboarding_visit", { _visit_id: id }),
          ),
        );
        for (const id of pendingVisitSync) visits[id] = true;
      }

      const claimedMissionIds = (claimsRes.data ?? []).map((c) => c.mission_id);
      const claimedPx = (claimsRes.data ?? []).reduce((s, c) => s + (c.reward_px ?? 0), 0);

      return {
        hasAvatar: !!profile?.avatar_url?.trim(),
        hasUsername: !!profile?.username?.trim(),
        bioLength: (profile?.bio ?? "").trim().length,
        skillsCount: skills.length,
        publishedCount: publishedRes.count ?? 0,
        communityPostCount: communityPostRes.count ?? 0,
        followCount: followRes.count ?? 0,
        likeCount: likeRes.count ?? 0,
        communityLikeCount: communityLikeRes.count ?? 0,
        visits,
        claimedPx,
        claimedMissionIds,
      };
    },
  });

  const tasks: OnboardingTaskItem[] = useMemo(() => {
    const signals = data ?? {
      hasAvatar: false,
      hasUsername: false,
      bioLength: 0,
      skillsCount: 0,
      publishedCount: 0,
      communityPostCount: 0,
      followCount: 0,
      likeCount: 0,
      communityLikeCount: 0,
      visits: {},
    };
    return ONBOARDING_TASKS.map((t) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      href: t.href,
      done: isTaskDone(t.id, signals),
    }));
  }, [data]);

  const doneCount = tasks.filter((t) => t.done).length;
  const total = tasks.length;
  const percent = total ? Math.round((doneCount / total) * 100) : 0;
  const allDone = doneCount === total && total > 0;
  const claimedMissionIds = new Set(data?.claimedMissionIds ?? []);
  const allMissionsClaimed =
    total > 0 && ONBOARDING_TASKS.every((t) => claimedMissionIds.has(t.id));
  const signals = data;

  const dismiss = () => {
    if (!userId) return;
    dismissOnboarding(userId);
    setDismissed(true);
  };

  const celebrate = () => {
    if (!userId) return;
    markOnboardingCelebrated(userId);
    setCelebrated(true);
  };

  const visible = !!userId && !dismissed && !isLoading;

  return {
    tasks,
    doneCount,
    total,
    percent,
    allDone,
    allMissionsClaimed,
    claimedPx: data?.claimedPx ?? 0,
    welcomeCap,
    signals,
    visible,
    dismissed,
    celebrated,
    isLoading,
    dismiss,
    celebrate,
  };
}
