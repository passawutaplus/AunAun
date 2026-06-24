import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";
import { formatLineNotification } from "./line-message-format.ts";

type LineNotifyKind =
  | "portal_slip"
  | "portal_tracker_comment"
  | "portal_brief"
  | "portal_planner"
  | "portal_quotation"
  | "anthem_hire"
  | "anthem_chat"
  | "anthem_job_match"
  | "anthem_collab"
  | "anthem_gift"
  | "anthem_follow"
  | "anthem_job_application"
  | "anthem_topup"
  | "anthem_cashout"
  | "inhouse_invite"
  | "inhouse_member_join"
  | "inhouse_chat"
  | "inhouse_task"
  | "support_ticket"
  | "billing";

const QUEUE = "line_messages";

function adminClient(): SupabaseClient {
  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return createClient(url, key);
}

function prefsAllow(raw: unknown, kind: LineNotifyKind): boolean {
  if (!raw || typeof raw !== "object") return true;
  const v = (raw as Record<string, unknown>)[kind];
  return typeof v === "boolean" ? v : true;
}

export async function enqueueLineNotification(opts: {
  userId: string;
  kind: LineNotifyKind;
  body: string;
  idempotencyKey: string;
  link?: string;
}): Promise<{ sent: boolean; reason?: string }> {
  const admin = adminClient();

  const { data: profile } = await admin
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
  if (tier !== "pro" && tier !== "pro_plus" && tier !== "inhouse") {
    return { sent: false, reason: "not_pro" };
  }

  const { data: existing } = await admin
    .from("line_send_log")
    .select("id")
    .eq("message_id", opts.idempotencyKey)
    .maybeSingle();
  if (existing) return { sent: true, reason: "duplicate" };

  const messageId = crypto.randomUUID();
  await admin.from("line_send_log").insert({
    message_id: opts.idempotencyKey,
    user_id: opts.userId,
    line_user_id: profile.line_messaging_user_id,
    kind: opts.kind,
    status: "pending",
  });

  const text = formatLineNotification(opts.kind, opts.body, {
    link: opts.link,
    displayName: profile.display_name,
    brandName: profile.brand_name,
  });

  const { error } = await admin.rpc("enqueue_email", {
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
    console.error("[line-enqueue]", error.message);
    return { sent: false, reason: "enqueue_failed" };
  }

  return { sent: true };
}
