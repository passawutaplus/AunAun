/** Writes to the signed-in person's own account (welcome step, Settings). */
import { supabase } from "@/integrations/supabase/client";
import { flushPendingSignupConsent, markPendingSignupConsent, recordSignupConsents } from "@/lib/legalCompliance";

/**
 * Welcome step after sign-up (mock Login "profile"): display name + CATEGORY (optional), then the home page.
 * Marks onboarding done so the old first-login wizard never shows. Sign-up by Google / LINE / Apple records the
 * Terms / Privacy consent here (the step repeats the mock's consent sentence).
 */
export async function saveWelcome(userId: string, name: string, categories: string[]): Promise<void> {
  const { error } = await supabase
    .from("profiles")
    .update({ display_name: name.trim(), sc_categories: categories, profile_onboarding_at: new Date().toISOString() } as never)
    .eq("user_id", userId);
  if (error) throw error;
  markPendingSignupConsent();
  if (await recordSignupConsents()) return;
  void flushPendingSignupConsent();
}
