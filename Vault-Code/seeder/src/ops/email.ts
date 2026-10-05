import { SupabaseSeederRepo } from "../seeder/repo";

/** Low-level Resend call. Returns true only when Resend accepted the mail. Does nothing without RESEND_API_KEY. */
export async function sendEmail(
  to: string,
  subject: string,
  text: string,
  opts: { from?: string; fetchImpl?: typeof fetch } = {},
): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key || !to) return false;
  const f = opts.fetchImpl ?? fetch;
  const res = await f("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({ from: opts.from || process.env.REPORT_FROM_EMAIL || "A+ Vault <onboarding@resend.dev>", to: [to], subject, text }),
  });
  return res.ok;
}

/**
 * Sends the owner's daily report. Does NOTHING unless both env vars exist (RESEND_API_KEY, OWNER_REPORT_EMAIL)
 * and the single kill switch is off (the kill switch also stops email). Returns true only when a mail was accepted.
 */
export async function sendOwnerEmail(subject: string, text: string, fetchImpl: typeof fetch = fetch): Promise<boolean> {
  const to = process.env.OWNER_REPORT_EMAIL;
  if (!process.env.RESEND_API_KEY || !to) return false;
  const flags = await new SupabaseSeederRepo().flags();
  if (flags.killSwitch) return false;
  return sendEmail(to, subject, text, { fetchImpl });
}

/** The reply a copyright reporter gets once an image is removed (also used for the mailto fallback in the admin). */
export function takedownReplyText(title: string, note = ""): { subject: string; text: string } {
  return {
    subject: "A+ Vault: the image has been removed",
    text: [
      "Hello,",
      "",
      `Thank you for your notice. We have removed the image${title ? ` “${title}”` : ""} from A+ Vault Discover and blocked it from being added again.`,
      note ? `\n${note}\n` : "",
      "If you believe something else of yours is still shown, reply to this email with the link and we will look at it.",
      "",
      "A+ Vault",
      "",
      "สวัสดีครับ/ค่ะ ขอบคุณที่แจ้งเรา ภาพดังกล่าวถูกนำออกจาก A+ Vault Discover แล้ว และจะไม่ถูกเพิ่มกลับเข้ามาอีก หากยังพบงานอื่นของคุณ ตอบอีเมลนี้พร้อมลิงก์ได้เลย",
    ].join("\n"),
  };
}
