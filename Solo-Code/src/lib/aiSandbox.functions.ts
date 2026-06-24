import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { DISCLAIMER_TAX_PRICE } from "@/lib/copyConstants";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const Input = z.object({
  mode: z.enum(["standard", "trained"]),
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(8000),
      }),
    )
    .min(1)
    .max(50),
  model: z.string().min(2).max(200).optional(),
});

async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden: admin only");
}

const STANDARD_PROMPT =
  "You are a helpful AI assistant. Reply in Thai when the user writes Thai. Keep answers concise and clear.";

function buildTrainedPrompt(
  personality: any | null,
  examples: { prompt: string; ideal_response: string }[],
) {
  const creativity = personality?.creativity ?? 0.6;
  const formality = personality?.formality ?? 0.7;
  const detail = personality?.detail_level ?? 0.6;
  const forbidden: string[] = personality?.forbidden_keywords ?? [];
  const override: string = personality?.system_prompt_override ?? "";

  const base =
    override?.trim() ||
    `คุณคือ "So1o Mentor" — AI ผู้ช่วยฟรีแลนซ์ไทยระดับ Marketing Architect และ Senior Art Director บุคลิกจริงใจ มั่นใจ ทันสมัย เข้าใจหัวอกฟรีแลนซ์ ใช้ภาษาไทยที่เป็นกันเองแต่สุภาพ เน้นมุมมอง "สถาปนิกธุรกิจ" ที่มองทุกบรีฟเป็น "ระบบ" ไม่ใช่แค่ "งานชิ้นเดียว" เป้าหมาย: ช่วยให้ฟรีแลนซ์ทำงานน้อยลงแต่ได้เงินมากขึ้น`;

  const tuning = `
[Personality Tuning]
- Creativity: ${creativity.toFixed(2)} (0=ตรงไปตรงมา, 1=สร้างสรรค์มาก)
- Formality: ${formality.toFixed(2)} (0=กันเอง, 1=ทางการ)
- Detail Level: ${detail.toFixed(2)} (0=สั้น กระชับ, 1=ละเอียดเป็นขั้นตอน)
- คำต้องห้าม (ห้ามใช้เด็ดขาด): ${forbidden.length ? forbidden.join(", ") : "—"}
- ความยาวสูงสุด: 800 คำต่อหนึ่งคำตอบ`;

  const kb = examples.length
    ? `\n\n[Knowledge Base — ตัวอย่างคำตอบสไตล์ So1o ที่บอส approve แล้ว ใช้เป็นแนวเสียงและโครงสร้าง]\n${examples
        .map((e, i) => `--- Example ${i + 1} ---\nUser: ${e.prompt}\nSo1o: ${e.ideal_response}`)
        .join("\n\n")}`
    : "";

  return `${base}\n${tuning}${kb}\n\nตอบในฐานะ So1o Mentor เสมอ ใช้โครงสร้างชัดเจน 1-2-3 เมื่อต้องวางแผน และลงท้ายคำแนะนำเรื่องราคา/ภาษีด้วย "${DISCLAIMER_TAX_PRICE}"`;
}

export const sandboxChat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as { supabase: any; userId: string };
    await assertAdmin(supabase, userId);

    let systemPrompt = STANDARD_PROMPT;
    if (data.mode === "trained") {
      const { data: personality } = await supabase
        .from("ai_personality_settings")
        .select("*")
        .limit(1)
        .maybeSingle();

      // Pull last user message keywords to grab relevant KB examples (simple recency for now)
      const { data: kbRows } = await supabase
        .from("ai_knowledge_base")
        .select("prompt,ideal_response")
        .order("approved_at", { ascending: false })
        .limit(6);

      systemPrompt = buildTrainedPrompt(personality, kbRows ?? []);
    }

    const { geminiChat, normalizeGeminiModel } = await import("@/lib/geminiServer");
    const model = normalizeGeminiModel(data.model);
    const { text: reply } = await geminiChat({
      model,
      messages: [{ role: "system", content: systemPrompt }, ...data.messages],
      temperature: data.mode === "trained" ? 0.75 : 0.7,
      maxOutputTokens: 1000,
    });
    return { reply, tokens: 0, model, mode: data.mode };
  });
