import { anthemDb } from "@/integrations/supabase/client";

/**
 * Adds an email to a Founding campaign's waitlist (signed-out visitors can join).
 * `anthem.join_founding_waitlist` (migration 20261113130000) answers the same way for a new and an
 * already-listed email, so nobody can probe who is on the list. No money, no account needed.
 */
export async function joinFoundingWaitlist(campaign: string, email: string, isTest: boolean): Promise<void> {
  const { error } = await anthemDb.rpc(
    "join_founding_waitlist" as never,
    { _campaign: campaign, _email: email, _is_test: isTest } as never,
  );
  if (error) throw error;
}
