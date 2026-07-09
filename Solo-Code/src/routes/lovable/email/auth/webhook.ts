import * as React from "react";

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

import { resolveAuthEmailBrand, type AuthEmailBrand } from "@/lib/email/authBrand";

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

import { sendResendEmail } from "@/lib/email/resendSend";
import {
  buildAuthEmailFallbackHtml,
  renderAuthEmailContent,
} from "@/lib/email/renderAuthEmail";

import {

  getAuthHookSecret,

  isSupabaseAuthHook,

  verifySupabaseAuthHook,

  type ParsedAuthEmailHook,

} from "@/lib/email/supabaseAuthHook";



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



/** Supabase Auth hooks require Content-Type: application/json on every response. */
function supabaseHookOk(): Response {
  return Response.json({});
}



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



function buildAuthFallback(
  brand: AuthEmailBrand,
  emailType: string,
  siteName: string,
  confirmationUrl: string,
  token?: string,
): string {
  const copy: Record<string, { title: string; body: string; button: string }> = {
    signup: {
      title: "ยืนยันอีเมล",
      body: "กดปุ่มด้านล่างเพื่อยืนยันอีเมลของคุณ",
      button: "ยืนยันอีเมล",
    },
    recovery: {
      title: "รีเซ็ตรหัสผ่าน",
      body: "กดปุ่มด้านล่างตั้งรหัสผ่านใหม่ — ลิงก์ใช้ได้ครั้งเดียว หมดอายุใน 1 ชั่วโมง",
      button: "ตั้งรหัสผ่านใหม่",
    },
    magiclink: {
      title: "เข้าสู่ระบบ",
      body: "กดปุ่มด้านล่างเพื่อเข้าสู่ระบบ",
      button: "เข้าสู่ระบบ",
    },
    invite: {
      title: "คำเชิญ",
      body: "คุณได้รับคำเชิญ — กดปุ่มด้านล่างเพื่อดำเนินการต่อ",
      button: "ยอมรับคำเชิญ",
    },
    email_change: {
      title: "ยืนยันการเปลี่ยนอีเมล",
      body: "กดปุ่มด้านล่างเพื่อยืนยันการเปลี่ยนอีเมล",
      button: "ยืนยันการเปลี่ยนอีเมล",
    },
    reauthentication: {
      title: "รหัสยืนยันตัวตน",
      body: token ? `รหัสยืนยันของคุณ: ${token}` : "ใช้รหัสยืนยันที่ส่งให้คุณ",
      button: "เปิดแอป",
    },
  };

  const selected = copy[emailType] ?? {
    title: "แจ้งเตือน",
    body: "กดปุ่มด้านล่างเพื่อดำเนินการต่อ",
    button: "เปิดลิงก์",
  };

  return buildAuthEmailFallbackHtml({
    brand,
    siteName,
    confirmationUrl,
    title: selected.title,
    body: selected.body,
    buttonLabel: selected.button,
  });
}



function kickEmailQueue(origin: string, serviceKey: string): void {

  const url = `${origin.replace(/\/$/, "")}/lovable/email/queue/process`;

  void fetch(url, {

    method: "POST",

    headers: { Authorization: `Bearer ${serviceKey}` },

  }).catch((err) => console.warn("Failed to kick email queue", { err }));

}



async function deliverAuthEmail(

  job: ParsedAuthEmailHook,

  options?: { queueKickOrigin?: string },

): Promise<void> {

  const { run_id, emailType, email, confirmationUrl, token, oldEmail, newEmail, brandUrl } = job;



  const brand = resolveAuthEmailBrand(job.brandUrl, job.confirmationUrl);

  console.log("Auth email delivery starting", {
    emailType,
    email_redacted: redactEmail(email),
    run_id,
    brand,
    brandUrl: job.brandUrl?.replace(/token[^&]*/gi, "token=***"),
  });

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

    throw new Error(`Unknown email type: ${emailType}`);

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
  const fallbackHtml = buildAuthFallback(brand, emailType, siteName, confirmationUrl, token);
  const { html, text } = await renderAuthEmailContent(element, fallbackHtml);

  console.log("Auth email rendered", {
    emailType,
    run_id,
    brand,
    html_length: html.length,
    text_length: text.length,
  });

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;



  if (!supabaseUrl || !supabaseServiceKey) {

    console.error("Missing Supabase environment variables");

    throw new Error("Server configuration error");

  }



  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const messageId = crypto.randomUUID();



  if (brand === "anthem" && process.env.RESEND_API_KEY) {

    const resend = await sendResendEmail({

      to: email,

      from: fromAddress,

      subject,

      html,

      text,

      idempotencyKey: run_id || messageId,

      headers: { "X-Entity-Ref-ID": messageId },

    });



    if (resend.ok) {

      await supabase.from("email_send_log").insert({

        message_id: messageId,

        template_name: emailType,

        recipient_email: email,

        status: "sent",

      });

      console.log("Aplus1 auth email sent via Resend", {

        emailType,

        email_redacted: redactEmail(email),

        run_id,

      });

      return;

    }



    console.warn("Resend auth send failed, falling back to queue", {

      emailType,

      run_id,

      error: resend.message,

    });

  }



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

    throw new Error("Failed to enqueue email");

  }



  if (options?.queueKickOrigin) {

    kickEmailQueue(options.queueKickOrigin, supabaseServiceKey);

  }



  console.log("Auth email enqueued", {

    emailType,

    email_redacted: redactEmail(email),

    run_id,

    brand,

  });

}



async function sendAuthEmail(job: ParsedAuthEmailHook): Promise<Response> {

  try {

    await deliverAuthEmail(job);

    return Response.json({ success: true });

  } catch (error) {

    const message = error instanceof Error ? error.message : "Failed to send auth email";

    const status = message === "Server configuration error" ? 500 : 400;

    return Response.json({ error: message }, { status });

  }

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

              return supabaseHookOk();

            }



            const origin = new URL(request.url).origin;

            try {
              await deliverAuthEmail(job, { queueKickOrigin: origin });
            } catch (error) {
              console.error("Supabase auth email delivery failed", {
                error,
                emailType: job.emailType,
                run_id: job.run_id,
                email_redacted: redactEmail(job.email),
              });
            }

            return supabaseHookOk();

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


