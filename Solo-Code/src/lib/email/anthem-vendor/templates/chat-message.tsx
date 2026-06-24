import * as React from "react";
import { EMAIL_FOOTER_NOTIFICATION } from "../copyConstants";
import {
  EmailLayout,
  EmailCard,
  EmailCardLabel,
  EmailCardRow,
  EmailButton,
  EmailText,
  brand,
} from "./layout";

export interface ChatMessageEmailProps {
  recipientName?: string;
  senderName?: string;
  conversationTitle?: string;
  preview?: string;
  actionUrl?: string;
}

export const ChatMessageEmail = ({
  recipientName = "คุณ",
  senderName = "มีคนส่งข้อความ",
  conversationTitle = "แชท",
  preview = "",
  actionUrl = "https://1px-demo.vercel.app/chat",
}: ChatMessageEmailProps) => (
  <EmailLayout
    preview={`${senderName}: ${preview.slice(0, 60) || "ข้อความใหม่"}`}
    badge="ข้อความใหม่"
    badgeTone="brand"
    icon="chat"
    title="มีข้อความในแชท"
    footerNote={EMAIL_FOOTER_NOTIFICATION}
  >
    <EmailText>
      สวัสดี {recipientName} — <strong style={{ color: brand.ink }}>{senderName}</strong>{" "}
      ส่งข้อความใน <strong style={{ color: brand.ink }}>{conversationTitle}</strong>
    </EmailText>
    <EmailCard>
      <EmailCardLabel>จาก</EmailCardLabel>
      <EmailCardRow highlight>{senderName}</EmailCardRow>
      <EmailCardLabel>ข้อความ</EmailCardLabel>
      <EmailCardRow>{preview || "(ไฟล์แนบ)"}</EmailCardRow>
    </EmailCard>
    <EmailButton href={actionUrl}>เปิดแชท</EmailButton>
  </EmailLayout>
);

export const chatMessageTemplate = {
  component: ChatMessageEmail,
  subject: (data: Record<string, unknown>) =>
    `[Pixel100] ข้อความใหม่จาก ${(data.senderName as string) ?? "แชท"}`,
  displayName: "Chat message",
  previewData: {
    recipientName: "พี่บอส",
    senderName: "น้องมิ้นท์",
    conversationTitle: "Rebrand Sundae Cafe",
    preview: "สวัสดีครับ อยากคุยรายละเอียดงาน logo เพิ่มเติมได้ไหมครับ",
    actionUrl: "https://1px-demo.vercel.app/chat/example",
  },
};

export default ChatMessageEmail;
