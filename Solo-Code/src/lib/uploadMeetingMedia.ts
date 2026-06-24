import { supabase } from "@/integrations/supabase/client";
import {
  isAudioMime,
  isVideoMime,
  maxBytesForSource,
  type MeetingSourceType,
} from "@/lib/meetingCaptureSchema";

const BUCKET = "meeting-captures";

function extFromMime(mime: string): string {
  if (mime.includes("mpeg") || mime.includes("mp3")) return "mp3";
  if (mime.includes("m4a") || mime.includes("mp4") && mime.startsWith("audio")) return "m4a";
  if (mime.includes("wav")) return "wav";
  if (mime.includes("webm") && mime.startsWith("audio")) return "webm";
  if (mime.includes("ogg")) return "ogg";
  if (mime.includes("quicktime")) return "mov";
  if (mime.includes("mp4")) return "mp4";
  if (mime.includes("webm")) return "webm";
  const fromName = mime.split("/")[1];
  return fromName || "bin";
}

export async function uploadMeetingMedia(opts: {
  file: Blob;
  fileName: string;
  mimeType: string;
  userId: string;
  captureId: string;
  sourceType: MeetingSourceType;
}): Promise<{ path: string; publicUrl: string; size: number }> {
  const { file, fileName, mimeType, userId, captureId, sourceType } = opts;
  const maxBytes = maxBytesForSource(sourceType);
  if (file.size > maxBytes) {
    const mb = Math.round(maxBytes / (1024 * 1024));
    throw new Error(`ไฟล์ใหญ่เกิน ${mb}MB`);
  }
  if (!isAudioMime(mimeType) && !isVideoMime(mimeType)) {
    throw new Error("รองรับเฉพาะไฟล์เสียงหรือวิดีโอ");
  }

  const ext = fileName.includes(".")
    ? fileName.split(".").pop()!
    : extFromMime(mimeType);
  const path = `${userId}/${captureId}/media.${ext}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: mimeType,
    cacheControl: "3600",
    upsert: true,
  });

  if (error) {
    const msg = error.message || "";
    if (msg.toLowerCase().includes("row-level security") || msg.toLowerCase().includes("denied")) {
      throw new Error("อัปโหลดไม่ได้ — กรุณาเข้าสู่ระบบใหม่");
    }
    throw new Error(`อัปโหลดไม่สำเร็จ: ${msg}`);
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { path, publicUrl: data.publicUrl, size: file.size };
}

/** Signed URL for server-side Gemini fetch (private bucket). */
export async function getMeetingMediaSignedUrl(path: string, expiresSec = 3600): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, expiresSec);
  if (error || !data?.signedUrl) throw new Error(error?.message ?? "สร้างลิงก์ไฟล์ไม่สำเร็จ");
  return data.signedUrl;
}
