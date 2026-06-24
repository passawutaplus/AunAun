import { supabaseAdmin } from "@/integrations/supabase/client.server";

import { SITE_NAME } from "@/lib/siteUrl";

const FROM_DOMAIN = "solofreelancer.com";
const SENDER_DOMAIN = "notify.solofreelancer.com";

function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function enqueueTemplateEmail(opts: {
  templateName: string;
  recipientEmail: string;
  templateData: Record<string, unknown>;
  idempotencyKey: string;
}): Promise<{ ok: boolean; reason?: string }> {
  const email = opts.recipientEmail.toLowerCase().trim();
  if (!email.includes("@")) return { ok: false, reason: "invalid_email" };

  const { TEMPLATES } = await import("@/lib/email-templates/registry");
  const tpl = TEMPLATES[opts.templateName];
  if (!tpl) return { ok: false, reason: "template_missing" };

  const { data: suppressed } = await supabaseAdmin
    .from("suppressed_emails")
    .select("id")
    .eq("email", email)
    .maybeSingle();
  if (suppressed) return { ok: false, reason: "suppressed" };

  let unsubscribeToken: string;
  const { data: existingToken } = await supabaseAdmin
    .from("email_unsubscribe_tokens")
    .select("token, used_at")
    .eq("email", email)
    .maybeSingle();

  if (existingToken && !existingToken.used_at) {
    unsubscribeToken = existingToken.token;
  } else if (!existingToken) {
    unsubscribeToken = generateToken();
    await supabaseAdmin
      .from("email_unsubscribe_tokens")
      .upsert({ token: unsubscribeToken, email }, { onConflict: "email", ignoreDuplicates: true });
    const { data: stored } = await supabaseAdmin
      .from("email_unsubscribe_tokens")
      .select("token")
      .eq("email", email)
      .maybeSingle();
    unsubscribeToken = stored?.token ?? unsubscribeToken;
  } else {
    return { ok: false, reason: "suppressed" };
  }

  const React = await import("react");
  const { render } = await import("@react-email/components");
  const element = React.createElement(tpl.component, opts.templateData);
  const html = await render(element);
  const text = await render(element, { plainText: true });
  const subject = typeof tpl.subject === "function" ? tpl.subject(opts.templateData) : tpl.subject;

  const messageId = crypto.randomUUID();
  await supabaseAdmin.from("email_send_log").insert({
    message_id: messageId,
    template_name: opts.templateName,
    recipient_email: email,
    status: "pending",
  });

  const { error } = await supabaseAdmin.rpc("enqueue_email", {
    queue_name: "transactional_emails",
    payload: {
      message_id: messageId,
      to: email,
      from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
      sender_domain: SENDER_DOMAIN,
      subject,
      html,
      text,
      purpose: "transactional",
      label: opts.templateName,
      idempotency_key: opts.idempotencyKey,
      unsubscribe_token: unsubscribeToken,
      queued_at: new Date().toISOString(),
    },
  });

  if (error) return { ok: false, reason: error.message };
  return { ok: true };
}
