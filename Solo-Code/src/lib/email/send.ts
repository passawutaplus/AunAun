import { supabase } from "@/integrations/supabase/client";

export interface SendTransactionalEmailParams {
  templateName: "project-alert" | "payment-success" | (string & {});
  recipientEmail: string;
  /** Stable key derived from triggering event ID — prevents duplicates on retries. */
  idempotencyKey?: string;
  /** Per-recipient props passed as React props to the template component. */
  templateData?: Record<string, unknown>;
}

/**
 * Enqueue a transactional email through the So1o queue-backed sender.
 * Safe to call from any client-side trigger after the user is authenticated.
 *
 * Never throws — caller should not let an email failure break the main flow.
 */
export async function sendTransactionalEmail(params: SendTransactionalEmailParams) {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) {
      console.warn("[email] skipped — no session", { template: params.templateName });
      return { ok: false, reason: "no_session" as const };
    }

    const res = await fetch("/lovable/email/transactional/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        templateName: params.templateName,
        recipientEmail: params.recipientEmail,
        idempotencyKey: params.idempotencyKey,
        templateData: params.templateData,
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error("[email] send failed", {
        status: res.status,
        detail,
        template: params.templateName,
      });
      return { ok: false as const, status: res.status };
    }
    return { ok: true as const, data: await res.json().catch(() => ({})) };
  } catch (err) {
    console.error("[email] send threw", err);
    return { ok: false as const, reason: "exception" as const };
  }
}
