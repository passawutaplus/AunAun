import { z } from "zod";

export const MEETING_SOURCE_TYPES = [
  "audio_upload",
  "audio_record",
  "video_upload",
  "video_record",
] as const;

export type MeetingSourceType = (typeof MEETING_SOURCE_TYPES)[number];

export const MEETING_CAPTURE_STATUSES = [
  "pending",
  "uploading",
  "transcribing",
  "transcribed",
  "reporting",
  "extracting",
  "ready",
  "failed",
] as const;

export type MeetingCaptureStatus = (typeof MEETING_CAPTURE_STATUSES)[number];

export const AUDIO_MIME_TYPES = [
  "audio/mpeg",
  "audio/mp3",
  "audio/mp4",
  "audio/m4a",
  "audio/x-m4a",
  "audio/wav",
  "audio/webm",
  "audio/ogg",
] as const;

export const VIDEO_MIME_TYPES = ["video/mp4", "video/webm", "video/quicktime"] as const;

export const AUDIO_EXTENSIONS = [".m4a", ".mp3", ".wav", ".webm", ".ogg", ".mpeg"] as const;
export const VIDEO_EXTENSIONS = [".mp4", ".webm", ".mov"] as const;

/** Max duration in seconds */
export const MEETING_LIMITS = {
  freeMaxSec: 15 * 60,
  audioMaxSec: 60 * 60,
  videoMaxSec: 90 * 60,
  audioMaxBytes: 100 * 1024 * 1024,
  videoMaxBytes: 500 * 1024 * 1024,
} as const;

export const MeetingModeSchema = z.enum(["onsite", "online"]);
export type MeetingMode = z.infer<typeof MeetingModeSchema>;

export function isAudioMime(mime: string): boolean {
  return (
    mime.startsWith("audio/") ||
    AUDIO_MIME_TYPES.includes(mime as (typeof AUDIO_MIME_TYPES)[number])
  );
}

export function isVideoMime(mime: string): boolean {
  return (
    mime.startsWith("video/") ||
    VIDEO_MIME_TYPES.includes(mime as (typeof VIDEO_MIME_TYPES)[number])
  );
}

export function maxDurationForSource(sourceType: MeetingSourceType, isFreeTier: boolean): number {
  if (isFreeTier) return MEETING_LIMITS.freeMaxSec;
  if (sourceType === "video_upload" || sourceType === "video_record") {
    return MEETING_LIMITS.videoMaxSec;
  }
  return MEETING_LIMITS.audioMaxSec;
}

export function maxBytesForSource(sourceType: MeetingSourceType): number {
  if (sourceType === "video_upload" || sourceType === "video_record") {
    return MEETING_LIMITS.videoMaxBytes;
  }
  return MEETING_LIMITS.audioMaxBytes;
}

export function countTranscriptWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function formatDuration(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** mm:ss:cs — centisecond timer for live recording UI */
export function formatRecordingTimer(totalMs: number): string {
  const cs = Math.floor((totalMs % 1000) / 10);
  const totalSec = Math.floor(totalMs / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}:${String(cs).padStart(2, "0")}`;
}
