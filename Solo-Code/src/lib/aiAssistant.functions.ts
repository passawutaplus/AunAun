import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { geminiChat, defaultFastModel } from "@/lib/geminiServer";
import { debitAiCredits, getAiUsageSummary, refundAiCredits } from "@/lib/aiCreditsServer";
import {
  ASSISTANT_MAX_OUTPUT_TOKENS,
  persistAssistantMessages,
  prepareAssistantRequest,
} from "@/lib/aiAssistantCore";

const InputSchema = z.object({
  message: z.string().min(1).max(500),
  preset: z.enum(["mentor", "business", "copy", "legal"]).optional(),
  request_id: z.string().max(64).optional(),
});

/** Non-streaming fallback — prefer /api/assistant/stream from the client. */
export const aiAssistant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => InputSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const prepared = await prepareAssistantRequest(supabase, userId, {
      message: data.message.trim(),
      preset: data.preset,
    });

    const preview = await getAiUsageSummary(userId);
    if (preview.total_remaining < prepared.config.cost) {
      throw new Error("limit_reached");
    }

    const idempotencyKey = data.request_id
      ? `assistant-fn:${userId}:${data.request_id}`
      : `assistant-fn:${userId}:${prepared.preset}:${data.message.trim()}`;

    const quota = await debitAiCredits({
      userId,
      feature: prepared.config.feature,
      idempotencyKey,
    });
    if (!quota.allowed) {
      throw new Error("limit_reached");
    }

    const { text: answer } = await geminiChat({
      model: defaultFastModel(),
      messages: prepared.chatMessages,
      maxOutputTokens: ASSISTANT_MAX_OUTPUT_TOKENS,
    });

    const safeReply = (answer || "").trim();
    if (!safeReply) {
      await refundAiCredits({
        userId,
        originalIdempotencyKey: idempotencyKey,
        refundIdempotencyKey: `${idempotencyKey}:refund`,
      }).catch(() => undefined);
      throw new Error("empty_response");
    }

    await persistAssistantMessages(supabase, userId, prepared.preset, prepared.message, safeReply);

    return {
      answer: safeReply,
      preset: prepared.preset,
      kind: prepared.preset,
      usage: {
        included_used: quota.included_used ?? 0,
        included_limit: quota.included_limit ?? 0,
        included_remaining: quota.included_remaining ?? 0,
        purchased_balance: quota.purchased_balance ?? 0,
        total_remaining: quota.total_remaining ?? 0,
        cost: quota.cost ?? prepared.config.cost,
      },
    };
  });
