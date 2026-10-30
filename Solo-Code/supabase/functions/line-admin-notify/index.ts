// Sends the alerts queued in public.admin_line_outbox to the admin LINE group (bot @samecor).
// Woken by pg_net from the triggers and by a 10-minute pg_cron sweep; safe to call at any time:
// it only ever sends rows that are still pending, to the one configured group.
//
// Secrets (Supabase → Edge Functions → Secrets), none of them in code:
//   LINE_SAMECOR_ADMIN_ACCESS_TOKEN   long-lived channel access token of the @samecor Messaging API channel
//   LINE_SAMECOR_ADMIN_GROUP_ID       id of the admin group (the bot answers "/id" in the group)
//   LINE_SAMECOR_ADMIN_IGNORE_EMAILS  optional, comma-separated extra emails to never alert on
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  type DigestInfo,
  type FeedbackInfo,
  type MemberInfo,
  type ReportInfo,
  formatDigest,
  formatFeedback,
  formatMember,
  formatMembersBurst,
  formatReport,
  isIgnoredEmail,
} from "../_shared/line-admin-format.ts";

type OutboxRow = { id: number; kind: "member" | "feedback" | "report" | "digest"; ref_id: string | null; attempts: number };

const MEMBER_BURST_AT = 4; // this many sign-ups in one run -> one summary message

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

async function pushToGroup(token: string, groupId: string, texts: string[]) {
  // LINE allows up to 5 messages per push call; each at most 5000 characters.
  for (let i = 0; i < texts.length; i += 5) {
    const res = await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        to: groupId,
        messages: texts.slice(i, i + 5).map((text) => ({ type: "text", text: text.slice(0, 4900) })),
      }),
    });
    if (!res.ok) {
      let detail = res.statusText;
      try {
        detail = (await res.text()).slice(0, 300);
      } catch {
        /* ignore */
      }
      return { ok: false as const, status: res.status, error: `${res.status} ${detail}` };
    }
  }
  return { ok: true as const };
}

Deno.serve(async (req) => {
  if (req.method !== "POST" && req.method !== "GET") return json({ error: "method not allowed" }, 405);

  const token = Deno.env.get("LINE_SAMECOR_ADMIN_ACCESS_TOKEN");
  const groupId = Deno.env.get("LINE_SAMECOR_ADMIN_GROUP_ID");
  if (!token || !groupId) return json({ skipped: "not configured" });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) return json({ error: "server misconfiguration" }, 500);
  const admin = createClient(supabaseUrl, serviceKey);
  const extraIgnore = (Deno.env.get("LINE_SAMECOR_ADMIN_IGNORE_EMAILS") ?? "").split(",");

  const { data: claimed, error: claimErr } = await admin.rpc("admin_line_claim", { _limit: 20 });
  if (claimErr) {
    console.error("[line-admin] claim", claimErr.message);
    return json({ error: claimErr.message }, 500);
  }
  const rows = (claimed ?? []) as OutboxRow[];
  if (rows.length === 0) return json({ processed: 0 });

  const texts: string[] = [];
  const sentIds: number[] = [];
  const skippedIds: number[] = [];

  // New members: look everyone up at once; drop test accounts; burst -> one message.
  const memberRows = rows.filter((r) => r.kind === "member" && r.ref_id);
  if (memberRows.length > 0) {
    const { data } = await admin.rpc("admin_line_member_info", { _ids: memberRows.map((r) => r.ref_id) });
    const byId = new Map(((data ?? []) as MemberInfo[]).map((m) => [m.id, m]));
    const members: MemberInfo[] = [];
    for (const r of memberRows) {
      const m = r.ref_id ? byId.get(r.ref_id) : undefined;
      if (!m || isIgnoredEmail(m.email, extraIgnore)) skippedIds.push(r.id);
      else {
        members.push(m);
        sentIds.push(r.id);
      }
    }
    if (members.length >= MEMBER_BURST_AT) texts.push(formatMembersBurst(members));
    else for (const m of members) texts.push(formatMember(m));
  }

  for (const r of rows) {
    if (r.kind === "feedback" && r.ref_id) {
      const { data } = await admin.rpc("admin_line_feedback_info", { _id: r.ref_id });
      const f = ((data ?? []) as FeedbackInfo[])[0];
      if (f) {
        texts.push(formatFeedback(f));
        sentIds.push(r.id);
      } else skippedIds.push(r.id);
    } else if (r.kind === "report" && r.ref_id) {
      const { data } = await admin.rpc("admin_line_report_info", { _id: r.ref_id });
      const rep = ((data ?? []) as ReportInfo[])[0];
      if (rep) {
        texts.push(formatReport(rep));
        sentIds.push(r.id);
      } else skippedIds.push(r.id);
    } else if (r.kind === "digest") {
      const { data } = await admin.rpc("admin_line_digest");
      if (data) {
        texts.push(formatDigest(data as DigestInfo));
        sentIds.push(r.id);
      } else skippedIds.push(r.id);
    }
  }

  if (skippedIds.length > 0) {
    await admin.from("admin_line_outbox").update({ status: "skipped", last_error: "ignored or not found" }).in("id", skippedIds);
  }
  if (texts.length === 0) return json({ processed: rows.length, sent: 0, skipped: skippedIds.length });

  const result = await pushToGroup(token, groupId, texts);
  if (result.ok) {
    await admin.from("admin_line_outbox").update({ status: "sent", sent_at: new Date().toISOString(), last_error: null }).in("id", sentIds);
    return json({ processed: rows.length, sent: texts.length, skipped: skippedIds.length });
  }

  // Back to pending (admin_line_claim stops retrying after 5 attempts). Never include the token in logs.
  console.error("[line-admin] push failed", result.error);
  const attemptsById = new Map(rows.map((r) => [r.id, r.attempts]));
  const exhausted = sentIds.filter((id) => (attemptsById.get(id) ?? 0) >= 5);
  const retry = sentIds.filter((id) => !exhausted.includes(id));
  if (retry.length > 0) await admin.from("admin_line_outbox").update({ status: "pending", last_error: result.error }).in("id", retry);
  if (exhausted.length > 0) await admin.from("admin_line_outbox").update({ status: "failed", last_error: result.error }).in("id", exhausted);
  return json({ error: "push failed", status: result.status }, 502);
});
