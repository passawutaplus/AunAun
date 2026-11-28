/** The signed-in person's own account rows for the new design (welcome step, Settings). */
import { supabase } from "@/integrations/supabase/client";

export type OnboardingRow = {
  user_id: string;
  username: string | null;
  display_name: string | null;
  sc_categories: string[] | null;
  feed_interests: string[] | null;
  feed_interests_at: string | null;
  profile_onboarding_at: string | null;
};

/** What the welcome step ("Nice to meet you": name + CATEGORY) needs to know. */
export async function getMyOnboarding(userId: string): Promise<OnboardingRow | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("user_id, username, display_name, sc_categories, feed_interests, feed_interests_at, profile_onboarding_at" as "*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return (data as unknown as OnboardingRow | null) ?? null;
}
