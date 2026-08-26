import * as React from "react";
import { EMAIL_FOOTER_NOTIFICATION } from "@/lib/copyConstants";
import {
  EmailLayout,
  EmailCard,
  EmailCardLabel,
  EmailCardRow,
  EmailButton,
  EmailText,
} from "./layout";

export interface KycStatusEmailProps {
  recipientName?: string;
  status?: "approved" | "rejected";
  reason?: string;
  actionUrl?: string;
}

const STATUS_COPY = {
  approved: {
    badge: "ยืนยันตัวตนสำเร็จ",
    title: "คำขอยืนยันตัวตนได้รับการอนุมัติแล้ว",
    tone: "success" as const,
    body: "คุณพร้อมเปิดรับงานจ้างและรับค่าจ้างตามเงื่อนไขแพลตฟอร์ม — การยืนยันมีผล 2 ปี",
    cta: "ดูสถานะการยืนยัน",
    subject: "[Aplus1] ยืนยันตัวตนสำเร็จ",
  },
  rejected: {
    badge: "คำขอไม่ผ่าน",
    title: "คำขอยืนยันตัวตนไม่ผ่าน",
    tone: "brand" as const,
    body: "กรุณาตรวจสอบเหตุผลด้านล่าง แล้วส่งเอกสารใหม่ได้ที่หน้ายืนยันตัวตน",
    cta: "ส่งคำขอใหม่",
    subject: "[Aplus1] คำขอยืนยันตัวตนไม่ผ่าน",
  },
};

export const KycStatusEmail = ({
  recipientName = "คุณ",
  status = "approved",
  reason = "",
  actionUrl = "https://aplus1.app/verify",
}: KycStatusEmailProps) => {
  const copy = STATUS_COPY[status];
  return (
    <EmailLayout
      preview={copy.title}
      badge={copy.badge}
      badgeTone={copy.tone}
      icon={status === "approved" ? "check" : "warning"}
      title={copy.title}
      footerNote={EMAIL_FOOTER_NOTIFICATION}
    >
      <EmailText>
        สวัสดี {recipientName} — {copy.body}
      </EmailText>
      {status === "rejected" && reason ? (
        <EmailCard>
          <EmailCardLabel>เหตุผล</EmailCardLabel>
          <EmailCardRow>{reason}</EmailCardRow>
        </EmailCard>
      ) : null}
      <EmailButton href={actionUrl}>{copy.cta}</EmailButton>
    </EmailLayout>
  );
};

export const kycStatusTemplate = {
  component: KycStatusEmail,
  subject: (data: Record<string, unknown>) =>
    (data.status as string) === "rejected"
      ? STATUS_COPY.rejected.subject
      : STATUS_COPY.approved.subject,
  displayName: "KYC status",
  previewData: {
    recipientName: "คุณ",
    status: "approved",
    actionUrl: "https://aplus1.app/verify",
  },
};

export default KycStatusEmail;
