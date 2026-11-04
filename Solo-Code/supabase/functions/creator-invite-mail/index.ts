/**
 * Creator Invitation — sweep, woken every 10 minutes by pg_cron (anthem.creator_invite_wake).
 * Safe to call by anyone: it only acts on rows that are already due.
 *   1. queue the single automatic reminder (5 days after sending, if the artist has not started)
 *   2. send due outbox mail (scheduled invitations included) within the 50/hour bulk budget
 *   3. mark expired invitations
 *   4. expire unused one-time passwords after 7 days (rotate to an unknown random password)
 *   5. purge declined invitations after 30 days, and old rate-limit rows
 */
import { createClient } from "npm:@supabase/supabase-js@2";
import { supabaseSecretKey } from "../_shared/supabase-keys.ts";
import {
  REMINDER_AFTER_DAYS,
  enqueueEmail,
  logEvent,
  processOutbox,
  purgeInvitation,
  randomPassword,
} from "../_shared/creator-invite-core.ts";

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("method_not_allowed", { status: 405 });
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, supabaseSecretKey());
  const anthem = admin.schema("anthem");
  const now = new Date();
  const nowIso = now.toISOString();
  const summary: Record<string, unknown> = {};

  // 1) Reminders
  const remindBefore = new Date(now.getTime() - REMINDER_AFTER_DAYS * 86400_000).toISOString();
  const { data: toRemind } = await anthem
    .from("creator_invitations")
    .select("id")
    .eq("auto_reminder", true)
    .is("reminder_sent_at", null)
    .is("unsubscribed_at", null)
    .is("revoked_at", null)
    .in("status", ["sent", "opened"])
    .not("contact_email", "is", null)
    .lt("sent_at", remindBefore)
    .gt("expires_at", nowIso)
    .limit(100);
  let reminders = 0;
  for (const r of toRemind ?? []) {
    const { count } = await anthem
      .from("invite_email_outbox")
      .select("id", { count: "exact", head: true })
      .eq("invitation_id", r.id)
      .eq("kind", "reminder");
    if ((count ?? 0) > 0) continue;
    await enqueueEmail(admin, r.id, "reminder");
    // reminder_sent_at doubles as "queued" so the sweep never queues a second automatic reminder
    await anthem.from("creator_invitations").update({ reminder_sent_at: nowIso }).eq("id", r.id);
    await logEvent(admin, r.id, "reminder_queued", "system", null, { auto: true });
    reminders++;
  }
  summary.reminders_queued = reminders;

  // 2) Mail
  summary.mail = await processOutbox(admin, 60);

  // 3) Expiry
  const { data: expired } = await anthem
    .from("creator_invitations")
    .update({ status: "expired" })
    .in("status", ["draft", "sent", "opened", "started"])
    .lt("expires_at", nowIso)
    .select("id");
  for (const e of expired ?? []) await logEvent(admin, e.id, "expired", "system");
  summary.expired = expired?.length ?? 0;

  // 4) One-time passwords not replaced within 7 days stop working
  const { data: temp } = await anthem
    .from("creator_invitations")
    .select("id, user_id")
    .not("account_temp_expires_at", "is", null)
    .lt("account_temp_expires_at", nowIso)
    .limit(50);
  let rotated = 0;
  for (const t of temp ?? []) {
    if (t.user_id) {
      const { data: u } = await admin.auth.admin.getUserById(t.user_id);
      if (u?.user?.user_metadata?.must_change_password === true) {
        await admin.auth.admin.updateUserById(t.user_id, { password: randomPassword(32) });
        await logEvent(admin, t.id, "temp_password_expired", "system");
        rotated++;
      }
    }
    await anthem
      .from("creator_invitations")
      .update({ account_temp_expires_at: null })
      .eq("id", t.id);
  }
  summary.temp_passwords_expired = rotated;

  // 5) Purge declined data after 30 days; trim rate-limit rows
  const { data: purge } = await anthem
    .from("creator_invitations")
    .select("id")
    .eq("status", "declined")
    .lt("delete_after", nowIso)
    .limit(50);
  for (const p of purge ?? []) await purgeInvitation(admin, p.id);
  summary.purged = purge?.length ?? 0;
  await anthem
    .from("invite_rate_hits")
    .delete()
    .lt("window_start", new Date(now.getTime() - 86400_000).toISOString());

  return new Response(JSON.stringify(summary), { headers: { "Content-Type": "application/json" } });
});
