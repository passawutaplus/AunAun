import * as React from "react";
import type { TemplateEntry } from "./registry";
import {
  EmailLayout,
  EmailCard,
  EmailCardLabel,
  EmailCardRow,
  EmailButton,
  EmailText,
  brand,
} from "./layout";
import type { IconName } from "./icons";

interface Props {
  clientName?: string;
  freelancerName?: string;
  projectName?: string;
  invoiceNumber?: string;
  amount?: string;
  dueDate?: string;
  overdueDays?: number;
  tone?: "soft" | "formal" | "urgent";
  message?: string;
  portalUrl?: string;
}

const TONE_BADGE: Record<
  NonNullable<Props["tone"]>,
  { label: string; tone: "brand" | "warning" | "neutral" }
> = {
  soft: { label: "แจ้งเตือนการชำระ", tone: "brand" },
  formal: { label: "ติดตามการชำระ", tone: "neutral" },
  urgent: { label: "เร่งด่วน", tone: "warning" },
};

const TONE_TITLE: Record<NonNullable<Props["tone"]>, string> = {
  soft: "แจ้งเตือนยอดชำระ",
  formal: "ติดตามการชำระเงิน",
  urgent: "แจ้งยอดค้างชำระเร่งด่วน",
};

const TONE_ICON: Record<NonNullable<Props["tone"]>, IconName> = {
  soft: "receipt",
  formal: "receipt",
  urgent: "warning",
};

const PaymentFollowupEmail = ({
  clientName = "ลูกค้า",
  freelancerName = "ฟรีแลนซ์ของคุณ",
  projectName = "โปรเจกต์",
  invoiceNumber = "—",
  amount = "—",
  dueDate = "—",
  overdueDays = 0,
  tone = "soft",
  message = "",
  portalUrl = "https://solofreelancer.com",
}: Props) => {
  const badge = TONE_BADGE[tone];

  return (
    <EmailLayout
      preview={`${freelancerName} แจ้งยอดชำระ ${amount} — ${projectName}`}
      badge={badge.label}
      badgeTone={badge.tone}
      icon={TONE_ICON[tone]}
      title={TONE_TITLE[tone]}
      footerNote={`อีเมลนี้ส่งจาก ${freelancerName} ผ่าน So1o Freelancer`}
    >
      <EmailText>
        สวัสดีครับ/ค่ะ {clientName} — {freelancerName} ขอแจ้งเตือนการชำระเงินสำหรับโปรเจกต์{" "}
        <strong style={{ color: brand.ink }}>{projectName}</strong>
      </EmailText>
      <EmailCard>
        <EmailCardLabel>ยอดที่ต้องชำระ</EmailCardLabel>
        <EmailCardRow highlight>{amount}</EmailCardRow>
        <EmailCardLabel>เลขที่เอกสาร</EmailCardLabel>
        <EmailCardRow>{invoiceNumber}</EmailCardRow>
        <EmailCardLabel>ครบกำหนด</EmailCardLabel>
        <EmailCardRow>
          {dueDate}
          {overdueDays > 0 ? ` (เกินกำหนด ${overdueDays} วัน)` : ""}
        </EmailCardRow>
      </EmailCard>
      {message ? (
        <EmailCard>
          <EmailCardLabel>ข้อความ</EmailCardLabel>
          <EmailCardRow>{message}</EmailCardRow>
        </EmailCard>
      ) : null}
      <EmailButton href={portalUrl}>ดูรายละเอียด / ชำระเงิน</EmailButton>
      <EmailText small>
        หากชำระแล้ว รบกวนอัปโหลดสลิปผ่านลิงก์ด้านบนหรือแจ้งกลับ {freelancerName} ได้เลยครับ/ค่ะ
      </EmailText>
    </EmailLayout>
  );
};

export const template = {
  component: PaymentFollowupEmail,
  subject: (data: Record<string, unknown>) => {
    const inv = (data?.invoiceNumber as string) ?? "";
    const amt = (data?.amount as string) ?? "";
    return `[So1o] แจ้งเตือนการชำระ ${inv} — ${amt}`;
  },
  displayName: "Payment follow-up",
  previewData: {
    clientName: "คุณสมชาย",
    freelancerName: "So1o Studio",
    projectName: "Rebrand ร้านกาแฟ",
    invoiceNumber: "INV-2026-0042",
    amount: "฿25,000",
    dueDate: "20 พ.ค. 2026",
    overdueDays: 7,
    tone: "formal",
    message: "รบกวนแจ้งกำหนดการชำระเงินภายใน 3 วันทำการนะครับ/ค่ะ",
    portalUrl: "https://solofreelancer.com/track/example",
  },
} satisfies TemplateEntry;

export default PaymentFollowupEmail;
