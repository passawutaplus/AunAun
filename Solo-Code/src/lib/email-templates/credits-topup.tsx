import * as React from "react";
import type { TemplateEntry } from "./registry";
import { EmailLayout, EmailCard, EmailCardLabel, EmailButton, EmailText, brand } from "./layout";

interface CreditsTopupProps {
  credits?: number;
  balance?: number;
  priceId?: string;
}

const CreditsTopupEmail = ({ credits = 0, balance = 0 }: CreditsTopupProps) => (
  <EmailLayout
    preview={`เติมเครดิตสำเร็จ +${credits} (ยอดรวม ${balance})`}
    badge="เติมเครดิตสำเร็จ"
    badgeTone="success"
    icon="credits"
    title={`+${credits} AI Credits`}
    footerNote="เครดิตไม่หมดอายุ"
  >
    <EmailText>
      การเติมเครดิตของคุณเรียบร้อยแล้ว ใช้งาน AI Mentor / Brief / Image ได้ทันที
    </EmailText>
    <EmailCard>
      <EmailCardLabel>ยอดเครดิตปัจจุบัน</EmailCardLabel>
      <p style={{ fontSize: "36px", fontWeight: 700, color: brand.orange, margin: "4px 0 0" }}>
        {balance.toLocaleString("th-TH")}
      </p>
    </EmailCard>
    <EmailButton href="https://solofreelancer.com/dashboard">เปิด Dashboard</EmailButton>
  </EmailLayout>
);

export const template = {
  component: CreditsTopupEmail,
  subject: (data: Record<string, any>) => `[So1o] เติมเครดิตสำเร็จ +${data?.credits ?? 0}`,
  displayName: "Credits top-up",
  previewData: { credits: 500, balance: 1200, priceId: "credits_500" },
} satisfies TemplateEntry;

export default CreditsTopupEmail;
