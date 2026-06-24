import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";
import { debitAiQuota, formatAiCreditSuffix, getAiUsageSummary } from "./ai-quota.ts";
import {
  buildBusinessSnapshot,
  BUSINESS_SYSTEM_PROMPT,
  isBusinessQuestion,
} from "./ai-business-snapshot.ts";
import {
  defaultFastModel,
  geminiGenerateText,
  getGeminiApiKey,
  type GeminiChatMessage,
} from "./gemini.ts";
import { AI_DISCLAIMER_TAX_PRICE_PROMPT, RULE_BREVITY_LINE } from "./copy-prompts.ts";

const MENTOR_SYSTEM_PROMPT = `คุณคือ "So1o Mentor" พี่เลี้ยงฟรีแลนซ์ไทย เชี่ยวชาญดีไซน์ ราคาตลาด การคุยลูกค้า และภาษีฟรีแลนซ์
- ${RULE_BREVITY_LINE}
- ห้ามบอกว่าตัวเองเป็น Gemini หรือ Google
- คำแนะนำเรื่องราคา/ภาษี ต้องลงท้ายว่า "${AI_DISCLAIMER_TAX_PRICE_PROMPT}"`;

const FEATURE_BY_PRESET = {
  mentor: { feature: "ai_assistant_mentor", cost: 1 },
  business: { feature: "ai_assistant_business", cost: 5 },
} as const;

type AssistantPreset = keyof typeof FEATURE_BY_PRESET;

const HUMAN_RE = /^(ทีมงาน|แอดมิน|คุยกับคน|support|human)$/i;

function adminClient(): SupabaseClient {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
}

function resolvePreset(message: string): AssistantPreset {
  return isBusinessQuestion(message) ? "business" : "mentor";
}

async function loadRecentHistory(
  admin: SupabaseClient,
  userId: string,
): Promise<GeminiChatMessage[]> {
  const { data } = await admin
    .from("ai_chat_messages")
    .select("role, content")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(8);

  if (!data?.length) return [];
  return [...data].reverse().map((row) => ({
    role: row.role === "assistant" ? ("assistant" as const) : ("user" as const),
    content: String(row.content ?? ""),
  }));
}

export function isHumanHandoffRequest(text: string): boolean {
  return HUMAN_RE.test(text.trim());
}

function appendLineReplyFooter(
  body: string,
  quota: { total_remaining?: number; included_used?: number },
  personal?: { displayName?: string | null; brandName?: string | null },
): string {
  const brand = personal?.brandName?.trim();
  const rawName = personal?.displayName?.trim();
  const name = rawName ? (rawName.startsWith("คุณ") ? rawName : `คุณ${rawName}`) : null;
  const signoff = brand && name ? `${brand} (${name})` : (brand ?? name);

  const lines = [body.trim(), ""];
  if (signoff) lines.push(signoff);
  lines.push(formatAiCreditSuffix(quota));
  return lines.join("\n");
}

export async function createLineSupportTicket(userId: string, message: string) {
  const admin = adminClient();
  const { data, error } = await admin
    .from("support_tickets")
    .insert({
      user_id: userId,
      title: "LINE — ขอคุยกับทีมงาน",
      description: message.slice(0, 2000),
      category: "support",
      source: "line",
      source_feature: "line_assistant",
      priority: "normal",
      status: "new",
    })
    .select("id, ticket_number")
    .maybeSingle();

  if (error) {
    console.error("[line-assistant] support ticket", error.message);
    return null;
  }
  return data;
}

export async function handleLineAssistantMessage(opts: {
  userId: string;
  message: string;
  displayName?: string | null;
  brandName?: string | null;
  messageId?: string;
}): Promise<{ reply: string }> {
  const text = opts.message.trim().slice(0, 500);
  if (!text) {
    return {
      reply: "พิมพ์คำถามมาได้เลยนะ 😊\nหรือพิมพ์「ทีมงาน」ถ้าอยากคุยกับแอดมินจริง",
    };
  }

  const admin = adminClient();
  const preset = resolvePreset(text);
  const { feature, cost } = FEATURE_BY_PRESET[preset];

  const preview = await getAiUsageSummary(opts.userId);
  if ((preview.total_remaining ?? 0) < cost) {
    return {
      reply: appendLineReplyFooter(
        "เครดิต AI หมดแล้วนะ 😅\nเติมได้ที่ So1o → Settings หรือใช้ Assistant บนเว็บเมื่อมีเครดิต\nพิมพ์「ทีมงาน」ถ้าต้องการความช่วยเหลือจากแอดมิน",
        preview,
        opts,
      ),
    };
  }

  const idempotencyKey = opts.messageId
    ? `line-ai-${opts.messageId}`
    : `line-ai-${opts.userId}-${crypto.randomUUID()}`;

  const quota = await debitAiQuota(opts.userId, feature, idempotencyKey);
  if (!quota.allowed) {
    return {
      reply: appendLineReplyFooter(
        "เครดิต AI ไม่พอสำหรับคำถามนี้แล้ว\nเติมเครดิตได้ที่ Settings บน solofreelancer.com",
        quota,
        opts,
      ),
    };
  }

  const systemPrompt = preset === "business" ? BUSINESS_SYSTEM_PROMPT : MENTOR_SYSTEM_PROMPT;
  let userContent = text;
  if (preset === "business") {
    const snapshot = await buildBusinessSnapshot(admin, opts.userId);
    userContent = `ข้อมูลธุรกิจ (JSON):\n${JSON.stringify(snapshot, null, 2)}\n\nคำถามจากผู้ใช้:\n${text}`;
  }

  const history = await loadRecentHistory(admin, opts.userId);
  // Gemini requires turns to start with user after system instruction.
  const trimmedHistory =
    history.length && history[0].role === "assistant" ? history.slice(1) : history;
  const messages: GeminiChatMessage[] = [
    { role: "system", content: systemPrompt },
    ...trimmedHistory,
    { role: "user", content: userContent },
  ];

  const reply = await geminiGenerateText(getGeminiApiKey(), defaultFastModel(), {
    messages,
    temperature: 0.7,
    maxOutputTokens: 900,
  });

  const safeReply = reply.trim();
  if (!safeReply) {
    return {
      reply: appendLineReplyFooter("ขออภัย ตอบไม่ทัน ลองถามใหม่อีกครั้งนะ", quota, opts),
    };
  }

  const { error: persistErr } = await admin.from("ai_chat_messages").insert([
    { user_id: opts.userId, role: "user", content: text, preset },
    { user_id: opts.userId, role: "assistant", content: safeReply, preset },
  ]);
  if (persistErr) console.error("[line-assistant] persist", persistErr.message);

  return { reply: appendLineReplyFooter(safeReply, quota, opts) };
}
