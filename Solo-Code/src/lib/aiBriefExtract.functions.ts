import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { defaultVisionModel, fetchUrlAsInlinePart, geminiChatWithParts } from "@/lib/geminiServer";
import { assertAiCreditsAvailable, debitAiCredits, refundAiCredits } from "@/lib/aiCreditsServer";
import { BRIEF_EXTRACT_SYSTEM_PROMPT, buildBriefExtractUserText } from "@/lib/briefExtractPrompt";
import { parseBriefExtractJson } from "@/lib/briefExtractParse";
import type { AiBriefExtractResult } from "@/lib/briefExtractTypes";

export type { AiBriefExtractResult };

const FEATURE = "ai_brief_extract";

const InputSchema = z.object({
  imageUrls: z.array(z.string().url()).max(8).optional().default([]),
  noteText: z.string().max(8000).optional().default(""),
});

export const aiBriefExtract = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => InputSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    if (data.imageUrls.length === 0 && !data.noteText.trim()) {
      throw new Error("ต้องมีรูปหรือข้อความอย่างน้อย 1 อย่าง");
    }

    await assertAiCreditsAvailable(userId, FEATURE);

    const idempotencyKey = `brief-extract:${userId}:${crypto.randomUUID()}`;
    const quota = await debitAiCredits({
      userId,
      feature: FEATURE,
      idempotencyKey,
    });
    if (!quota.allowed) throw new Error("limit_reached");

    try {
      const userParts = [
        {
          text: buildBriefExtractUserText({
            noteText: data.noteText,
            hasImages: data.imageUrls.length > 0,
          }),
        },
        ...(await Promise.all(data.imageUrls.map((url) => fetchUrlAsInlinePart(url, userId)))),
      ];

      const content = await geminiChatWithParts({
        model: defaultVisionModel(),
        systemInstruction: BRIEF_EXTRACT_SYSTEM_PROMPT,
        userParts,
        json: true,
      });

      return parseBriefExtractJson(content);
    } catch (e) {
      await refundAiCredits({
        userId,
        originalIdempotencyKey: idempotencyKey,
        refundIdempotencyKey: `${idempotencyKey}:refund`,
      }).catch(() => undefined);
      throw e;
    }
  });
