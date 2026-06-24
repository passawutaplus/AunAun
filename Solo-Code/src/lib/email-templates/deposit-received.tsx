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

interface Props {
  recipientName?: string;
  clientName?: string;
  projectName?: string;
  paymentType?: "deposit" | "final" | "partial";
  amount?: string;
  note?: string;
  actionUrl?: string;
}

const PAYMENT_LABEL: Record<NonNullable<Props["paymentType"]>, string> = {
  deposit: "มัดจำ",
  final: "งวดสุดท้าย",
  partial: "ชำระบางส่วน",
};

const DepositReceivedEmail = ({
  recipientName = "คุณ",
  clientName = "ลูกค้า",
  projectName = "โปรเจกต์",
  paymentType = "deposit",
  amount = "—",
  note = "",
  actionUrl = "https://solofreelancer.com/dashboard",
}: Props) => (
  <EmailLayout
    preview={`${clientName} อัปโหลดสลิป${PAYMENT_LABEL[paymentType]} — ${projectName}`}
    badge="สลิปใหม่"
    badgeTone="brand"
    icon="payment"
    title="ลูกค้าอัปโหลดสลิปแล้ว"
  >
    <EmailText>
      สวัสดีครับ {recipientName} — <strong style={{ color: brand.ink }}>{clientName}</strong>{" "}
      อัปโหลดสลิปชำระ{PAYMENT_LABEL[paymentType]}สำหรับโปรเจกต์{" "}
      <strong style={{ color: brand.ink }}>{projectName}</strong> รอให้คุณตรวจสอบครับ
    </EmailText>
    <EmailCard>
      <EmailCardLabel>ประเภทการชำระ</EmailCardLabel>
      <EmailCardRow highlight>{PAYMENT_LABEL[paymentType]}</EmailCardRow>
      {amount !== "—" ? (
        <>
          <EmailCardLabel>ยอดที่แจ้ง</EmailCardLabel>
          <EmailCardRow>{amount}</EmailCardRow>
        </>
      ) : null}
      {note ? (
        <>
          <EmailCardLabel>หมายเหตุจากลูกค้า</EmailCardLabel>
          <EmailCardRow>{note}</EmailCardRow>
        </>
      ) : null}
    </EmailCard>
    <EmailButton href={actionUrl}>ตรวจสอบสลิป</EmailButton>
    <EmailText small>กรุณายืนยันสลิปใน Job Tracker ก่อนอัปเดตสถานะการชำระเงิน</EmailText>
  </EmailLayout>
);

export const template = {
  component: DepositReceivedEmail,
  subject: (data: Record<string, unknown>) => {
    const client = (data?.clientName as string) ?? "ลูกค้า";
    const type = PAYMENT_LABEL[(data?.paymentType as Props["paymentType"]) ?? "deposit"];
    return `[So1o] ${client} อัปโหลดสลิป${type}แล้ว`;
  },
  displayName: "Deposit / slip received",
  previewData: {
    recipientName: "พี่บอส",
    clientName: "คุณสมชาย",
    projectName: "Rebrand ร้านกาแฟ",
    paymentType: "deposit",
    amount: "฿15,000",
    note: "โอนมัดจำแล้วครับ",
    actionUrl: "https://solofreelancer.com/dashboard",
  },
} satisfies TemplateEntry;

export default DepositReceivedEmail;
