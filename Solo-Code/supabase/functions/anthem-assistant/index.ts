import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";
import { debitAiQuota } from "../_shared/ai-quota.ts";
import {
  defaultFastModel,
  geminiGenerateText,
  getGeminiApiKey,
  GeminiError,
} from "../_shared/gemini.ts";
import { corsHeadersForRequest } from "../_shared/cors.ts";

const BodySchema = z.object({
  message: z.string().min(1).max(2000),
  mode: z.enum(["mentor", "portfolio_copy", "chat_draft"]).default("mentor"),
  context: z.string().max(4000).optional(),
});

const FEATURE_BY_MODE = {
  mentor: "anthem_assistant_mentor",
  portfolio_copy: "anthem_portfolio_copy",
  chat_draft: "anthem_chat_draft",
} as const;

const PROMPTS: Record<keyof typeof FEATURE_BY_MODE, string> = {
  mentor: `คุณคือ Anthem AI Mentor ช่วยฟรีแลนซ์ไทยเรื่องผลงาน การคุยลูกค้า และการรับงานบนหน้าร้าน
- ตอบภาษาไทย กระชับ เป็นมิตร
- ห้ามบอกว่าเป็น Gemini`,
  portfolio_copy: `คุณช่วยเขียนชื่อผลงาน คำโปรย และ case study สั้นๆ สำหรับ portfolio ดีไซน์เนอร์ไทย
- ตอบเป็นข้อความพร้อมใช้ ไม่ยาวเกินไป`,
  chat_draft: `คุณช่วยร่างข้อความตอบลูกค้าในแชทจ้างงาน สุภาพ มืออาชีพ
- เสนอ 2-3 ทางเลือกถ้าเหมาะ`,
};

const json = (req: Request, body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeadersForRequest(req), "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeadersForRequest(req) });
  if (req.method !== "POST") return json(req, { error: "method_not_allowed" }, 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json(req, { error: "unauthorized" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const token = authHeader.slice("Bearer ".length);
  const { data: claims, error: authErr } = await userClient.auth.getClaims(token);
  if (authErr || !claims?.claims?.sub) return json(req, { error: "unauthorized" }, 401);
  const userId = claims.claims.sub as string;

  let body: z.infer<typeof BodySchema>;
  try {
    body = BodySchema.parse(await req.json());
  } catch {
    return json(req, { error: "invalid_body" }, 400);
  }

  const feature = FEATURE_BY_MODE[body.mode];
  const quota = await debitAiQuota(userId, feature, `anthem-${feature}-${crypto.randomUUID()}`);
  if (!quota.allowed) {
    return json(req, { error: "limit_reached", quota }, 402);
  }

  const system = PROMPTS[body.mode];
  const userContent = body.context
    ? `บริบท:\n${body.context}\n\nคำขอ:\n${body.message}`
    : body.message;

  try {
    const reply = await geminiGenerateText(getGeminiApiKey(), defaultFastModel(), {
      messages: [
        { role: "system", content: system },
        { role: "user", content: userContent },
      ],
      temperature: 0.7,
    });
    return json(req, { reply, quota });
  } catch (e) {
    if (e instanceof GeminiError && e.status === 429) {
      return json(req, { error: "rate_limited" }, 429);
    }
    console.error("[anthem-assistant]", e);
    return json(req, { error: "internal" }, 500);
  }
});
