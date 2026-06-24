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

interface QuotationPortalProps {
  clientName?: string;
  freelancerName?: string;
  projectName?: string;
  portalUrl?: string;
  depositAmount?: string;
  message?: string;
}

const QuotationPortalEmail = ({
  clientName = "ลูกค้า",
  freelancerName = "ฟรีแลนซ์ของคุณ",
  projectName = "โปรเจกต์",
  portalUrl = "https://solofreelancer.com",
  depositAmount,
  message = "มีใบเสนอราคาและลิงก์ติดตามงานรอให้คุณดูครับ",
}: QuotationPortalProps) => (
  <EmailLayout
    preview={`${freelancerName} ส่งใบเสนอราคา — ${projectName}`}
    badge="ใบเสนอราคา & ติดตามงาน"
    icon="document"
    title="ใบเสนอราคาพร้อมแล้ว"
    footerNote={`อีเมลนี้ส่งจาก So1o ในนาม ${freelancerName}`}
  >
    <EmailText>
      สวัสดีครับ/ค่ะ {clientName} — {freelancerName} ส่งลิงก์ให้ดูใบเสนอราคาและติดตามงาน{" "}
      <strong style={{ color: brand.ink }}>{projectName}</strong> ครับ/ค่ะ
    </EmailText>
    <EmailCard>
      <EmailCardLabel>ข้อความจากฟรีแลนซ์</EmailCardLabel>
      <EmailCardRow>{message}</EmailCardRow>
      {depositAmount ? (
        <>
          <EmailCardLabel>มัดจำที่ต้องชำระ</EmailCardLabel>
          <EmailCardRow highlight>{depositAmount}</EmailCardRow>
        </>
      ) : null}
    </EmailCard>
    <EmailText small>
      ในลิงก์นี้คุณสามารถ: ดูใบเสนอราคา · ยอมรับข้อเสนอ · สแกน QR ชำระมัดจำ · อัปโหลดสลิป ·
      ติดตามความคืบหน้างาน
    </EmailText>
    <EmailButton href={portalUrl}>เปิดดูใบเสนอราคา</EmailButton>
  </EmailLayout>
);

export const template = {
  component: QuotationPortalEmail,
  subject: (data: Record<string, unknown>) => {
    const name = (data?.projectName as string) ?? "โปรเจกต์";
    const from = (data?.freelancerName as string) ?? "ฟรีแลนซ์";
    return `[So1o] ใบเสนอราคา — ${name} จาก ${from}`;
  },
  displayName: "Quotation portal link",
  previewData: {
    clientName: "คุณสมชาย",
    freelancerName: "So1o Studio",
    projectName: "Rebrand ร้านกาแฟ",
    portalUrl: "https://solofreelancer.com/track/example",
    depositAmount: "฿15,000",
    message: "แนบใบเสนอราคาและรายละเอียดงานไว้ในลิงก์แล้ว รบกวนตรวจสอบและกดยอมรับได้เลยครับ",
  },
} satisfies TemplateEntry;

export default QuotationPortalEmail;
