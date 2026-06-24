import * as React from "react";
import type { TemplateEntry } from "./registry";
import { EmailLayout, EmailButton, EmailText, brand } from "./layout";

interface CanceledProps {
  endsAt?: string | null;
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

const CanceledEmail = ({ endsAt = null }: CanceledProps) => (
  <EmailLayout
    preview={`ยืนยันการยกเลิก subscription — คุณยังใช้งานได้ถึง ${fmtDate(endsAt)}`}
    badge="ยืนยันการยกเลิก"
    badgeTone="neutral"
    icon="cancel"
    title="ขอบคุณที่อยู่กับเรามาตลอด"
    footerNote="มีข้อเสนอแนะอยากบอกเรา? ตอบกลับเมลนี้ได้เลย — เราอ่านทุกฉบับครับ"
  >
    <EmailText>เราได้รับคำขอยกเลิก subscription ของคุณเรียบร้อยแล้ว</EmailText>
    <EmailText>
      คุณยังสามารถใช้งานฟีเจอร์ Pro ได้จนถึงวันที่{" "}
      <strong style={{ color: brand.orange }}>{fmtDate(endsAt)}</strong> หลังจากนั้นบัญชีจะกลับสู่
      Free Plan โดยอัตโนมัติ — ข้อมูลของคุณยังอยู่ครบ
    </EmailText>
    <EmailButton href="https://solofreelancer.com/pricing">กลับมาเป็นสมาชิกอีกครั้ง</EmailButton>
  </EmailLayout>
);

export const template = {
  component: CanceledEmail,
  subject: () => `[So1o] ยืนยันยกเลิก subscription`,
  displayName: "Subscription canceled",
  previewData: { endsAt: "2026-06-27" },
} satisfies TemplateEntry;

export default CanceledEmail;
