// Color Mentor — analyzes a hex color and returns complementary colors + mood
// Uses Google Gemini directly.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { debitAiQuota } from "../_shared/ai-quota.ts";
import {
  defaultFastModel,
  geminiGenerateWithFunction,
  getGeminiApiKey,
  GeminiError,
} from "../_shared/gemini.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const HEX_RE = /^#?[0-9a-fA-F]{6}$/;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || authHeader.endsWith("undefined") || authHeader.endsWith("null")) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    if (!SUPABASE_URL || !ANON_KEY) {
      console.error("color-mentor: missing SUPABASE_URL or SUPABASE_ANON_KEY");
      return new Response(JSON.stringify({ error: "server_misconfiguration" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: u, error: uErr } = await userClient.auth.getUser();
    if (uErr || !u?.user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { hex, idempotencyKey } = body as { hex?: string; idempotencyKey?: string };
    const debitKey =
      typeof idempotencyKey === "string" && idempotencyKey.trim()
        ? `color-mentor:${u.user.id}:${idempotencyKey.trim()}`
        : undefined;
    const quota = await debitAiQuota(u.user.id, "color_mentor", debitKey);
    if (!quota.allowed) {
      return new Response(
        JSON.stringify({
          error: `เครดิต AI หมดแล้ว — อัพเกรดหรือเติมเครดิตได้ที่ตั้งค่า`,
          quota,
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!hex || typeof hex !== "string" || !HEX_RE.test(hex.trim())) {
      return new Response(JSON.stringify({ error: "Invalid hex" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const normalized = hex.startsWith("#") ? hex.toUpperCase() : `#${hex.toUpperCase()}`;

    const geminiKey = getGeminiApiKey();
    const systemPrompt = `คุณคือ "So1o Mentor" Senior Art Director ฟรีแลนซ์ไทย
ผู้ใช้จะส่งรหัสสี HEX มาให้คุณวิเคราะห์
ตอบกลับในรูปแบบ function call เท่านั้น โดย:
- complementary: 3 hex codes (รูปแบบ #RRGGBB) ที่จับคู่กับสีนี้แล้วงานดูดี ไม่ซ้ำกับสีเดิม
- mood: 1 ประโยคสั้น ๆ บอกอารมณ์/ความรู้สึกของสีนี้ (≤ 30 คำ ภาษาไทย)
- tip: 1 ประโยคแนะนำการใช้งานสำหรับฟรีแลนซ์ (≤ 30 คำ ภาษาไทย)
ห้ามใส่อารัมภบท ห้ามตอบยาวเกิน`;

    const parsed = await geminiGenerateWithFunction(geminiKey, defaultFastModel(), {
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `วิเคราะห์สี ${normalized}` },
      ],
      functionName: "color_mentor_reply",
      description: "Return complementary colors, mood, and a usage tip.",
      functionSchema: {
        type: "object",
        properties: {
          complementary: {
            type: "array",
            items: { type: "string" },
          },
          mood: { type: "string" },
          tip: { type: "string" },
        },
        required: ["complementary", "mood", "tip"],
      },
    });

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    if (e instanceof GeminiError && e.status === 429) {
      return new Response(JSON.stringify({ error: "ใช้งาน AI บ่อยเกินไป กรุณารอสักครู่" }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    console.error("color-mentor error:", e);
    return new Response(JSON.stringify({ error: "internal_error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
