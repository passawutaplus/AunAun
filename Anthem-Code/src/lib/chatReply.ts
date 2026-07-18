import { parseChatOffer, formatOfferAmount } from "@/lib/chatOffer";
import {
  HIRE_CHAT_LOCKED_LIST_LABEL,
  HIRE_CLIENT_ACCEPT_REJECT_TEXT,
  HIRE_CLIENT_ACCEPT_REJECT_TEXT_LEGACY,
  HIRE_FREELANCER_DECLINE_CONTINUE_TEXT,
  parseHireRejectChoiceMessage,
  parseHireContinueAskMessage,
} from "@/lib/hireRejectChat";

export type ReplyPreviewSource = {
  content?: string | null;
  attachment_url?: string | null;
  message_type?: string | null;
  deleted_at?: string | null;
};

function extractJsonStringField(content: string, key: string): string | null {
  const m = content.match(new RegExp(`"${key}"\\s*:\\s*"((?:\\\\.|[^"\\\\])*)"`));
  return m?.[1]?.replace(/\\"/g, '"').replace(/\\n/g, "\n") ?? null;
}

function extractJsonNumberField(content: string, key: string): number | null {
  const m = content.match(new RegExp(`"${key}"\\s*:\\s*(\\d+(?:\\.\\d+)?)`));
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : null;
}

/** Human-readable preview for chat protocol blobs (offers, hire reject, …). */
export function chatProtocolPreviewText(content: string): string | null {
  if (!content.includes("__APLUS1_")) return null;

  if (content.includes("__APLUS1_OFFER__")) {
    const offer = parseChatOffer(content);
    if (offer) {
      return `ส่งข้อเสนอราคา «${offer.title}» · ${formatOfferAmount(offer.amount)}`;
    }
    const title = extractJsonStringField(content, "title");
    const amount = extractJsonNumberField(content, "amount");
    if (title && amount != null) {
      return `ส่งข้อเสนอราคา «${title}» · ${formatOfferAmount(amount)}`;
    }
    if (title) return `ส่งข้อเสนอราคา «${title}»`;
    return "ส่งข้อเสนอราคา";
  }

  if (content.includes("__APLUS1_HIRE_REJECT_CHOICE__")) {
    const parsed = parseHireRejectChoiceMessage(content);
    const reason =
      parsed?.reasonLabel || extractJsonStringField(content, "reasonLabel") || "ปฏิเสธคำขอจ้าง";
    const note = parsed?.note?.trim() || extractJsonStringField(content, "note");
    if (note) return `ปฏิเสธคำขอจ้าง · ${reason} — ${note}`;
    return `ปฏิเสธคำขอจ้าง · ${reason}`;
  }

  if (content.includes("__APLUS1_HIRE_CONTINUE_ASK__")) {
    if (parseHireContinueAskMessage(content) || content.includes("continue_ask")) {
      return "ขอคุยรายละเอียดเพิ่มเติม";
    }
    return "ขอคุยรายละเอียดเพิ่มเติม";
  }

  if (content.includes("__APLUS1_HIRE_FORWARD__")) {
    const toName = extractJsonStringField(content, "toName");
    return toName ? `ส่งต่องานให้ ${toName}` : "ส่งต่องาน";
  }

  if (content.includes("__APLUS1_HIRE_CANCEL__")) {
    return "คำขอยกเลิกงาน";
  }

  if (content.includes("__APLUS1_HIRE_DELIVERY__")) {
    return "ส่งมอบผลงาน";
  }

  if (content.includes("__APLUS1_HIRE_PAID__")) {
    return "ยอมรับข้อเสนอและชำระแล้ว";
  }

  if (content.includes("__APLUS1_HIRE_WORK_START__")) {
    return "เริ่มทำงาน";
  }

  if (/^ชำระเงิน\s*฿?[\d,]/.test(content) && content.includes("พักเงิน")) {
    return "ยอมรับข้อเสนอและชำระแล้ว";
  }

  if (/^ยอมรับข้อเสนอ\s*«/.test(content) && content.includes("ลุยต่อได้เลย")) {
    return "ยอมรับข้อเสนอและชำระแล้ว";
  }

  return "ข้อความในแชท";
}

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

  const text = msg.content?.trim() ?? "";
  const protocol = text ? chatProtocolPreviewText(text) : null;
  if (protocol) return protocol;

  if (
    text === HIRE_FREELANCER_DECLINE_CONTINUE_TEXT ||
    text === HIRE_CLIENT_ACCEPT_REJECT_TEXT ||
    text === HIRE_CLIENT_ACCEPT_REJECT_TEXT_LEGACY
  ) {
    return HIRE_CHAT_LOCKED_LIST_LABEL;
  }
  return text || "ข้อความ";
}

/** Notification / email body when the stored value may be a raw chat protocol blob. */
export function notificationBodyPreview(body: string | null | undefined): string {
  const text = body?.trim() ?? "";
  if (!text) return "";
  return replyPreviewText({ content: text });
}
