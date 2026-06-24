import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";
import { debitAiQuota } from "../_shared/ai-quota.ts";
import {
  defaultVisionModel,
  fetchUrlAsInlinePart,
  geminiGenerateWithParts,
  getGeminiApiKey,
  GeminiError,
} from "../_shared/gemini.ts";
import { corsHeadersForRequest } from "../_shared/cors.ts";

const FEATURE = "anthem_portfolio_from_images";

const VALID_CATEGORIES = [
  "Graphic",
  "Illustration",
  "Craft",
  "Web/UI",
  "Content",
  "Photography",
  "Video",
  "Music/Audio",
] as const;

const BodySchema = z.object({
  imageUrls: z.array(z.string().url()).min(2).max(8),
  hint: z.string().max(500).optional(),
  categoryHint: z.string().max(40).optional(),
});

const SYSTEM_PROMPT = `คุณคือ Senior Creative Director ช่วยฟรีแลนซ์ไทยลง portfolio บน Pixel100
วิเคราะห์รูปผลงานที่แนบมา แล้วตอบเป็น JSON เท่านั้น ห้ามมีข้อความนอก JSON

โครงสร้างที่ต้องการ:
{
  "image_order": [0, 2, 1, ...],
  "cover_index": 0,
  "category": "หนึ่งใน: Graphic, Illustration, Craft, Web/UI, Content, Photography, Video, Music/Audio",
  "title": "ชื่อผลงานภาษาไทย กระชับ มืออาชีพ",
  "subtitle": "คำโปรย 1 ประโยค",
  "description": "case study สั้นๆ ภาษาไทย เล่าแนวคิด กระบวนการ ผลลัพธ์ รองรับ \\n",
  "tags": ["แท็ก", "..."],
  "tools": ["Figma", "..."]
}

กฎ:
- image_order ต้องเป็น permutation ของ index 0 ถึง n-1 เรียงตาม storytelling (hero ก่อน แล้ว process แล้ว detail)
- cover_index คือ index ของภาพที่เหมาะเป็นปกในชุดเดิม (ก่อน reorder)
- tags 2-8 รายการ, tools 1-6 รายการ
- ห้ามบอกว่าเป็น AI`;

const json = (req: Request, body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeadersForRequest(req), "Content-Type": "application/json" },
  });

function normalizeCategory(raw: string, hint?: string): string {
  const t = raw.trim();
  if ((VALID_CATEGORIES as readonly string[]).includes(t)) return t;
  if (hint && (VALID_CATEGORIES as readonly string[]).includes(hint)) return hint;
  return "Graphic";
}

function normalizePermutation(order: unknown, n: number): number[] {
  if (!Array.isArray(order)) return Array.from({ length: n }, (_, i) => i);
  const nums = order.filter(
    (x): x is number => typeof x === "number" && Number.isInteger(x) && x >= 0 && x < n,
  );
  if (nums.length !== n || new Set(nums).size !== n) {
    return Array.from({ length: n }, (_, i) => i);
  }
  return nums;
}

async function refundCredits(admin: ReturnType<typeof createClient>, userId: string, key: string) {
  try {
    await admin.rpc("refund_ai_credits", {
      _user_id: userId,
      _original_idempotency_key: key,
      _refund_idempotency_key: `${key}:refund`,
    });
  } catch (e) {
    console.error("[anthem-portfolio-assist] refund failed", e);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeadersForRequest(req) });
  if (req.method !== "POST") return json(req, { error: "method_not_allowed" }, 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return json(req, { error: "unauthorized" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
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

  const idempotencyKey = `portfolio-ai:${userId}:${crypto.randomUUID()}`;
  const quota = await debitAiQuota(userId, FEATURE, idempotencyKey);
  if (!quota.allowed) {
    return json(req, { error: "limit_reached", quota }, 402);
  }

  const admin = createClient(supabaseUrl, serviceKey);
  const n = body.imageUrls.length;

  try {
    const userParts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [
      {
        text:
          `วิเคราะห์รูป portfolio ${n} ภาพ (index 0 ถึง ${n - 1}) และสรุปเป็น JSON` +
          (body.hint ? `\nบริบทจากผู้ใช้: ${body.hint}` : "") +
          (body.categoryHint ? `\nหมวดที่ผู้ใช้เลือกไว้: ${body.categoryHint}` : ""),
      },
      ...(await Promise.all(body.imageUrls.map((url) => fetchUrlAsInlinePart(url, userId)))),
    ];

    const content = await geminiGenerateWithParts(getGeminiApiKey(), defaultVisionModel(), {
      systemInstruction: SYSTEM_PROMPT,
      userParts,
      temperature: 0.5,
      maxOutputTokens: 4096,
      json: true,
    });

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(content) as Record<string, unknown>;
    } catch {
      await refundCredits(admin, userId, idempotencyKey);
      return json(req, { error: "invalid_ai_response" }, 500);
    }

    const imageOrder = normalizePermutation(parsed.image_order, n);
    let coverIndex = typeof parsed.cover_index === "number" ? Math.floor(parsed.cover_index) : 0;
    if (coverIndex < 0 || coverIndex >= n) coverIndex = 0;

    const result = {
      image_order: imageOrder,
      cover_index: coverIndex,
      category: normalizeCategory(String(parsed.category ?? ""), body.categoryHint),
      title: String(parsed.title ?? "")
        .trim()
        .slice(0, 120),
      subtitle: String(parsed.subtitle ?? "")
        .trim()
        .slice(0, 180),
      description: String(parsed.description ?? "")
        .trim()
        .slice(0, 5000),
      tags: Array.isArray(parsed.tags)
        ? parsed.tags
            .filter((x): x is string => typeof x === "string")
            .map((t) => t.trim())
            .filter(Boolean)
            .slice(0, 15)
        : [],
      tools: Array.isArray(parsed.tools)
        ? parsed.tools
            .filter((x): x is string => typeof x === "string")
            .map((t) => t.trim())
            .filter(Boolean)
            .slice(0, 20)
        : [],
      quota,
    };

    if (!result.title) {
      await refundCredits(admin, userId, idempotencyKey);
      return json(req, { error: "empty_ai_response" }, 500);
    }

    return json(req, result);
  } catch (e) {
    await refundCredits(admin, userId, idempotencyKey);
    if (e instanceof GeminiError && e.status === 429) {
      return json(req, { error: "rate_limited" }, 429);
    }
    console.error("[anthem-portfolio-assist]", e);
    return json(req, { error: "internal" }, 500);
  }
});
