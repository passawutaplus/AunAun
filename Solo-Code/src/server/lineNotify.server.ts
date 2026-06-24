import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { formatLineNotification, lineNotificationLink } from "@/lib/lineMessageFormat";
import type { LineNotifyKind } from "@/lib/lineNotificationKinds";

const PRO_TIERS = new Set(["pro", "pro_plus", "inhouse"]);
const QUEUE = "line_messages";

function prefsAllow(raw: unknown, kind: LineNotifyKind): boolean {
  if (!raw || typeof raw !== "object") return true;
  const v = (raw as Record<string, unknown>)[kind];
  return typeof v === "boolean" ? v : true;
}

export async function enqueueLineNotificationForUser(opts: {
  userId: string;
  kind: LineNotifyKind;
  body: string;
  idempotencyKey: string;
  link?: string;
}): Promise<{ sent: boolean; reason?: string }> {
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select(
      "line_messaging_user_id, line_notify_enabled, line_notify_prefs, subscription_tier, display_name, brand_name",
    )
    .eq("user_id", opts.userId)
    .maybeSingle();

  if (!profile?.line_messaging_user_id) return { sent: false, reason: "not_linked" };
  if (!profile.line_notify_enabled) return { sent: false, reason: "disabled" };
  if (!prefsAllow(profile.line_notify_prefs, opts.kind))
    return { sent: false, reason: "kind_disabled" };

  const tier = profile.subscription_tier ?? "free";
  if (!PRO_TIERS.has(tier)) return { sent: false, reason: "not_pro" };

  const { data: existing } = await supabaseAdmin
    .from("line_send_log")
    .select("id")
    .eq("message_id", opts.idempotencyKey)
    .maybeSingle();
  if (existing) return { sent: true, reason: "duplicate" };

  const messageId = crypto.randomUUID();
  const { error: logErr } = await supabaseAdmin.from("line_send_log").insert({
    message_id: opts.idempotencyKey,
    user_id: opts.userId,
    line_user_id: profile.line_messaging_user_id,
    kind: opts.kind,
    status: "pending",
  });
  if (logErr) {
    console.error("[line-notify]", logErr.message);
    return { sent: false, reason: "log_failed" };
  }

  const text = formatLineNotification(opts.kind, opts.body, {
    link: opts.link ?? lineNotificationLink(opts.kind),
    displayName: profile.display_name,
    brandName: profile.brand_name,
  });

  const { error } = await supabaseAdmin.rpc("enqueue_email", {
    queue_name: QUEUE,
    payload: {
      message_id: messageId,
      line_user_id: profile.line_messaging_user_id,
      text,
      user_id: opts.userId,
      kind: opts.kind,
      idempotency_key: opts.idempotencyKey,
      queued_at: new Date().toISOString(),
    },
  });

  if (error) {
    console.error("[line-notify]", error.message);
    return { sent: false, reason: "enqueue_failed" };
  }

  return { sent: true };
}

export async function findUserIdByEmail(email: string): Promise<string | null> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return null;
  const { data } = await supabaseAdmin
    .from("profiles")
    .select("user_id")
    .ilike("email", normalized)
    .maybeSingle();
  return data?.user_id ?? null;
}
