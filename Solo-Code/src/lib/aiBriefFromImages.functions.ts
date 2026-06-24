import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { defaultVisionModel, fetchUrlAsInlinePart, geminiChatWithParts } from "@/lib/geminiServer";
import { assertAiCreditsAvailable, debitAiCredits, refundAiCredits } from "@/lib/aiCreditsServer";

const FEATURE = "ai_brief_from_images";

const InputSchema = z.object({
  imageUrls: z.array(z.string().url()).min(1).max(6),
  hint: z.string().max(500).optional().default(""),
});

const SYSTEM_PROMPT = `คุณคือ Senior Art Director ช่วยฟรีแลนซ์ไทยวิเคราะห์รูปอ้างอิง (mood board / inspiration)
แล้วสรุปออกมาเป็น JSON สำหรับเติมในบรีฟงานออกแบบ ตอบเป็น JSON เท่านั้น ห้ามมีคำอธิบายเพิ่ม

โครงสร้างที่ต้องการ:
{
  "project_type": "หนึ่งใน: โลโก้, Branding / CI, Social Media Post, เว็บไซต์, Packaging, Illustration, Motion / วิดีโอ, Print / สิ่งพิมพ์, อื่นๆ",
  "moods": ["Minimal", "Luxury", ...] // เลือก 2-4 จาก: Minimal, Luxury, Playful, Modern, Vintage, Bold, Elegant, Cute, Tech / Futuristic, Natural / Organic, Dark Mode, Pastel
  "liked_color_chips": ["#hex", ...], // 3-6 hex codes ของสีหลักที่เห็นจากรูป
  "liked_colors": "ภาษาไทย อธิบายสีโดยรวม เช่น 'โทนเอิร์ธโทน น้ำตาลอบอุ่น + ครีม'",
  "inspiration": "ภาษาไทย สรุป mood/style/composition ใน 1-2 ประโยค",
  "key_takeaways": "ภาษาไทย ประเด็นสำคัญที่ฟรีแลนซ์ควรรู้ก่อนเริ่มออกแบบ ใส่ - bullet ได้"
}`;

export const aiBriefFromImages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => InputSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    await assertAiCreditsAvailable(userId, FEATURE);

    const idempotencyKey = `brief-images:${userId}:${crypto.randomUUID()}`;
    const quota = await debitAiCredits({
      userId,
      feature: FEATURE,
      idempotencyKey,
    });
    if (!quota.allowed) throw new Error("limit_reached");

    try {
      const userParts = [
        {
          text: `วิเคราะห์รูปอ้างอิงต่อไปนี้และสรุปเป็น JSON ตาม schema${data.hint ? `\nบริบทเพิ่มเติม: ${data.hint}` : ""}`,
        },
        ...(await Promise.all(data.imageUrls.map((url) => fetchUrlAsInlinePart(url, userId)))),
      ];

      const content = await geminiChatWithParts({
        model: defaultVisionModel(),
        systemInstruction: SYSTEM_PROMPT,
        userParts,
        json: true,
      });

      let parsed: Record<string, unknown> = {};
      try {
        parsed = JSON.parse(content);
      } catch {
        throw new Error("AI ตอบกลับในรูปแบบไม่ถูกต้อง");
      }

      return {
        project_type: typeof parsed.project_type === "string" ? parsed.project_type : "",
        moods: Array.isArray(parsed.moods)
          ? parsed.moods.filter((x): x is string => typeof x === "string").slice(0, 6)
          : [],
        liked_color_chips: Array.isArray(parsed.liked_color_chips)
          ? parsed.liked_color_chips
              .filter((x): x is string => typeof x === "string" && /^#[0-9a-fA-F]{6}$/.test(x))
              .slice(0, 8)
          : [],
        liked_colors: typeof parsed.liked_colors === "string" ? parsed.liked_colors : "",
        inspiration: typeof parsed.inspiration === "string" ? parsed.inspiration : "",
        key_takeaways: typeof parsed.key_takeaways === "string" ? parsed.key_takeaways : "",
      };
    } catch (e) {
      await refundAiCredits({
        userId,
        originalIdempotencyKey: idempotencyKey,
        refundIdempotencyKey: `${idempotencyKey}:refund`,
      }).catch(() => undefined);
      throw e;
    }
  });
