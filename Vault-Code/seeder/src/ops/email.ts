import { SupabaseSeederRepo } from "../seeder/repo";

/**
 * Sends the owner's daily report. Does NOTHING unless both env vars exist (RESEND_API_KEY, OWNER_REPORT_EMAIL)
 * and the single kill switch is off (the kill switch also stops email). Returns true only when a mail was accepted.
 */
export async function sendOwnerEmail(subject: string, text: string, fetchImpl: typeof fetch = fetch): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  const to = process.env.OWNER_REPORT_EMAIL;
  if (!key || !to) return false;
  const flags = await new SupabaseSeederRepo().flags();
  if (flags.killSwitch) return false;
  const res = await fetchImpl("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({ from: process.env.REPORT_FROM_EMAIL || "A+ Vault <onboarding@resend.dev>", to: [to], subject, text }),
  });
  return res.ok;
}
