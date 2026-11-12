import { anthemDb } from "@/integrations/supabase/client";
import { makeDemoRef } from "@/lib/support/bag";
import { normaliseSponsorInquiry, type SponsorInquiry } from "@/lib/support/sponsorForm";

export type SponsorReceipt = { ref: string; demo: boolean };

/**
 * Sends a sponsor / collaborate inquiry. Signed-out visitors can send too.
 * Test mode never touches the network. Live mode calls `anthem.submit_sponsor_inquiry`
 * (migration 20261113110000_sponsor_inquiries.sql); it throws when that is not applied yet.
 */
export async function submitSponsorInquiry(input: SponsorInquiry, demo: boolean): Promise<SponsorReceipt> {
  const v = normaliseSponsorInquiry(input);
  if (demo) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    return { ref: makeDemoRef(), demo: true };
  }
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
    } as never,
  );
  if (error) throw error;
  if (typeof data !== "string" || !data) throw new Error("submit_sponsor_inquiry returned no reference");
  return { ref: data, demo: false };
}
