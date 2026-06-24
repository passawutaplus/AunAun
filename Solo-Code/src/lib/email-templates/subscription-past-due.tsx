import * as React from "react";
import type { TemplateEntry } from "./registry";
import { EmailLayout, EmailButton, EmailText } from "./layout";

interface PastDueProps {
  priceId?: string;
}

const PastDueEmail = ({ priceId = "pro" }: PastDueProps) => (
  <EmailLayout
    preview="การชำระเงินไม่สำเร็จ — กรุณาอัปเดตวิธีชำระเงิน"
    badge="แจ้งเตือนการชำระเงิน"
    badgeTone="warning"
    icon="warning"
    title="การชำระเงินไม่สำเร็จ"
    footerNote="ติดปัญหา? ตอบกลับเมลนี้ได้เลยครับ"
  >
    <EmailText>
      เราพยายามตัดเงินรอบบิลของแพ็กเกจ <strong>{priceId}</strong> แต่ไม่สำเร็จ
      เพื่อไม่ให้บัญชีถูกระงับ กรุณาอัปเดตช่องทางชำระเงินภายใน 7 วัน
    </EmailText>
    <EmailText>
      ระหว่างนี้คุณยังใช้งานได้ตามปกติ — Stripe จะลองตัดเงินอัตโนมัติอีก 2-3 ครั้ง
    </EmailText>
    <EmailButton href="https://solofreelancer.com/pricing">อัปเดตวิธีชำระเงิน</EmailButton>
  </EmailLayout>
);

export const template = {
  component: PastDueEmail,
  subject: () => `[So1o] การชำระเงินไม่สำเร็จ — โปรดอัปเดตบัตร`,
  displayName: "Subscription past due",
  previewData: { priceId: "pro_monthly" },
} satisfies TemplateEntry;

export default PastDueEmail;
