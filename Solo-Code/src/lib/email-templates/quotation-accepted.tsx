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
  quotationNumber?: string;
  actionUrl?: string;
}

const QuotationAcceptedEmail = ({
  recipientName = "คุณ",
  clientName = "ลูกค้า",
  projectName = "โปรเจกต์",
  quotationNumber = "—",
  actionUrl = "https://solofreelancer.com/dashboard",
}: Props) => (
  <EmailLayout
    preview={`${clientName} ยอมรับใบเสนอราคา ${quotationNumber} แล้ว`}
    badge="ลูกค้ายอมรับแล้ว"
    badgeTone="success"
    icon="celebration"
    title="ลูกค้ายอมรับใบเสนอราคาแล้ว"
  >
    <EmailText>
      ยินดีด้วยครับ {recipientName} — <strong style={{ color: brand.ink }}>{clientName}</strong>{" "}
      กดยอมรับใบเสนอราคาสำหรับโปรเจกต์ <strong style={{ color: brand.ink }}>{projectName}</strong>{" "}
      เรียบร้อยแล้ว พร้อมออกใบแจ้งหนี้และเริ่มงานได้เลย
    </EmailText>
    <EmailCard>
      <EmailCardLabel>ลูกค้า</EmailCardLabel>
      <EmailCardRow highlight>{clientName}</EmailCardRow>
      <EmailCardLabel>โปรเจกต์</EmailCardLabel>
      <EmailCardRow>{projectName}</EmailCardRow>
      <EmailCardLabel>เลขที่ใบเสนอราคา</EmailCardLabel>
      <EmailCardRow>{quotationNumber}</EmailCardRow>
    </EmailCard>
    <EmailButton href={actionUrl}>เปิดใบเสนอราคา</EmailButton>
  </EmailLayout>
);

export const template = {
  component: QuotationAcceptedEmail,
  subject: (data: Record<string, unknown>) => {
    const client = (data?.clientName as string) ?? "ลูกค้า";
    const num = (data?.quotationNumber as string) ?? "";
    return `[So1o] ${client} ยอมรับใบเสนอราคา ${num} แล้ว`;
  },
  displayName: "Quotation accepted",
  previewData: {
    recipientName: "พี่บอส",
    clientName: "คุณสมชาย",
    projectName: "Rebrand ร้านกาแฟ",
    quotationNumber: "QT-2026-0042",
    actionUrl: "https://solofreelancer.com/dashboard",
  },
} satisfies TemplateEntry;

export default QuotationAcceptedEmail;
