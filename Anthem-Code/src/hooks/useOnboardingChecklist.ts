import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  dismissOnboarding,
  getOnboardingVisits,
  isOnboardingCelebrated,
  isOnboardingDismissed,
  markOnboardingCelebrated,
  parseOnboardingVisits,
  subscribeOnboardingUpdates,
} from "@/lib/onboardingStorage";
import {
  isTaskDone,
  ONBOARDING_TASKS,
  WELCOME_PX_CAP,
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
    queryFn: async (): Promise<OnboardingSignals & { claimedPx: number }> => {
      const uid = userId!;
      const [profileRes, publishedRes, followRes, likeRes, claimsRes] = await Promise.all([
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
          .from("follows")
          .select("follower_id", { count: "exact", head: true })
          .eq("follower_id", uid),
        supabase
          .from("project_likes")
          .select("project_id", { count: "exact", head: true })
          .eq("user_id", uid),
        supabase
          .from("welcome_mission_claims")
          .select("reward_px")
          .eq("user_id", uid),
      ]);

      if (profileRes.error) throw profileRes.error;
      if (publishedRes.error) throw publishedRes.error;
      if (followRes.error) throw followRes.error;
      if (likeRes.error) throw likeRes.error;
      if (claimsRes.error) throw claimsRes.error;

      const profile = profileRes.data;
      const skills = (profile?.skills as string[] | null) ?? [];

      const dbVisits = parseOnboardingVisits(profile?.onboarding_visits);
      const localVisits = getOnboardingVisits(uid);

      const claimedPx = (claimsRes.data ?? []).reduce((s, c) => s + (c.reward_px ?? 0), 0);

      return {
        hasAvatar: !!profile?.avatar_url?.trim(),
        hasUsername: !!profile?.username?.trim(),
        bioLength: (profile?.bio ?? "").trim().length,
        skillsCount: skills.length,
        publishedCount: publishedRes.count ?? 0,
        followCount: followRes.count ?? 0,
        likeCount: likeRes.count ?? 0,
        visits: { ...localVisits, ...dbVisits },
        claimedPx,
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
      followCount: 0,
      likeCount: 0,
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
  const claimedPx = data?.claimedPx ?? 0;
  const allClaimed = claimedPx >= WELCOME_PX_CAP;

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
    allClaimed,
    claimedPx,
    visible,
    dismissed,
    celebrated,
    isLoading,
    dismiss,
    celebrate,
  };
}
