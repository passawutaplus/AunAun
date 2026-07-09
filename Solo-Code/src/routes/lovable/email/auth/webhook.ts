import * as React from "react";
import { render } from "@react-email/components";
import { parseEmailWebhookPayload } from "@lovable.dev/email-js";
import { WebhookError, verifyWebhookRequest } from "@lovable.dev/webhooks-js";
import { createClient } from "@supabase/supabase-js";
import { createFileRoute } from "@tanstack/react-router";
import { SignupEmail } from "@/lib/email-templates/signup";
import { InviteEmail } from "@/lib/email-templates/invite";
import { MagicLinkEmail } from "@/lib/email-templates/magic-link";
import { RecoveryEmail } from "@/lib/email-templates/recovery";
import { EmailChangeEmail } from "@/lib/email-templates/email-change";
import { ReauthenticationEmail } from "@/lib/email-templates/reauthentication";
import { SITE_NAME, SITE_URL } from "@/lib/siteUrl";
import { resolveAuthEmailBrand } from "@/lib/email/authBrand";
import {
  APLUS1_EMAIL_FROM,
  APLUS1_SENDER_DOMAIN,
} from "@/lib/email/aplus1EmailConfig";
import {
  ANTHEM_AUTH_SUBJECTS,
  ANTHEM_EMAIL_TEMPLATES,
  ANTHEM_SITE_NAME,
  ANTHEM_SITE_URL,
} from "@/lib/email/anthemAuthTemplates";
import {
  getAuthHookSecret,
  isSupabaseAuthHook,
  verifySupabaseAuthHook,
  type ParsedAuthEmailHook,
} from "@/lib/email/supabaseAuthHook";

type SendAuthEmailOptions = {
  /** Supabase hooks must respond within 5s — enqueue only, no sync Resend. */
  fastResponse?: boolean;
  queueKickOrigin?: string;
};

const SOLO_EMAIL_SUBJECTS: Record<string, string> = {
  signup: "ยืนยันอีเมลของคุณ — So1o",
  invite: "คุณได้รับคำเชิญเข้าร่วม So1o",
  magiclink: "ลิงก์เข้าสู่ระบบ So1o",
  recovery: "รีเซ็ตรหัสผ่าน So1o",
  email_change: "ยืนยันการเปลี่ยนอีเมล — So1o",
  reauthentication: "รหัสยืนยันตัวตนของคุณ — So1o",
};

const SOLO_EMAIL_TEMPLATES: Record<string, React.ComponentType<any>> = {
  signup: SignupEmail,
  invite: InviteEmail,
  magiclink: MagicLinkEmail,
  recovery: RecoveryEmail,
  email_change: EmailChangeEmail,
  reauthentication: ReauthenticationEmail,
};

const SENDER_DOMAIN = "notify.solofreelancer.com";
const FROM_DOMAIN = "solofreelancer.com";

function redactEmail(email: string | null | undefined): string {
  if (!email) return "***";
  const [localPart, domain] = email.split("@");
  if (!localPart || !domain) return "***";
  return `${localPart[0]}***@${domain}`;
}

type LovableAuthPayload = {
  run_id: string;
  version: string;
  data: {
    action_type: string;
    email: string;
    url: string;
    token?: string;
    old_email?: string;
    new_email?: string;
  };
};

function mapLovablePayload(payload: LovableAuthPayload): ParsedAuthEmailHook {
  return {
    run_id: payload.run_id,
    emailType: payload.data.action_type,
    email: payload.data.email,
    confirmationUrl: payload.data.url,
    token: payload.data.token,
    oldEmail: payload.data.old_email,
    newEmail: payload.data.new_email,
    brandUrl: payload.data.url,
  };
}

function kickEmailQueue(origin: string, serviceKey: string): void {
  const url = `${origin.replace(/\/$/, "")}/lovable/email/queue/process`;
  void fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${serviceKey}` },
  }).catch((err) => console.warn("Failed to kick email queue", { err }));
}

async function sendAuthEmail(
  job: ParsedAuthEmailHook,
  options?: SendAuthEmailOptions,
): Promise<Response> {
  const { run_id, emailType, email, confirmationUrl, token, oldEmail, newEmail, brandUrl } = job;

  const brand = resolveAuthEmailBrand(brandUrl);
  const templates = brand === "anthem" ? ANTHEM_EMAIL_TEMPLATES : SOLO_EMAIL_TEMPLATES;
  const subjects = brand === "anthem" ? ANTHEM_AUTH_SUBJECTS : SOLO_EMAIL_SUBJECTS;
  const siteName = brand === "anthem" ? ANTHEM_SITE_NAME : SITE_NAME;
  const siteUrl = brand === "anthem" ? ANTHEM_SITE_URL : SITE_URL;
  const fromName = brand === "anthem" ? ANTHEM_SITE_NAME : SITE_NAME;
  const fromAddress =
    brand === "anthem" ? APLUS1_EMAIL_FROM : `${fromName} <noreply@${FROM_DOMAIN}>`;
  const senderDomain = brand === "anthem" ? APLUS1_SENDER_DOMAIN : SENDER_DOMAIN;
  const subject = subjects[emailType] || "Notification";

  const EmailTemplate = templates[emailType];
  if (!EmailTemplate) {
    console.error("Unknown email type", { emailType, run_id });
    return Response.json({ error: `Unknown email type: ${emailType}` }, { status: 400 });
  }

  const templateProps = {
    siteName,
    siteUrl,
    recipient: email,
    confirmationUrl,
    token,
    email,
    oldEmail,
    newEmail,
  };

  const element = React.createElement(EmailTemplate, templateProps);
  const html = await render(element);
  const text = options?.fastResponse
    ? undefined
    : await render(element, { plainText: true });

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing Supabase environment variables");
    return Response.json({ error: "Server configuration error" }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const messageId = crypto.randomUUID();

  await supabase.from("email_send_log").insert({
    message_id: messageId,
    template_name: emailType,
    recipient_email: email,
    status: "pending",
  });

  const { error: enqueueError } = await supabase.rpc("enqueue_email", {
    queue_name: "auth_emails",
    payload: {
      run_id,
      message_id: messageId,
      to: email,
      from: fromAddress,
      sender_domain: senderDomain,
      subject,
      html,
      text,
      purpose: "transactional",
      label: emailType,
      idempotency_key: run_id || messageId,
      queued_at: new Date().toISOString(),
    },
  });

  if (enqueueError) {
    console.error("Failed to enqueue auth email", { error: enqueueError, run_id, emailType });
    await supabase.from("email_send_log").insert({
      message_id: messageId,
      template_name: emailType,
      recipient_email: email,
      status: "failed",
      error_message: "Failed to enqueue email",
    });
    return Response.json({ error: "Failed to enqueue email" }, { status: 500 });
  }

  if (options?.fastResponse && options.queueKickOrigin) {
    kickEmailQueue(options.queueKickOrigin, supabaseServiceKey);
  }

  console.log("Auth email enqueued", {
    emailType,
    email_redacted: redactEmail(email),
    run_id,
    brand,
    fastResponse: options?.fastResponse ?? false,
  });

  return new Response(null, { status: 200 });
}

export const Route = createFileRoute("/lovable/email/auth/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const hookSecret = getAuthHookSecret();

        if (!hookSecret) {
          console.error("SEND_EMAIL_HOOK_SECRET / LOVABLE_API_KEY not configured");
          return Response.json({ error: "Server configuration error" }, { status: 500 });
        }

        try {
          if (isSupabaseAuthHook(request)) {
            const job = await verifySupabaseAuthHook(request, hookSecret);
            if (!job) {
              return Response.json({ success: true, skipped: true });
            }
            console.log("Received Supabase auth hook", {
              emailType: job.emailType,
              email_redacted: redactEmail(job.email),
              run_id: job.run_id,
            });
            const origin = new URL(request.url).origin;
            return await sendAuthEmail(job, { fastResponse: true, queueKickOrigin: origin });
          }

          const verified = await verifyWebhookRequest({
            req: request,
            secret: hookSecret,
            parser: parseEmailWebhookPayload,
          });
          const payload = verified.payload as LovableAuthPayload;
          if (!payload.run_id) {
            console.error("Webhook payload missing run_id");
            return Response.json({ error: "Invalid webhook payload" }, { status: 400 });
          }
          if (payload.version !== "1") {
            console.error("Unsupported payload version", {
              version: payload.version,
              run_id: payload.run_id,
            });
            return Response.json(
              { error: `Unsupported payload version: ${payload.version}` },
              { status: 400 },
            );
          }

          console.log("Received Lovable auth event", {
            emailType: payload.data.action_type,
            email_redacted: redactEmail(payload.data.email),
            run_id: payload.run_id,
          });
          return await sendAuthEmail(mapLovablePayload(payload));
        } catch (error) {
          if (error instanceof WebhookError) {
            switch (error.code) {
              case "invalid_signature":
              case "missing_timestamp":
              case "invalid_timestamp":
              case "stale_timestamp":
                console.error("Invalid webhook signature", { error: error.message });
                return Response.json({ error: "Invalid signature" }, { status: 401 });
              case "invalid_payload":
              case "invalid_json":
                console.error("Invalid webhook payload", { error: error.message });
                return Response.json({ error: "Invalid webhook payload" }, { status: 400 });
            }
          }

          console.error("Webhook verification failed", { error });
          return Response.json({ error: "Invalid webhook payload" }, { status: 401 });
        }
      },
    },
  },
});
