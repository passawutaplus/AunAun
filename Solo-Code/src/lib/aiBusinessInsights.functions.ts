import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { geminiChat, defaultFastModel } from "@/lib/geminiServer";
import { buildBusinessSnapshot, BUSINESS_SYSTEM_PROMPT } from "@/lib/aiBusinessSnapshot";
import { debitAiCredits, refundAiCredits } from "@/lib/aiCreditsServer";

const FEATURE = "ai_assistant_business";

const InputSchema = z.object({
  question: z.string().min(1).max(500),
});

export const aiBusinessInsights = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => InputSchema.parse(d))
  .handler(async ({ data, context }) => {
    const userId = context.userId;
    const idempotencyKey = `business-insights:${userId}:${crypto.randomUUID()}`;

    const quota = await debitAiCredits({
      userId,
      feature: FEATURE,
      idempotencyKey,
    });
    if (!quota.allowed) {
      throw new Error("limit_reached");
    }

    try {
      const snapshot = await buildBusinessSnapshot(context.supabase, userId);

      const { text: answer } = await geminiChat({
        model: defaultFastModel(),
        messages: [
          { role: "system", content: BUSINESS_SYSTEM_PROMPT },
          {
            role: "user",
            content: `ข้อมูลธุรกิจ (JSON):\n${JSON.stringify(snapshot, null, 2)}\n\nคำถามจากผู้ใช้:\n${data.question}`,
          },
        ],
      });

      return { answer: (answer || "").trim() };
    } catch (e) {
      await refundAiCredits({
        userId,
        originalIdempotencyKey: idempotencyKey,
        refundIdempotencyKey: `${idempotencyKey}:refund`,
      }).catch(() => undefined);
      throw e;
    }
  });
