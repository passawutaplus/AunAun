export type ReplyPreviewSource = {
  content?: string | null;
  attachment_url?: string | null;
  message_type?: string | null;
  deleted_at?: string | null;
};

export function replyPreviewText(msg: ReplyPreviewSource): string {
  if (msg.deleted_at) return "ข้อความถูกยกเลิก";
  if (msg.message_type === "project") return msg.content?.trim() || "ผลงาน";
  if (msg.message_type === "profile") return "โปรไฟล์";
  if (msg.attachment_url || msg.message_type === "image") return "รูปภาพ";
  return msg.content?.trim() || "ข้อความ";
}
