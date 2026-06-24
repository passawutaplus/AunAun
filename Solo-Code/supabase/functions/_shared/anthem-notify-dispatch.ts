import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import type { AnthemEmailTemplate } from "./anthem-email-html.ts";
import {
  enqueueAnthemNotificationEmail,
  shouldSendAnthemEmail,
  type AnthemEmailKind,
} from "./enqueue-anthem-email.ts";
import { enqueueLineNotification } from "./line-enqueue.ts";

type LineNotifyKind = Parameters<typeof enqueueLineNotification>[0]["kind"];

export async function dispatchAnthemNotification(
  admin: SupabaseClient,
  opts: {
    recipientId: string;
    emailKind: AnthemEmailKind;
    template: AnthemEmailTemplate;
    templateName: string;
    label: string;
    emailIdempotencyKey: string;
    templateData: Record<string, unknown>;
    line?: {
      kind: LineNotifyKind;
      body: string;
      idempotencyKey: string;
      link?: string;
    };
  },
): Promise<{
  ok?: boolean;
  skipped?: boolean;
  reason?: string;
  email: { ok: boolean; duplicate?: boolean; error?: string } | null;
  line: { sent: boolean; reason?: string } | null;
}> {
  const notify = await shouldSendAnthemEmail(admin, opts.recipientId, { kind: opts.emailKind });
  if (!notify.send || !notify.email) {
    return {
      skipped: true,
      reason: "notifications_disabled",
      email: null,
      line: null,
    };
  }

  const templateData = {
    ...opts.templateData,
    recipientName:
      (opts.templateData.recipientName as string | undefined) ?? notify.displayName ?? "คุณ",
  };

  const emailResult = await enqueueAnthemNotificationEmail(admin, {
    template: opts.template,
    templateName: opts.templateName,
    recipientEmail: notify.email,
    idempotencyKey: opts.emailIdempotencyKey,
    label: opts.label,
    templateData,
  });

  let lineResult: { sent: boolean; reason?: string } | null = null;
  if (opts.line) {
    lineResult = await enqueueLineNotification({
      userId: opts.recipientId,
      kind: opts.line.kind,
      body: opts.line.body,
      idempotencyKey: opts.line.idempotencyKey,
      link: opts.line.link,
    });
  }

  return { ok: true, email: emailResult, line: lineResult };
}
