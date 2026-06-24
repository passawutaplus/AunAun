import * as React from "react";
import type { TemplateEntry } from "./registry";
import { EmailLayout, EmailCard, EmailButton, EmailText } from "./layout";
import { EmailFeatureItem } from "./icons";

interface WelcomeProProps {
  priceId?: string;
  environment?: string;
}

const planLabel = (priceId?: string) => {
  switch (priceId) {
    case "pro_monthly":
      return "Pro (รายเดือน)";
    case "pro_yearly":
      return "Pro (รายปี)";
    case "inhouse_monthly":
      return "In-House (รายเดือน)";
    case "inhouse_yearly":
      return "In-House (รายปี)";
    default:
      return "Pro";
  }
};

const WelcomeProEmail = ({ priceId }: WelcomeProProps) => (
  <EmailLayout
    preview={`ยินดีต้อนรับสู่ So1o ${planLabel(priceId)} — ปลดล็อกทุกฟีเจอร์แล้ว`}
    badge="สมัครสำเร็จ"
    badgeTone="success"
    icon="celebration"
    title={`ยินดีต้อนรับสู่ ${planLabel(priceId)}`}
    footerNote="มีข้อสงสัยตอบกลับเมลนี้ได้เลยครับ"
  >
    <EmailText>
      ขอบคุณที่ไว้วางใจ So1o ครับ — บัญชีของคุณได้รับการอัปเกรดเรียบร้อยแล้ว
      ทุกฟีเจอร์ระดับโปรพร้อมใช้งานทันที
    </EmailText>
    <EmailCard>
      <EmailFeatureItem>Job Tracker ไม่จำกัด</EmailFeatureItem>
      <EmailFeatureItem>AI Mentor ขั้นสูงไม่จำกัด</EmailFeatureItem>
      <EmailFeatureItem>Content Planner + AI Assist</EmailFeatureItem>
      <EmailFeatureItem>Design Brief แบบมืออาชีพ</EmailFeatureItem>
      <EmailFeatureItem>Public Tracking Links ไม่จำกัด</EmailFeatureItem>
    </EmailCard>
    <EmailButton href="https://solofreelancer.com/dashboard">เปิด Dashboard</EmailButton>
  </EmailLayout>
);

export const template = {
  component: WelcomeProEmail,
  subject: (data: Record<string, any>) => `[So1o] ยินดีต้อนรับสู่ ${planLabel(data?.priceId)}`,
  displayName: "Welcome Pro",
  previewData: { priceId: "pro_yearly", environment: "live" },
} satisfies TemplateEntry;

export default WelcomeProEmail;
