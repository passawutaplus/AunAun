import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { defaultModel, geminiChatWithParts } from "@/lib/geminiServer";
import {
  assertAiCreditsAvailable,
  debitAiCredits,
  refundAiCredits,
} from "@/lib/aiCreditsServer";
import {
  buildMeetingReportUserText,
  MEETING_REPORT_SYSTEM_PROMPT,
} from "@/lib/meetingReportPrompt";
import { meetingReportCredits, meetingReportFeature } from "@/lib/meetingCredits";

const ReportInput = z.object({
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

export const aiMeetingReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ReportInput.parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const capture = await getCapture(userId, data.captureId);
    const durationSec = capture.duration_sec || 60;
    const feature = meetingReportFeature(durationSec);
    const cost = meetingReportCredits(durationSec);
    const idempotencyKey = `meeting-rp:${data.captureId}`;
    const usedFree = !!capture.used_free_slot;

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
      .update({ status: "reporting", transcript: data.transcript })
      .eq("id", data.captureId);

    try {
      const reportMarkdown = await geminiChatWithParts({
        model: defaultModel(),
        systemInstruction: MEETING_REPORT_SYSTEM_PROMPT,
        userParts: [{ text: buildMeetingReportUserText(data.transcript) }],
        temperature: 0.35,
        maxOutputTokens: 8192,
      });

      if (!reportMarkdown.trim() || reportMarkdown.trim().length < 80) {
        throw new Error("รายงานสั้นเกินไป — ลองแก้ transcript หรืออัดใหม่");
      }

      await (supabaseAdmin as any)
        .from("meeting_captures")
        .update({
          status: "ready",
          report_markdown: reportMarkdown,
          credits_report: usedFree ? 0 : cost,
          error_message: null,
        })
        .eq("id", data.captureId);

      return { reportMarkdown, creditsUsed: usedFree ? 0 : cost };
    } catch (e) {
      if (debited) {
        await refundAiCredits({
          userId,
          originalIdempotencyKey: idempotencyKey,
          refundIdempotencyKey: `${idempotencyKey}:refund`,
        }).catch(() => undefined);
      }
      await (supabaseAdmin as any)
        .from("meeting_captures")
        .update({
          status: "transcribed",
          error_message: e instanceof Error ? e.message : "สรุปรายงานไม่สำเร็จ",
        })
        .eq("id", data.captureId);
      throw e;
    }
  });
