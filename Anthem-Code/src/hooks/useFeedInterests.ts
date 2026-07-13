import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { FeedInterestId } from "@/data/feedInterestOptions";
import type { WorkDisciplineId } from "@/data/workDisciplineOptions";
import { assertUsernameAvailable, normalizeUsername } from "@/hooks/useUsernameAvailability";

async function ensureProfileRow(userId: string): Promise<void> {
  const { data: existing } = await supabase
    .from("profiles")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (existing?.user_id) return;

  const { data: { user } } = await supabase.auth.getUser();
  const email = user?.email ?? "";
  const base = email.split("@")[0] || "user";
  const { error } = await supabase.from("profiles").insert({
    id: userId,
    user_id: userId,
    email: email || null,
    display_name: (user?.user_metadata?.display_name as string | undefined) || base,
    username: `${base}_${userId.slice(0, 6)}`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } as Record<string, unknown>);
  if (error && !/duplicate|unique/i.test(error.message)) throw error;
}

export type ProfileOnboardingRow = {
  feed_interests?: string[] | null;
  feed_interests_at?: string | null;
  username?: string | null;
  avatar_url?: string | null;
  cover_url?: string | null;
  opportunity_types?: string[] | null;
  preferred_categories?: string[] | null;
  skills?: string[] | null;
  profile_onboarding_at?: string | null;
};

/** Completed only when user actually picked ≥1 interest (skip must not count). */
export function hasCompletedFeedInterestSurvey(data: {
  feed_interests?: string[] | null;
  feed_interests_at?: string | null;
} | null | undefined): boolean {
  const interests = data?.feed_interests ?? [];
  return Boolean(data?.feed_interests_at) && interests.length > 0;
}

function nonEmptyStrings(raw: string[] | null | undefined): string[] {
  return (raw ?? []).map((s) => s.trim()).filter(Boolean);
}

/** Full first-login wizard: interests + username + looking-for + สายงาน + ความชำนาญ. */
export function hasCompletedProfileOnboarding(
  data: ProfileOnboardingRow | null | undefined,
): boolean {
  if (!data) return false;
  if (data.profile_onboarding_at) return true;
  if (!hasCompletedFeedInterestSurvey(data)) return false;
  if (!data.username?.trim()) return false;
  if (nonEmptyStrings(data.opportunity_types).length < 1) return false;
  if (nonEmptyStrings(data.preferred_categories).length < 1) return false;
  if (nonEmptyStrings(data.skills).length < 1) return false;
  return true;
}

export type ProfileOnboardingSaveInput = {
  feedInterests: FeedInterestId[];
  username: string;
  avatarUrl?: string | null;
  coverUrl?: string | null;
  opportunityTypes: string[];
  preferredCategories: WorkDisciplineId[] | string[];
  skills: string[];
};

export function useFeedInterestSurvey(userId: string | undefined) {
  const qc = useQueryClient();

  const profileQuery = useQuery({
    queryKey: ["profile", userId, "feed-interests"],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select(
          "feed_interests, feed_interests_at, username, avatar_url, cover_url, opportunity_types, preferred_categories, skills, profile_onboarding_at",
        )
        .eq("user_id", userId!)
        .maybeSingle();
      if (error) throw error;
      return data as ProfileOnboardingRow | null;
    },
  });

  const markComplete = useMutation({
    mutationFn: async (interests: FeedInterestId[]) => {
      if (!userId) throw new Error("ยังไม่ได้เข้าสู่ระบบ");
      if (interests.length === 0) {
        throw new Error("เลือกอย่างน้อย 1 แนวที่สนใจ");
      }
      await ensureProfileRow(userId);
      const completedAt = new Date().toISOString();
      const { data, error } = await supabase
        .from("profiles")
        .update({
          feed_interests: interests,
          feed_interests_at: completedAt,
        } as Record<string, unknown>)
        .eq("user_id", userId)
        .select("feed_interests, feed_interests_at")
        .maybeSingle();
      if (error) throw error;
      if (!data?.feed_interests_at) {
        throw new Error("บันทึกไม่สำเร็จ — ลองใหม่อีกครั้ง");
      }
      return { interests, completedAt: data.feed_interests_at as string };
    },
    onSuccess: (result) => {
      qc.setQueryData(["profile", userId, "feed-interests"], (prev: ProfileOnboardingRow | null | undefined) => ({
        ...(prev ?? {}),
        feed_interests: result.interests,
        feed_interests_at: result.completedAt,
      }));
      void qc.invalidateQueries({ queryKey: ["profile", userId, "feed-interests"] });
      void qc.invalidateQueries({ queryKey: ["profile", userId] });
      void qc.invalidateQueries({ queryKey: ["for-you-projects", userId] });
    },
  });

  const saveOnboarding = useMutation({
    mutationFn: async (input: ProfileOnboardingSaveInput) => {
      if (!userId) throw new Error("ยังไม่ได้เข้าสู่ระบบ");
      if (input.feedInterests.length === 0) throw new Error("เลือกอย่างน้อย 1 แนวที่สนใจ");
      if (input.opportunityTypes.length === 0) throw new Error("เลือกอย่างน้อย 1 อย่างที่กำลังมองหา");
      if (input.preferredCategories.length === 0) throw new Error("เลือกอย่างน้อย 1 สายงาน");
      if (input.skills.length === 0) throw new Error("เลือกอย่างน้อย 1 ความชำนาญ");

      const username = normalizeUsername(input.username);
      await assertUsernameAvailable(username, userId);
      await ensureProfileRow(userId);

      const now = new Date().toISOString();
      const payload: Record<string, unknown> = {
        feed_interests: input.feedInterests,
        feed_interests_at: now,
        username,
        opportunity_status: "open_to_opportunities",
        opportunity_types: input.opportunityTypes,
        preferred_categories: input.preferredCategories,
        skills: input.skills,
        profile_onboarding_at: now,
      };
      if (input.avatarUrl) payload.avatar_url = input.avatarUrl;
      if (input.coverUrl) payload.cover_url = input.coverUrl;

      const { data, error } = await supabase
        .from("profiles")
        .update(payload)
        .eq("user_id", userId)
        .select(
          "feed_interests, feed_interests_at, username, avatar_url, cover_url, opportunity_types, preferred_categories, skills, profile_onboarding_at",
        )
        .maybeSingle();
      if (error) {
        if (error.code === "23505") throw new Error("ชื่อผู้ใช้นี้ถูกใช้แล้ว — ลองชื่ออื่น");
        throw error;
      }
      if (!data?.profile_onboarding_at) {
        throw new Error("บันทึกไม่สำเร็จ — ลองใหม่อีกครั้ง");
      }
      return data as ProfileOnboardingRow;
    },
    onSuccess: (data) => {
      qc.setQueryData(["profile", userId, "feed-interests"], data);
      void qc.invalidateQueries({ queryKey: ["profile", userId, "feed-interests"] });
      void qc.invalidateQueries({ queryKey: ["profile", userId] });
      void qc.invalidateQueries({ queryKey: ["for-you-projects", userId] });
      void qc.invalidateQueries({ queryKey: ["chat-partner-profile"] });
    },
  });

  const interests = (profileQuery.data?.feed_interests ?? []) as FeedInterestId[];
  const shouldShow =
    !!userId && !profileQuery.isLoading && !hasCompletedProfileOnboarding(profileQuery.data);

  return {
    shouldShow,
    interests,
    profile: profileQuery.data,
    isLoading: profileQuery.isLoading,
    save: (selected: FeedInterestId[]) => markComplete.mutateAsync(selected),
    saveOnboarding: (input: ProfileOnboardingSaveInput) => saveOnboarding.mutateAsync(input),
    /** Session-only dismiss — next login shows survey again until they finish. */
    skip: async () => undefined,
    isSaving: markComplete.isPending || saveOnboarding.isPending,
  };
}
