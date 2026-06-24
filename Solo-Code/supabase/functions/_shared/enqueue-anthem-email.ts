import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import {
  anthemEmailFrom,
  renderAnthemEmail,
  type AnthemEmailTemplate,
} from "./anthem-email-html.ts";

export async function enqueueAnthemNotificationEmail(
  admin: SupabaseClient,
  opts: {
    template: AnthemEmailTemplate;
    templateName: string;
    recipientEmail: string;
    templateData: Record<string, unknown>;
    idempotencyKey: string;
    label: string;
  },
): Promise<{ ok: boolean; duplicate?: boolean; error?: string }> {
  const normalized = opts.recipientEmail.toLowerCase().trim();
  const { data: existing } = await admin
    .from("email_send_log")
    .select("id")
    .eq("message_id", opts.idempotencyKey)
    .maybeSingle();
  if (existing) return { ok: true, duplicate: true };

  const { html, text, subject } = renderAnthemEmail(opts.template, opts.templateData);
  const messageId = crypto.randomUUID();
  const { from, senderDomain } = anthemEmailFrom();

  await admin.from("email_send_log").insert({
    message_id: messageId,
    template_name: opts.templateName,
    recipient_email: normalized,
    status: "pending",
  });

  const { error: queueErr } = await admin.rpc("enqueue_email", {
    queue_name: "transactional_emails",
    payload: {
      message_id: messageId,
      to: normalized,
      from,
      sender_domain: senderDomain,
      subject,
      html,
      text,
      purpose: "transactional",
      label: opts.label,
      idempotency_key: opts.idempotencyKey,
      queued_at: new Date().toISOString(),
    },
  });

  if (queueErr) {
    console.error(`[${opts.label}] enqueue failed`, queueErr.message);
    return { ok: false, error: queueErr.message };
  }

  return { ok: true };
}

export type AnthemEmailKind =
  | "hire"
  | "chat"
  | "job_match"
  | "collab"
  | "gift"
  | "follow"
  | "job_application"
  | "topup"
  | "cashout";

export async function shouldSendAnthemEmail(
  admin: SupabaseClient,
  userId: string,
  opts: { kind: AnthemEmailKind },
): Promise<{ send: boolean; email?: string; displayName?: string }> {
  let profileQuery = await admin
    .from("profiles")
    .select("display_name, notify_email, notify_hire, notify_job_match")
    .eq("user_id", userId)
    .maybeSingle();

  if (!profileQuery.data) {
    profileQuery = await admin
      .from("profiles")
      .select("display_name, notify_email, notify_hire, notify_job_match")
      .eq("id", userId)
      .maybeSingle();
  }

  const profile = profileQuery.data;

  if (profile?.notify_email === false) return { send: false };
  if (opts.kind === "hire" && profile?.notify_hire === false) return { send: false };
  if (opts.kind === "job_match" && profile?.notify_job_match === false) return { send: false };

  const { data: authUser } = await admin.auth.admin.getUserById(userId);
  const email = authUser?.user?.email;
  if (!email) return { send: false };

  return {
    send: true,
    email,
    displayName: profile?.display_name ?? undefined,
  };
}
