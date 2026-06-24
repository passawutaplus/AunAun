import { createClient } from "npm:@supabase/supabase-js@2";
import {
  createLineSupportTicket,
  handleLineAssistantMessage,
  isHumanHandoffRequest,
} from "../_shared/line-assistant.ts";
import { replyLineText } from "../_shared/line-reply.ts";
import { verifyLineWebhookSignature } from "../_shared/line-webhook-verify.ts";
import { GeminiError } from "../_shared/gemini.ts";

const PRO_TIERS = new Set(["pro", "pro_plus", "inhouse"]);

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

function adminClient() {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
}

async function resolveLinkedProfile(lineUserId: string) {
  const admin = adminClient();
  const { data } = await admin
    .from("profiles")
    .select(
      "user_id, display_name, brand_name, subscription_tier, line_notify_enabled, line_messaging_user_id",
    )
    .eq("line_messaging_user_id", lineUserId)
    .maybeSingle();
  return data;
}

async function handleTextEvent(event: Record<string, unknown>) {
  const replyToken = event.replyToken as string | undefined;
  const source = event.source as { userId?: string } | undefined;
  const lineUserId = source?.userId;
  const message = event.message as { type?: string; text?: string; id?: string } | undefined;

  if (!replyToken || !lineUserId || message?.type !== "text") return;

  const text = String(message.text ?? "").trim();
  const profile = await resolveLinkedProfile(lineUserId);

  if (!profile?.user_id) {
    await replyLineText(
      replyToken,
      "ยังไม่ได้เชื่อมบัญชี So1o นะ\nเปิด https://solofreelancer.com/line-link แล้วล็อกอิน + เชื่อม LINE ก่อน จึงจะใช้ AI ได้",
    );
    return;
  }

  const tier = profile.subscription_tier ?? "free";
  if (!PRO_TIERS.has(tier)) {
    await replyLineText(
      replyToken,
      "ฟีเจอร์นี้สำหรับสมาชิก Pro ขึ้นไปนะ\nดูแพ็กได้ที่ https://solofreelancer.com/pricing",
    );
    return;
  }

  if (isHumanHandoffRequest(text)) {
    const ticket = await createLineSupportTicket(profile.user_id, text);
    const ticketRef = ticket?.ticket_number ? ` (#${ticket.ticket_number})` : "";
    await replyLineText(
      replyToken,
      `รับเรื่องแล้ว${ticketRef} ทีมงานจะตอบกลับในเวลาทำการ\n\nถ้ามีคำถามทั่วไป พิมพ์ถาม AI ได้เลย — ใช้เครดิตร่วมกับ Assistant บนเว็บ`,
    );
    return;
  }

  try {
    const { reply } = await handleLineAssistantMessage({
      userId: profile.user_id,
      message: text,
      displayName: profile.display_name,
      brandName: profile.brand_name,
      messageId: message.id,
    });
    await replyLineText(replyToken, reply);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[line-webhook] assistant", msg, e);
    const userMsg = msg.includes("GEMINI_API_KEY")
      ? "ระบบ AI ยังไม่พร้อมชั่วคราว ลองใหม่ภายหลังหรือพิมพ์「ทีมงาน」"
      : e instanceof GeminiError && e.status === 429
        ? "AI ยุ่งอยู่ รอสักครู่แล้วลองใหม่นะ หรือพิมพ์「ทีมงาน」"
        : "ระบบขัดข้องชั่วคราว ลองใหม่อีกครั้งนะ หรือพิมพ์「ทีมงาน」";
    await replyLineText(replyToken, userMsg);
  }
}

async function handlePostbackEvent(event: Record<string, unknown>) {
  const replyToken = event.replyToken as string | undefined;
  const data = String((event.postback as { data?: string } | undefined)?.data ?? "");
  if (!replyToken) return;

  if (data === "mode=human") {
    await replyLineText(replyToken, "พิมพ์「ทีมงาน」แล้วบอกเรื่องที่อยากให้ช่วยได้เลย");
    return;
  }

  if (data === "mode=ai") {
    await replyLineText(
      replyToken,
      "ปรึกษา AI ได้เลย — ใช้เครดิตร่วมกับ So1o Assistant บนเว็บ\nพิมพ์คำถามเรื่องงาน ราคา ลูกค้า ภาษี ฯลฯ",
    );
  }
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const rawBody = await req.text();
  const signature = req.headers.get("x-line-signature");
  const valid = await verifyLineWebhookSignature(signature, rawBody);
  if (!valid) return new Response("invalid signature", { status: 401 });

  let payload: { events?: Array<Record<string, unknown>> };
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  const events = payload.events ?? [];
  for (const event of events) {
    if (event.type === "message") {
      await handleTextEvent(event);
    } else if (event.type === "postback") {
      await handlePostbackEvent(event);
    }
  }

  return json({ ok: true });
});
