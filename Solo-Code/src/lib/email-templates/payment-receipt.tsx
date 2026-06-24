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

interface ReceiptProps {
  amount?: string;
  currency?: string;
  nextBillingDate?: string | null;
  invoiceUrl?: string | null;
}

const fmtDate = (iso?: string | null) => {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("th-TH", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return iso;
  }
};

const ReceiptEmail = ({
  amount = "0",
  currency = "THB",
  nextBillingDate = null,
  invoiceUrl = null,
}: ReceiptProps) => (
  <EmailLayout
    preview={`ใบเสร็จ So1o — ${amount} ${currency}`}
    badge="ใบเสร็จ"
    icon="receipt"
    title="ขอบคุณสำหรับการต่ออายุ"
    footerNote="ยกเลิกหรือเปลี่ยนวิธีชำระเงินได้ที่หน้า Pricing → จัดการ Subscription"
  >
    <EmailText>การชำระเงินรอบบิลของคุณสำเร็จเรียบร้อยครับ</EmailText>
    <EmailCard>
      <EmailCardLabel>จำนวนเงิน</EmailCardLabel>
      <p style={{ fontSize: "24px", fontWeight: 700, color: brand.orange, margin: "0 0 16px" }}>
        {amount} {currency}
      </p>
      <EmailCardLabel>วันต่ออายุครั้งถัดไป</EmailCardLabel>
      <EmailCardRow highlight>{fmtDate(nextBillingDate)}</EmailCardRow>
    </EmailCard>
    {invoiceUrl ? <EmailButton href={invoiceUrl}>ดูใบเสร็จเต็ม</EmailButton> : null}
  </EmailLayout>
);

export const template = {
  component: ReceiptEmail,
  subject: (data: Record<string, any>) =>
    `[So1o] ใบเสร็จ ${data?.amount ?? "0"} ${data?.currency ?? "THB"}`,
  displayName: "Payment receipt",
  previewData: {
    amount: "249.00",
    currency: "THB",
    nextBillingDate: "2026-06-27",
    invoiceUrl: "https://example.com/inv",
  },
} satisfies TemplateEntry;

export default ReceiptEmail;
