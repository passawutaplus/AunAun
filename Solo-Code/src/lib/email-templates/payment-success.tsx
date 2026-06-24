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

interface PaymentSuccessProps {
  recipientName?: string;
  clientName?: string;
  projectName?: string;
  amount?: number;
  currency?: string;
  paymentDate?: string;
  invoiceNumber?: string;
  receiptUrl?: string;
}

const formatAmount = (n: number, currency: string) => {
  try {
    return new Intl.NumberFormat("th-TH", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `${n.toLocaleString("th-TH")} ${currency}`;
  }
};

const PaymentSuccessEmail = ({
  recipientName = "คุณ",
  clientName = "ลูกค้าของคุณ",
  projectName = "โปรเจกต์",
  amount = 0,
  currency = "THB",
  paymentDate = new Date().toLocaleDateString("th-TH"),
  invoiceNumber = "—",
  receiptUrl = "https://solofreelancer.com/dashboard",
}: PaymentSuccessProps) => (
  <EmailLayout
    preview={`ได้รับเงินจาก ${clientName} เรียบร้อย`}
    badge="ชำระเงินสำเร็จ"
    badgeTone="success"
    icon="payment"
    title="ได้รับเงินแล้ว"
    footerNote="ตัวเลขทั้งหมดเป็นการคำนวณเบื้องต้น โปรดเก็บบันทึกไว้สำหรับการยื่นภาษีนะครับ"
  >
    <EmailText>
      ยินดีด้วยครับ {recipientName} — {clientName} ชำระเงินสำหรับ{" "}
      <strong style={{ color: brand.ink }}>{projectName}</strong> เรียบร้อยแล้ว
    </EmailText>
    <EmailCard>
      <EmailCardLabel>จำนวนเงิน</EmailCardLabel>
      <p style={{ fontSize: "28px", fontWeight: 700, color: brand.orange, margin: "0 0 16px" }}>
        {formatAmount(amount, currency)}
      </p>
      <EmailCardLabel>ลูกค้า</EmailCardLabel>
      <EmailCardRow highlight>{clientName}</EmailCardRow>
      <EmailCardLabel>โปรเจกต์</EmailCardLabel>
      <EmailCardRow>{projectName}</EmailCardRow>
      <EmailCardLabel>เลขที่ใบแจ้งหนี้</EmailCardLabel>
      <EmailCardRow>{invoiceNumber}</EmailCardRow>
      <EmailCardLabel>วันที่ชำระ</EmailCardLabel>
      <EmailCardRow>{paymentDate}</EmailCardRow>
    </EmailCard>
    <EmailButton href={receiptUrl}>ดูใบเสร็จ</EmailButton>
  </EmailLayout>
);

export const template = {
  component: PaymentSuccessEmail,
  subject: (data: Record<string, any>) => {
    const amt = formatAmount(data?.amount ?? 0, data?.currency ?? "THB");
    return `[So1o] ได้รับเงินแล้ว ${amt} จาก ${data?.clientName ?? "ลูกค้า"}`;
  },
  displayName: "Payment success",
  previewData: {
    recipientName: "พี่บอส",
    clientName: "บริษัท Sundae Cafe จำกัด",
    projectName: "Rebrand & Logo Design",
    amount: 25000,
    currency: "THB",
    paymentDate: "27 พ.ค. 2026",
    invoiceNumber: "INV-2026-0042",
    receiptUrl: "https://solofreelancer.com/dashboard",
  },
} satisfies TemplateEntry;

export default PaymentSuccessEmail;
