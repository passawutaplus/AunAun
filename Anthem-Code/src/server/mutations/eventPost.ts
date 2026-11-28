/**
 * EventPost (step 11): save / send an event of the signed-in member, and the files of its form.
 * Rules live in event_save / event_submit (migration 20261129100100_redesign_event_post.sql).
 */
import { supabase } from "@/integrations/supabase/client";
import type { Tier } from "@/core/subscription";
import { uploadAnthemMedia } from "@/lib/sharedMediaUpload";
import { uploadProjectGif, isGifFile } from "@/lib/uploadProjectGif";
import { uploadProjectImage } from "@/lib/uploadImage";
import { UPLOAD_STAGE, type UploadStageReporter } from "@/lib/uploadProgress";
import type { UploadedWorkFile } from "./upload";

/** Pictures and the PDF of an event go to `anthem/<uid>/events/` (anthem.event_image_ok / event_pdf_ok). */
export const EVENT_FOLDER = "events";
/** Mock EventPost: "JPG · PNG · ≤ 10 MB" (cover), "JPG · PNG · GIF · ≤ 10 MB" (details). */
export const EVENT_FILE_MAX_BYTES = 10 * 1024 * 1024;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rpc = (fn: string, args: Record<string, unknown>) => (supabase.rpc as any)(fn, args);

/** Creates (id null) or updates the event; returns its id. The server keeps the team's own fields. */
export async function saveEvent(id: string | null, data: Record<string, unknown>): Promise<string> {
  const { data: saved, error } = await rpc("event_save", { _id: id, _data: data });
  if (error) throw error;
  return saved as string;
}

/** Sends a draft (or an event the team sent back) to the team's review. */
export async function submitEvent(id: string): Promise<void> {
  const { error } = await rpc("event_submit", { _id: id });
  if (error) throw error;
}

/**
 * A picture of the event (cover or details): the old pipeline (HEIC → JPEG, compression); GIFs stay GIFs.
 * A GIF that the pipeline would turn into a video cannot be an event picture.
 */
export async function uploadEventPicture(
  file: File,
  userId: string,
  _folder: string,
  tier: Tier,
  reporter: UploadStageReporter,
  signal: AbortSignal,
): Promise<UploadedWorkFile> {
  if (isGifFile(file)) {
    const g = await uploadProjectGif(file, userId, EVENT_FOLDER, tier, reporter, signal);
    if (g.isVideo) throw new Error("GIF นี้ใหญ่เกินไป");
    return { kind: "image", url: g.url };
  }
  if (!file.type.startsWith("image/") && !/\.(heic|heif)$/i.test(file.name)) throw new Error("ไฟล์ไม่ใช่รูปภาพ");
  const url = await uploadProjectImage(file, userId, EVENT_FOLDER, tier, { reporter, signal, fastQuotaCheck: true });
  return { kind: "image", url };
}

/** The announcement PDF of "More". */
export async function uploadEventPdf(file: File, userId: string, tier: Tier): Promise<string> {
  return uploadAnthemMedia({
    file,
    ext: "pdf",
    contentType: "application/pdf",
    userId,
    folder: EVENT_FOLDER,
    tier,
    stage: UPLOAD_STAGE.uploadingImage,
    fastQuotaCheck: true,
  });
}
