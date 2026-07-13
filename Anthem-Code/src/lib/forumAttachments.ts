import { supabase } from "@/integrations/supabase/client";

export type ForumAttachmentKind = "image" | "video" | "file";
export type ForumScanStatus = "pending" | "clean" | "blocked";

export type ForumAttachment = {
  id: string;
  topic_id: string | null;
  reply_id: string | null;
  author_id: string;
  kind: ForumAttachmentKind;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  storage_path: string | null;
  public_url: string | null;
  scan_status: ForumScanStatus;
  scan_reason: string | null;
  scanned_at: string | null;
  created_at: string;
};

export const FORUM_ATTACH_MAX_TOPIC = 6;
export const FORUM_ATTACH_MAX_REPLY = 4;
export const FORUM_ATTACH_MAX_BYTES = 25 * 1024 * 1024;
export const FORUM_IMAGE_MAX_BYTES = 8 * 1024 * 1024;
export const FORUM_VIDEO_MAX_BYTES = 15 * 1024 * 1024;

export const FORUM_ATTACH_STAGING_BUCKET = "forum-attachments";

const IMAGE_EXTS = new Set(["png", "jpg", "jpeg", "webp", "gif"]);
const VIDEO_EXTS = new Set(["mp4", "webm", "mov"]);
const FILE_EXTS = new Set([
  "pdf", "zip", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "csv",
  "ttf", "otf", "woff", "woff2",
]);
const DANGEROUS = new Set([
  "exe", "msi", "bat", "cmd", "scr", "com", "apk", "dmg", "vbs", "ps1", "jar", "hta",
]);

export function forumFileExt(name: string): string {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i + 1).toLowerCase() : "";
}

export function forumAttachmentKind(file: File): ForumAttachmentKind | null {
  const ext = forumFileExt(file.name);
  if (DANGEROUS.has(ext)) return null;
  if (file.type.startsWith("image/") || IMAGE_EXTS.has(ext)) return "image";
  if (file.type.startsWith("video/") || VIDEO_EXTS.has(ext)) return "video";
  if (FILE_EXTS.has(ext)) return "file";
  return null;
}

export function assertForumAttachmentAllowed(file: File): ForumAttachmentKind {
  const kind = forumAttachmentKind(file);
  if (!kind) throw new Error("ประเภทไฟล์นี้ไม่รองรับ หรืออาจไม่ปลอดภัย");
  if (kind === "image" && file.size > FORUM_IMAGE_MAX_BYTES) {
    throw new Error("รูปใหญ่เกินไป — สูงสุด 8 MB");
  }
  if (kind === "video" && file.size > FORUM_VIDEO_MAX_BYTES) {
    throw new Error("วิดีโอใหญ่เกินไป — สูงสุด 15 MB");
  }
  if (kind === "file" && file.size > FORUM_ATTACH_MAX_BYTES) {
    throw new Error("ไฟล์ใหญ่เกินไป — สูงสุด 25 MB");
  }
  return kind;
}

export const FORUM_ATTACH_ACCEPT =
  "image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime,.pdf,.zip,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.ttf,.otf,.woff,.woff2";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const forumDb = supabase as any;

export async function fetchForumAttachments(opts: {
  topicId?: string;
  replyIds?: string[];
}): Promise<ForumAttachment[]> {
  let q = forumDb
    .from("forum_attachments")
    .select(
      "id, topic_id, reply_id, author_id, kind, file_name, mime_type, size_bytes, storage_path, public_url, scan_status, scan_reason, scanned_at, created_at",
    )
    .eq("scan_status", "clean")
    .order("created_at", { ascending: true });

  if (opts.topicId) q = q.eq("topic_id", opts.topicId);
  if (opts.replyIds?.length) q = q.in("reply_id", opts.replyIds);

  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as ForumAttachment[];
}

export async function linkForumAttachments(input: {
  attachmentIds: string[];
  topicId?: string;
  replyId?: string;
}): Promise<void> {
  if (!input.attachmentIds.length) return;
  const { error } = await (supabase.rpc as any)("link_forum_attachments" as never, {
    _attachment_ids: input.attachmentIds,
    _topic_id: input.topicId ?? null,
    _reply_id: input.replyId ?? null,
  } as never);
  if (error) throw error;
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}
