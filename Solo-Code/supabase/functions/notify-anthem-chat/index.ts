import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";
import { enqueueLineNotification } from "../_shared/line-enqueue.ts";
import { corsHeadersForRequest } from "../_shared/cors.ts";
import { anthemSiteUrl } from "../_shared/anthem-email-html.ts";
import {
  enqueueAnthemNotificationEmail,
  shouldSendAnthemEmail,
} from "../_shared/enqueue-anthem-email.ts";

const BodySchema = z.object({
  conversation_id: z.string().uuid(),
  message_id: z.string().uuid().optional(),
});

const json = (req: Request, body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeadersForRequest(req), "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeadersForRequest(req) });
  if (req.method !== "POST") return json(req, { error: "method_not_allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json(req, { error: "unauthorized" }, 401);

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const token = authHeader.slice("Bearer ".length);
  const { data: claims, error: authErr } = await userClient.auth.getClaims(token);
  if (authErr || !claims?.claims?.sub) return json(req, { error: "unauthorized" }, 401);
  const callerId = claims.claims.sub as string;

  let body: z.infer<typeof BodySchema>;
  try {
    body = BodySchema.parse(await req.json());
  } catch {
    return json(req, { error: "invalid_body" }, 400);
  }

  const admin = createClient(supabaseUrl, serviceKey);

  const { data: conv } = await admin
    .from("conversations")
    .select("id, client_id, freelancer_id, project_title")
    .eq("id", body.conversation_id)
    .maybeSingle();
  if (!conv) return json(req, { error: "not_found" }, 404);

  const recipientId = callerId === conv.client_id ? conv.freelancer_id : conv.client_id;
  if (!recipientId || recipientId === callerId)
    return json(req, { skipped: true, reason: "no_recipient" });

  const { data: msgRow } = body.message_id
    ? await admin
        .from("messages")
        .select("id, content, sender_id")
        .eq("id", body.message_id)
        .maybeSingle()
    : await admin
        .from("messages")
        .select("id, content, sender_id")
        .eq("conversation_id", body.conversation_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

  if (!msgRow || msgRow.sender_id !== callerId) return json(req, { error: "forbidden" }, 403);

  const notify = await shouldSendAnthemEmail(admin, recipientId, { kind: "chat" });
  if (!notify.send || !notify.email) {
    return json(req, { skipped: true, reason: "notifications_disabled" });
  }

  const { data: senderProfile } = await admin
    .from("profiles")
    .select("display_name")
    .eq("user_id", callerId)
    .maybeSingle();

  const senderName = senderProfile?.display_name ?? "มีข้อความใหม่";
  const raw = msgRow.content ?? "";
  const preview = raw.length > 120 ? `${raw.slice(0, 120)}…` : raw || "(ไฟล์แนบ)";

  const siteUrl = anthemSiteUrl();
  const emailResult = await enqueueAnthemNotificationEmail(admin, {
    template: "chat-message",
    templateName: "anthem-chat-message",
    recipientEmail: notify.email,
    idempotencyKey: `chat-${msgRow.id}`,
    label: "anthem-chat-message",
    templateData: {
      recipientName: notify.displayName ?? "คุณ",
      senderName,
      conversationTitle: conv.project_title ?? "แชท Pixel100",
      preview,
      actionUrl: `${siteUrl}/chat/${conv.id}`,
    },
  });

  const lineResult = await enqueueLineNotification({
    userId: recipientId,
    kind: "anthem_chat",
    body: `${senderName}: ${preview.slice(0, 200)}`,
    idempotencyKey: `line-chat-${msgRow.id}`,
    link: `/chat/${conv.id}`,
  });

  return json(req, { ok: true, email: emailResult, line: lineResult });
});
