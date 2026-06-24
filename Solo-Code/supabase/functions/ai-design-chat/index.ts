// So1o Mentor Chat — supports authenticated users AND anonymous guests (5/day each)
// Streams the AI response back as Server-Sent Events so the client can render
// tokens progressively and abort instantly. Uses Google Gemini directly.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  defaultFastModel,
  geminiGenerateText,
  geminiStreamAsSo1oSse,
  getGeminiApiKey,
  GeminiError,
} from "../_shared/gemini.ts";
import { AI_DISCLAIMER_TAX_PRICE_PROMPT, RULE_BREVITY_TH } from "../_shared/copy-prompts.ts";

const ALLOWED_ORIGINS = ["https://solofreelancer.com", "https://www.solofreelancer.com"];

function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") ?? "";
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    Vary: "Origin",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-guest-id",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

const DAILY_LIMIT = 5;
const GUEST_DAILY_LIMIT = 5;
const MAX_CHARS = 500;

const SYSTEM_PROMPT = `คุณคือ "So1o Mentor" พี่เลี้ยงฟรีแลนซ์ไทย เชี่ยวชาญดีไซน์ ราคาตลาด การคุยลูกค้า และภาษีฟรีแลนซ์
- ${RULE_BREVITY_TH}
- ถ้าผู้ใช้ส่ง "[Price Guide ล่าสุด]" มาในข้อความ ให้นำตัวเลขนั้นมาอ้างอิงในคำแนะนำเสมอ และอธิบายว่ามาจากการประเมินใน Price Guide
- ถ้าคำถามเรื่องราคา ให้แนะนำให้กดปุ่ม "ใช้คำตอบนี้กับราคาประเมิน" ใต้ข้อความเพื่อเปิดเครื่องคำนวณ
- ห้ามบอกว่าตัวเองเป็น Gemini หรือ Google
- คำแนะนำเรื่องราคา/ภาษี ต้องลงท้ายว่า "${AI_DISCLAIMER_TAX_PRICE_PROMPT}"`;

function jsonResp(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: getCorsHeaders(req) });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    let geminiKey: string;
    try {
      geminiKey = getGeminiApiKey();
    } catch {
      return jsonResp(req, { error: "AI not configured" }, 500);
    }
    const geminiModel = defaultFastModel();

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const today = new Date().toISOString().slice(0, 10);

    let userId: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader && !authHeader.endsWith("undefined") && !authHeader.endsWith("null")) {
      try {
        const userClient = createClient(SUPABASE_URL, ANON_KEY, {
          global: { headers: { Authorization: authHeader } },
        });
        const { data: userData } = await userClient.auth.getUser();
        if (userData?.user) userId = userData.user.id;
      } catch (_) {
        /* guest */
      }
    }

    const body = await req.json().catch(() => ({}));
    const message = String(body?.message ?? "")
      .trim()
      .slice(0, MAX_CHARS);
    const priceContext = body?.priceContext ?? null;
    const guestId = String(body?.guestId ?? req.headers.get("x-guest-id") ?? "").slice(0, 64);
    const stream = body?.stream !== false; // default true

    if (!message) return jsonResp(req, { error: "empty_message" }, 400);

    // Derive a stable rate-limit key from client IP (fall back to client-supplied
    // guestId only when we have no IP, e.g. local dev). This prevents guests from
    // rotating guestId values on every request to bypass the daily quota.
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
    const guestKey = ip && ip.length > 0 ? ip : guestId;
    const effectiveLimit = userId ? DAILY_LIMIT : GUEST_DAILY_LIMIT;

    // Quota
    let usedToday = 0;
    let totalEver = 0;
    if (userId) {
      const { data: r } = await admin
        .from("ai_chat_usage")
        .select("count, total_count")
        .eq("user_id", userId)
        .eq("usage_date", today)
        .maybeSingle();
      usedToday = r?.count ?? 0;
      totalEver = r?.total_count ?? 0;
    } else {
      if (!guestKey || guestKey.length < 8)
        return jsonResp(req, { error: "missing_guest_id" }, 400);
      const { data: g } = await admin
        .from("ai_chat_guest_usage")
        .select("count")
        .eq("guest_id", guestKey)
        .eq("usage_date", today)
        .maybeSingle();
      usedToday = g?.count ?? 0;
    }

    if (usedToday >= effectiveLimit) {
      return jsonResp(req, { error: "limit_reached", used: usedToday, limit: effectiveLimit }, 429);
    }

    // History
    let historyMsgs: Array<{ role: string; content: string }> = [];
    if (userId) {
      const { data: history } = await admin
        .from("ai_chat_messages")
        .select("role, content")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(10);
      historyMsgs = (history ?? []).reverse().map((h) => ({ role: h.role, content: h.content }));
    }

    let userMsgWithContext = message;
    if (priceContext && typeof priceContext === "object") {
      const { jobType, recommended, days, complexity, marketAvgMin, marketAvgMax } = priceContext;
      userMsgWithContext = `[Price Guide ล่าสุด — งาน: ${jobType}, ${days} วัน, ความยาก: ${complexity}, แนะนำ ฿${recommended} (ตลาด ฿${marketAvgMin}-฿${marketAvgMax})]\n\n${message}`;
    }

    const chatMessages = [
      { role: "system" as const, content: SYSTEM_PROMPT },
      ...historyMsgs.map((h) => ({
        role: h.role === "assistant" ? ("assistant" as const) : ("user" as const),
        content: h.content,
      })),
      { role: "user" as const, content: userMsgWithContext },
    ];

    // ---- Non-streaming fallback ----
    if (!stream) {
      try {
        const reply = await geminiGenerateText(geminiKey, geminiModel, { messages: chatMessages });
        await persistAndBump(admin, {
          userId,
          guestKey,
          message,
          reply,
          usedToday,
          totalEver,
          today,
          ip,
        });
        return jsonResp(req, { reply, used: usedToday + 1, limit: effectiveLimit, guest: !userId });
      } catch (e) {
        if (e instanceof GeminiError && e.status === 429) {
          return jsonResp(req, { error: "rate_limited" }, 429);
        }
        console.error("gemini error", e);
        return jsonResp(req, { error: "ai_error" }, 500);
      }
    }

    // ---- SSE Streaming ----
    let fullReply = "";
    const encoder = new TextEncoder();
    const geminiBody = geminiStreamAsSo1oSse(geminiKey, geminiModel, chatMessages);

    const out = new ReadableStream({
      async start(controller) {
        controller.enqueue(
          encoder.encode(
            `event: meta\ndata: ${JSON.stringify({ used: usedToday + 1, limit: effectiveLimit })}\n\n`,
          ),
        );

        const reader = geminiBody.getReader();
        const decoder = new TextDecoder();
        let sseBuffer = "";
        try {
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            controller.enqueue(value);
            sseBuffer += decoder.decode(value, { stream: true });
            const lines = sseBuffer.split("\n");
            sseBuffer = lines.pop() ?? "";
            for (const line of lines) {
              if (!line.startsWith("data:")) continue;
              const payload = line.slice(5).trim();
              if (!payload) continue;
              try {
                const j = JSON.parse(payload);
                const delta = j?.delta ?? "";
                if (delta) fullReply += delta;
              } catch {
                /* ignore */
              }
            }
          }
          controller.enqueue(
            encoder.encode(
              `event: done\ndata: ${JSON.stringify({ used: usedToday + 1, limit: effectiveLimit })}\n\n`,
            ),
          );
        } catch (e) {
          console.error("stream read error", e);
        } finally {
          controller.close();
          // @ts-ignore EdgeRuntime exists in Supabase Edge runtime
          (globalThis.EdgeRuntime?.waitUntil ?? ((p: Promise<unknown>) => p))(
            persistAndBump(admin, {
              userId,
              guestKey,
              message,
              reply: fullReply,
              usedToday,
              totalEver,
              today,
              ip,
            }),
          );
        }
      },
      cancel() {
        // @ts-ignore
        (globalThis.EdgeRuntime?.waitUntil ?? ((p: Promise<unknown>) => p))(
          persistAndBump(admin, {
            userId,
            guestKey,
            message,
            reply: fullReply,
            usedToday,
            totalEver,
            today,
            ip,
          }),
        );
      },
    });

    return new Response(out, {
      headers: {
        ...getCorsHeaders(req),
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (e) {
    console.error("ai-design-chat error", e);
    return jsonResp(req, { error: "internal_error" }, 500);
  }
});

interface PersistArgs {
  userId: string | null;
  guestKey: string;
  message: string;
  reply: string;
  usedToday: number;
  totalEver: number;
  today: string;
  ip: string | null;
}

async function persistAndBump(admin: ReturnType<typeof createClient>, a: PersistArgs) {
  const safeReply = (a.reply || "").trim();
  try {
    if (a.userId) {
      if (safeReply) {
        await admin.from("ai_chat_messages").insert([
          { user_id: a.userId, role: "user", content: a.message },
          { user_id: a.userId, role: "assistant", content: safeReply },
        ]);
      }
      await admin.from("ai_chat_usage").upsert(
        {
          user_id: a.userId,
          usage_date: a.today,
          count: a.usedToday + 1,
          total_count: a.totalEver + 1,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,usage_date" },
      );
    } else {
      await admin.from("ai_chat_guest_usage").upsert(
        {
          guest_id: a.guestKey,
          usage_date: a.today,
          count: a.usedToday + 1,
          ip: a.ip,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "guest_id,usage_date" },
      );
    }
  } catch (e) {
    console.error("persistAndBump error", e);
  }
}
