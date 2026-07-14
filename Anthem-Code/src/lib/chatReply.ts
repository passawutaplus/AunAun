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
  if (msg.message_type === "file") return msg.content?.trim() || "ไฟล์แนบ";
  if (msg.message_type === "image") return "รูปภาพ";
  if (msg.attachment_url) {
    const name = msg.content?.trim();
    if (name && !/\.(jpe?g|png|webp|gif)$/i.test(msg.attachment_url)) {
      return name;
    }
    return "รูปภาพ";
  }
  if (msg.content?.includes("__APLUS1_OFFER__")) return "ข้อเสนอราคา";
  if (msg.content?.includes("__APLUS1_HIRE_FORWARD__")) return "ส่งต่องาน";
  if (msg.content?.includes("__APLUS1_HIRE_REJECT_CHOICE__")) return "ปฏิเสธคำขอจ้าง";
  if (msg.content?.includes("__APLUS1_HIRE_CONTINUE_ASK__")) return "ขอคุยรายละเอียดเพิ่มเติม";
  return msg.content?.trim() || "ข้อความ";
}
