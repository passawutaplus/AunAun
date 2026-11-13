import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { defaultModel, fetchUrlAsMediaPart, geminiChatWithParts } from "@/lib/geminiServer";
import { assertAiCreditsAvailable, debitAiCredits, refundAiCredits } from "@/lib/aiCreditsServer";
import { MEETING_TRANSCRIBE_SYSTEM_PROMPT } from "@/lib/briefExtractPrompt";
import { countTranscriptWords, MEETING_LIMITS } from "@/lib/meetingCaptureSchema";
import { meetingTranscribeCredits, meetingTranscribeFeature } from "@/lib/meetingCredits";

/** meeting_captures is not in the generated types yet. */
const untypedAdmin = supabaseAdmin as unknown as SupabaseClient;

const MIN_TRANSCRIPT_WORDS = 50;

const TranscribeInput = z.object({
  captureId: z.string().uuid(),
  mediaUrl: z.string().url().optional(),
  sourceType: z.enum(["audio_upload", "audio_record", "video_upload", "video_record"]),
  durationSec: z.number().int().positive().max(MEETING_LIMITS.videoMaxSec),
});

async function getCapture(userId: string, captureId: string) {
  const { data, error } = await untypedAdmin
    .from("meeting_captures")
    .select("*")
    .eq("id", captureId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("ไม่พบรายการประชุม");
  return data;
}

export const aiMeetingTranscribe = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => TranscribeInput.parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    await getCapture(userId, data.captureId);
    const durationSec = data.durationSec;
    const feature = meetingTranscribeFeature(durationSec);
    const cost = meetingTranscribeCredits(durationSec);
    const idempotencyKey = `meeting-tx:${data.captureId}`;

    // The free meeting slot was retired on 2026-11-13; every transcript uses credits.
    const usedFree = false;
    await assertAiCreditsAvailable(userId, feature);
    const quota = await debitAiCredits({ userId, feature, idempotencyKey });
    if (!quota.allowed) throw new Error("limit_reached");
    const debited = true;

    await untypedAdmin
      .from("meeting_captures")
      .update({ status: "transcribing", duration_sec: durationSec, used_free_slot: usedFree })
      .eq("id", data.captureId);

    let mediaUrl = data.mediaUrl;
    if (!mediaUrl) {
      const cap = await getCapture(userId, data.captureId);
      if (!cap.media_path) throw new Error("ไม่พบไฟล์สื่อ");
      const { data: signed, error: signErr } = await supabaseAdmin.storage
        .from("meeting-captures")
        .createSignedUrl(cap.media_path, 3600);
      if (signErr || !signed?.signedUrl) {
        throw new Error(signErr?.message ?? "สร้างลิงก์ไฟล์ไม่สำเร็จ");
      }
      mediaUrl = signed.signedUrl;
    }

    try {
      const mediaPart = await fetchUrlAsMediaPart(mediaUrl, userId);
      const transcript = await geminiChatWithParts({
        model: defaultModel(),
        systemInstruction: MEETING_TRANSCRIBE_SYSTEM_PROMPT,
        userParts: [{ text: "ถอดเสียงจากไฟล์แนบนี้เป็นข้อความภาษาไทย" }, mediaPart],
        temperature: 0.2,
        maxOutputTokens: 65536,
      });

      const words = countTranscriptWords(transcript);
      if (words < MIN_TRANSCRIPT_WORDS) {
        if (debited) {
          await refundAiCredits({
            userId,
            originalIdempotencyKey: idempotencyKey,
            refundIdempotencyKey: `${idempotencyKey}:refund-short`,
          }).catch(() => undefined);
        }
        await untypedAdmin
          .from("meeting_captures")
          .update({
            status: "failed",
            error_message: "เสียงสั้นหรือไม่ชัดพอ — ลองอัดใหม่หรือเพิ่มบริบท",
            transcript,
            credits_transcribe: usedFree ? 0 : cost,
          })
          .eq("id", data.captureId);
        throw new Error("เสียงสั้นหรือไม่ชัดพอ — ไม่สามารถสรุปบรีฟได้ เครดิตถอดเสียงถูกคืนแล้ว");
      }

      await untypedAdmin
        .from("meeting_captures")
        .update({
          status: "transcribed",
          transcript,
          credits_transcribe: usedFree ? 0 : cost,
          error_message: null,
        })
        .eq("id", data.captureId);

      return { transcript, creditsUsed: usedFree ? 0 : cost, usedFreeSlot: usedFree };
    } catch (e) {
      if (debited) {
        await refundAiCredits({
          userId,
          originalIdempotencyKey: idempotencyKey,
          refundIdempotencyKey: `${idempotencyKey}:refund`,
        }).catch(() => undefined);
      }
      if (!(e instanceof Error && e.message.includes("เสียงสั้น"))) {
        await untypedAdmin
          .from("meeting_captures")
          .update({
            status: "failed",
            error_message: e instanceof Error ? e.message : "ถอดเสียงไม่สำเร็จ",
          })
          .eq("id", data.captureId);
      }
      throw e;
    }
  });
