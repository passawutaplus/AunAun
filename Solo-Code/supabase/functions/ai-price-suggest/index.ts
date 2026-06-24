// AI Price Suggest — Gemini reasoning + market band (with admin override + feedback weighting)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { checkAiQuota, isProUser } from "../_shared/ai-quota.ts";
import { AI_DISCLAIMER_TAX_PRICE_PROMPT } from "../_shared/copy-prompts.ts";
import { defaultFastModel, geminiGenerateText, getGeminiApiKey } from "../_shared/gemini.ts";

const ALLOWED_ORIGINS = ["https://solofreelancer.com", "https://www.solofreelancer.com"];

function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") ?? "";
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    Vary: "Origin",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

const SYSTEM_PROMPT = `คุณคือ "So1o Mentor" พี่เลี้ยงฟรีแลนซ์ไทยที่เชี่ยวชาญการตั้งราคา
- ตอบสั้น กระชับ มั่นใจ สไตล์พี่สอนน้อง 2-3 บรรทัดเท่านั้น (ไม่เกิน 120 คำ)
- อยู่ข้างฟรีแลนซ์เสมอ ช่วยให้กล้าตั้งราคาที่สมเหตุสมผล
- อธิบายเหตุผลของราคาแนะนำ (เวลา + ความยาก + ตลาด)
- ปิดท้ายด้วย "${AI_DISCLAIMER_TAX_PRICE_PROMPT}"
- ห้ามบอกชื่อโมเดล AI`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: getCorsHeaders(req) });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json(req, { error: "unauthorized" }, 401);

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    let geminiKey: string | null = null;
    try {
      geminiKey = getGeminiApiKey();
    } catch {
      geminiKey = null;
    }

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) return json(req, { error: "unauthorized" }, 401);
    const userId = userData.user.id;

    // Daily quota guard (Denial-of-Wallet protection)
    const pro = await isProUser(userId);
    const quota = await checkAiQuota(userId, "ai_price_suggest", pro);
    if (!quota.allowed) {
      return json(
        req,
        {
          error: `เครดิต AI หมดแล้ว — อัพเกรดหรือเติมเครดิตได้ที่ตั้งค่า`,
          quota,
        },
        429,
      );
    }

    const body = await req.json();
    const jobType = String(body?.jobType ?? "other");
    const days = Math.max(0.5, Math.min(60, Number(body?.days) || 1));
    const quantity = Math.max(1, Math.min(999, Number(body?.quantity) || 1));
    const complexity = String(body?.complexity ?? "normal");
    const suggestion = body?.suggestion as {
      min: number;
      recommended: number;
      max: number;
      marketAvg: { min: number; max: number };
      baseCost: number;
      withholding3: number;
      netReceived: number;
    };

    if (!suggestion?.recommended) return json(req, { error: "missing_suggestion" }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    let marketAvg = suggestion.marketAvg;

    // 1) Admin override has highest priority
    try {
      const { data: ov } = await admin
        .from("price_guide_overrides")
        .select("min_price, max_price")
        .eq("job_type", jobType)
        .maybeSingle();
      if (ov && ov.max_price > 0) {
        marketAvg = {
          min: Math.round(Number(ov.min_price)),
          max: Math.round(Number(ov.max_price)),
        };
      } else {
        // 2) Fallback to anonymized aggregate
        const { data: rows } = await admin
          .from("price_guide_events")
          .select("recommended_price")
          .eq("job_type", jobType)
          .gte("created_at", new Date(Date.now() - 1000 * 60 * 60 * 24 * 180).toISOString())
          .limit(200);
        if (rows && rows.length >= 3) {
          const prices = rows
            .map((r: any) => Number(r.recommended_price))
            .filter((n) => n > 0)
            .sort((a, b) => a - b);
          if (prices.length >= 3) {
            const min = prices[Math.floor(prices.length * 0.2)];
            const max = prices[Math.floor(prices.length * 0.8)];
            marketAvg = { min: Math.round(min), max: Math.round(max) };
          }
        }

        // 3) Widen band if many 👎 in this job_type
        const { data: fb } = await admin
          .from("price_guide_feedback")
          .select("rating")
          .eq("job_type", jobType)
          .gte("created_at", new Date(Date.now() - 1000 * 60 * 60 * 24 * 90).toISOString())
          .limit(500);
        if (fb && fb.length >= 5) {
          const downRate = fb.filter((f: any) => f.rating === "down").length / fb.length;
          if (downRate > 0.4) {
            marketAvg = {
              min: Math.round(marketAvg.min * 0.85),
              max: Math.round(marketAvg.max * 1.15),
            };
          }
        }
      }
    } catch (e) {
      console.error("market resolve error", e);
    }

    let reasoning = `ราคานี้คำนวณจากเวลาทำงาน + ความยาก + ค่าเฉลี่ยตลาด เผื่อต่อนิดหน่อยให้ลูกค้าเลือกได้ครับ\n${AI_DISCLAIMER_TAX_PRICE_PROMPT}`;

    if (geminiKey) {
      try {
        const userMsg = `งานประเภท: ${jobType}
ระยะเวลา: ${days} วัน
จำนวน (qty): ${quantity}
ความยาก: ${complexity}
ต้นทุนค่าแรง: ${suggestion.baseCost.toLocaleString()} บาท
ตลาดอ้างอิง: ${marketAvg.min.toLocaleString()}-${marketAvg.max.toLocaleString()} บาท
ราคาแนะนำ/หน่วย: ${suggestion.recommended.toLocaleString()} บาท (ช่วง ${suggestion.min.toLocaleString()}-${suggestion.max.toLocaleString()})

ช่วยอธิบายเหตุผลของราคาแนะนำให้ฟรีแลนซ์ฟัง สั้นๆ มั่นใจ`;

        const r = await geminiGenerateText(geminiKey, defaultFastModel(), {
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userMsg },
          ],
        });
        if (r) reasoning = r;
      } catch (e) {
        console.error("ai reasoning error", e);
      }
    }

    // Log event and return event_id for feedback linking
    let eventId: string | null = null;
    try {
      const { data: inserted } = await admin
        .from("price_guide_events")
        .insert({
          user_id: userId,
          job_type: jobType,
          days: Math.round(days),
          quantity,
          complexity,
          recommended_price: suggestion.recommended,
          min_price: suggestion.min,
          max_price: suggestion.max,
          reasoning,
        })
        .select("id")
        .single();
      eventId = inserted?.id ?? null;
    } catch (e) {
      console.error("log event error", e);
    }

    return json(req, { reasoning, marketAvg, eventId });
  } catch (e) {
    console.error("ai-price-suggest error", e);
    return json(req, { error: "internal_error" }, 500);
  }
});

function json(req: Request, payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
  });
}
