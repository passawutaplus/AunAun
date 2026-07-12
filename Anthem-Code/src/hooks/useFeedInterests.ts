import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { FeedInterestId } from "@/data/feedInterestOptions";

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

/** Completed only when user actually picked ≥1 interest (skip must not count). */
export function hasCompletedFeedInterestSurvey(data: {
  feed_interests?: string[] | null;
  feed_interests_at?: string | null;
} | null | undefined): boolean {
  const interests = data?.feed_interests ?? [];
  return Boolean(data?.feed_interests_at) && interests.length > 0;
}

export function useFeedInterestSurvey(userId: string | undefined) {
  const qc = useQueryClient();

  const profileQuery = useQuery({
    queryKey: ["profile", userId, "feed-interests"],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("feed_interests, feed_interests_at")
        .eq("user_id", userId!)
        .maybeSingle();
      if (error) throw error;
      return data as {
        feed_interests?: string[] | null;
        feed_interests_at?: string | null;
      } | null;
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
      qc.setQueryData(["profile", userId, "feed-interests"], {
        feed_interests: result.interests,
        feed_interests_at: result.completedAt,
      });
      void qc.invalidateQueries({ queryKey: ["profile", userId, "feed-interests"] });
      void qc.invalidateQueries({ queryKey: ["profile", userId] });
      void qc.invalidateQueries({ queryKey: ["for-you-projects", userId] });
    },
  });

  const interests = (profileQuery.data?.feed_interests ?? []) as FeedInterestId[];
  const shouldShow =
    !!userId && !profileQuery.isLoading && !hasCompletedFeedInterestSurvey(profileQuery.data);

  return {
    shouldShow,
    interests,
    isLoading: profileQuery.isLoading,
    save: (selected: FeedInterestId[]) => markComplete.mutateAsync(selected),
    /** Session-only dismiss — next login shows survey again until they pick interests. */
    skip: async () => undefined,
    isSaving: markComplete.isPending,
  };
}
