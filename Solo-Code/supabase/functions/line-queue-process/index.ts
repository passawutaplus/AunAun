// Processes pgmq queue `line_messages` and sends LINE push notifications.
import { createClient } from "npm:@supabase/supabase-js@2";

const QUEUE = "line_messages";
const DLQ = "line_messages_dlq";
const MAX_RETRIES = 5;
const DEFAULT_BATCH = 10;
const DEFAULT_DELAY_MS = 200;
const VT_SECONDS = 120;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

async function pushLineText(lineUserId: string, text: string) {
  const token = Deno.env.get("LINE_CHANNEL_ACCESS_TOKEN");
  if (!token) {
    return { ok: false as const, status: 503, error: "LINE_CHANNEL_ACCESS_TOKEN not configured" };
  }
  const res = await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      to: lineUserId,
      messages: [{ type: "text", text: text.slice(0, 5000) }],
    }),
  });
  if (res.ok) return { ok: true as const, status: res.status };
  const retryAfter = res.headers.get("retry-after");
  let error = res.statusText;
  try {
    error = await res.text();
  } catch {
    /* ignore */
  }
  return {
    ok: false as const,
    status: res.status,
    retryAfterSeconds: retryAfter ? Number(retryAfter) : undefined,
    error,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    return json({ error: "server misconfiguration" }, 500);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ") || authHeader.slice(7).trim() !== serviceKey) {
    return json({ error: "unauthorized" }, 401);
  }

  const admin = createClient(supabaseUrl, serviceKey);

  const { data: state } = await admin
    .from("line_send_state")
    .select("retry_after_until, batch_size, send_delay_ms")
    .maybeSingle();

  if (state?.retry_after_until && new Date(state.retry_after_until) > new Date()) {
    return json({ skipped: true, reason: "rate_limited" });
  }

  const batchSize = state?.batch_size ?? DEFAULT_BATCH;
  const sendDelayMs = state?.send_delay_ms ?? DEFAULT_DELAY_MS;

  const { data: batch, error: readErr } = await admin.rpc("read_email_batch", {
    queue_name: QUEUE,
    batch_size: batchSize,
    vt: VT_SECONDS,
  });

  if (readErr) {
    console.error("[line-queue] read error", readErr.message);
    return json({ error: readErr.message }, 500);
  }

  const messages = (batch ?? []) as Array<{
    msg_id: number;
    read_ct: number;
    message: Record<string, unknown>;
  }>;
  if (messages.length === 0) {
    return json({ processed: 0 });
  }

  let sent = 0;
  let failed = 0;

  for (const msg of messages) {
    const payload = msg.message;
    const messageId = String(payload.message_id ?? "");
    const lineUserId = String(payload.line_user_id ?? "");
    const text = String(payload.text ?? "");

    if (!lineUserId || !text) {
      await admin
        .from("line_send_log")
        .update({
          status: "failed",
          error_message: "missing line_user_id or text",
        })
        .eq("message_id", messageId);
      await admin.rpc("delete_email", { queue_name: QUEUE, message_id: msg.msg_id });
      failed++;
      continue;
    }

    const result = await pushLineText(lineUserId, text);

    if (result.ok) {
      await admin
        .from("line_send_log")
        .update({ status: "sent", error_message: null })
        .eq("message_id", messageId);
      await admin.rpc("delete_email", { queue_name: QUEUE, message_id: msg.msg_id });
      sent++;
    } else if (result.status === 429) {
      const retrySec = result.retryAfterSeconds ?? 60;
      await admin
        .from("line_send_state")
        .update({
          retry_after_until: new Date(Date.now() + retrySec * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", 1);
      break;
    } else if (msg.read_ct >= MAX_RETRIES || result.status === 403) {
      await admin
        .from("line_send_log")
        .update({
          status: "dlq",
          error_message: result.error ?? `HTTP ${result.status}`,
        })
        .eq("message_id", messageId);
      await admin.rpc("move_to_dlq", {
        source_queue: QUEUE,
        dlq_name: DLQ,
        message_id: msg.msg_id,
        payload,
      });
      failed++;
    } else {
      await admin
        .from("line_send_log")
        .update({
          status: "failed",
          error_message: result.error ?? `HTTP ${result.status}`,
        })
        .eq("message_id", messageId);
      failed++;
    }

    if (sendDelayMs > 0) {
      await new Promise((r) => setTimeout(r, sendDelayMs));
    }
  }

  return json({ processed: messages.length, sent, failed });
});
