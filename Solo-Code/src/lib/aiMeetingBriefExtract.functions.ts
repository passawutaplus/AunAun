import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { defaultVisionModel, geminiChatWithParts } from "@/lib/geminiServer";
import {
  assertAiCreditsAvailable,
  debitAiCredits,
  refundAiCredits,
} from "@/lib/aiCreditsServer";
import { BRIEF_EXTRACT_SYSTEM_PROMPT, buildBriefExtractUserText } from "@/lib/briefExtractPrompt";
import { parseBriefExtractJson } from "@/lib/briefExtractParse";
import {
  meetingExtractCredits,
  meetingExtractFeature,
} from "@/lib/meetingCredits";
import { meetingQualityGate } from "@/lib/meetingQualityGate";

const ExtractInput = z.object({
  captureId: z.string().uuid(),
  transcript: z.string().min(1).max(200_000),
});

async function getCapture(userId: string, captureId: string) {
  const { data, error } = await (supabaseAdmin as any)
    .from("meeting_captures")
    .select("*")
    .eq("id", captureId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("ไม่พบรายการประชุม");
  return data;
}

export const aiMeetingBriefExtract = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ExtractInput.parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const capture = await getCapture(userId, data.captureId);
    const durationSec = capture.duration_sec || 60;
    const feature = meetingExtractFeature(durationSec);
    const cost = meetingExtractCredits(durationSec);
    const idempotencyKey = `meeting-ex:${data.captureId}`;
    // Free monthly slot covers transcribe + report only — brief extract always debits.
    const usedFree = false;

    if (!usedFree) {
      await assertAiCreditsAvailable(userId, feature);
    }

    let debited = false;
    if (!usedFree) {
      const quota = await debitAiCredits({ userId, feature, idempotencyKey });
      if (!quota.allowed) throw new Error("limit_reached");
      debited = true;
    }

    await (supabaseAdmin as any)
      .from("meeting_captures")
      .update({ status: "extracting", transcript: data.transcript })
      .eq("id", data.captureId);

    const runExtract = async () => {
      const content = await geminiChatWithParts({
        model: defaultVisionModel(),
        systemInstruction: BRIEF_EXTRACT_SYSTEM_PROMPT,
        userParts: [{ text: buildBriefExtractUserText({ transcript: data.transcript }) }],
        json: true,
      });
      return parseBriefExtractJson(content);
    };

    try {
      let result = await runExtract();
      let gate = meetingQualityGate(result, data.transcript);

      if (gate.shouldRetry) {
        result = await runExtract();
        gate = meetingQualityGate(result, data.transcript);
      }

      await (supabaseAdmin as any)
        .from("meeting_captures")
        .update({
          status: "ready",
          extract_result: result as unknown as Record<string, unknown>,
          quality_score: gate.score,
          credits_extract: usedFree ? 0 : cost,
          error_message: null,
        })
        .eq("id", data.captureId);

      return { result, quality: gate, creditsUsed: usedFree ? 0 : cost };
    } catch (e) {
      if (debited) {
        await refundAiCredits({
          userId,
          originalIdempotencyKey: idempotencyKey,
          refundIdempotencyKey: `${idempotencyKey}:refund`,
        }).catch(() => undefined);
      }
      const restoreStatus = capture.report_markdown ? "ready" : "transcribed";
      await (supabaseAdmin as any)
        .from("meeting_captures")
        .update({
          status: restoreStatus,
          error_message: e instanceof Error ? e.message : "สรุปบรีฟไม่สำเร็จ",
        })
        .eq("id", data.captureId);
      throw e;
    }
  });
