import {
  HIRE_CHAT_LOCKED_LIST_LABEL,
  HIRE_CLIENT_ACCEPT_REJECT_TEXT,
  HIRE_CLIENT_ACCEPT_REJECT_TEXT_LEGACY,
  HIRE_FREELANCER_DECLINE_CONTINUE_TEXT,
} from "@/lib/hireRejectChat";

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
  if (msg.content?.includes("__APLUS1_HIRE_DELIVERY__")) return "ส่งมอบผลงาน";
  const text = msg.content?.trim() ?? "";
  if (
    text === HIRE_FREELANCER_DECLINE_CONTINUE_TEXT ||
    text === HIRE_CLIENT_ACCEPT_REJECT_TEXT ||
    text === HIRE_CLIENT_ACCEPT_REJECT_TEXT_LEGACY
  ) {
    return HIRE_CHAT_LOCKED_LIST_LABEL;
  }
  return text || "ข้อความ";
}
