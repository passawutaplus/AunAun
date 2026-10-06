"use server";

import { revalidatePath } from "next/cache";
import { assertAdmin } from "@/lib/admin";
import { audit } from "@/lib/admin-rpc";
import { itemIdFrom } from "@/lib/item-id";
import { sendEmail, takedownReplyText } from "@/ops/email";
import { OpsRepo } from "@/ops/repo";
import { serviceClient } from "@/seeder/repo";

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/;

/**
 * Copyright notice by email or from a Discover report: remove the image for good (files deleted, block list updated so it
 * never returns), close the report, and email the reporter that it is gone. Without RESEND_API_KEY the mail is not sent
 * and the report page shows a ready-made mailto reply instead.
 */
export async function takedownAndReply(formData: FormData) {
  const by = await assertAdmin();
  const itemId = itemIdFrom(String(formData.get("item") ?? ""));
  if (!itemId) throw new Error("ไม่พบ ID ของรูป (วาง UUID หรือลิงก์ที่มี ID)");
  const reportId = itemIdFrom(String(formData.get("report_id") ?? ""));
  const emailRaw = String(formData.get("email") ?? "").trim().slice(0, 200);
  const email = EMAIL.test(emailRaw) ? emailRaw : "";
  const note = String(formData.get("note") ?? "").trim().slice(0, 600);

  const { title } = await new OpsRepo().deleteTakedown(itemId, by);
  await audit("takedown.email", "discover_item", itemId);

  let sent = false;
  if (email) {
    const reply = takedownReplyText(title, note);
    sent = await sendEmail(email, reply.subject, reply.text, { from: process.env.TAKEDOWN_FROM_EMAIL });
  }

  const db = serviceClient();
  const patch = { status: "resolved", resolution_note: note || "removed", replied_at: sent ? new Date().toISOString() : null };
  if (reportId) {
    await db.from("discover_reports").update(patch).eq("id", reportId);
  } else {
    // Other open reports about the same image are settled by the same removal.
    await db.from("discover_reports").update(patch).eq("item_id", itemId).eq("status", "open");
  }
  revalidatePath("/admin/reports");
  revalidatePath("/admin/seeder");
}
