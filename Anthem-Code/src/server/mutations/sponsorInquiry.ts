import { anthemDb } from "@/integrations/supabase/client";
import { normaliseSponsorInquiry, type SponsorInquiry } from "@/lib/support/sponsorForm";

export type SponsorReceipt = { ref: string; demo: boolean };

/**
 * Sends a sponsor / collaborate message. Signed-out visitors can send too.
 * `anthem.submit_sponsor_inquiry` stores it and alerts the admin LINE group. In test mode the row is
 * marked as a test (needs migration 20261113120000); real sends work with or without that migration.
 */
export async function submitSponsorInquiry(input: SponsorInquiry, demo: boolean): Promise<SponsorReceipt> {
  const v = normaliseSponsorInquiry(input);
  const { data, error } = await anthemDb.rpc(
    "submit_sponsor_inquiry" as never,
    {
      _company: v.company,
      _contact: v.contact,
      _email: v.email,
      _line_id: v.lineId,
      _interest: v.interest,
      _budget: v.budget,
      _message: v.message,
      ...(demo ? { _is_test: true } : {}),
    } as never,
  );
  if (error) throw error;
  if (typeof data !== "string" || !data) throw new Error("submit_sponsor_inquiry returned no reference");
  return { ref: data, demo };
}
