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
  priceId?: string;
  endsAt?: string | null;
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

const ScheduledCancelEmail = ({ priceId, endsAt = null }: Props) => (
  <EmailLayout
    preview={`กำหนดยกเลิก ${planLabel(priceId)} เมื่อ ${fmtDate(endsAt)}`}
    badge="กำหนดยกเลิก"
    badgeTone="neutral"
    icon="cancel"
    title="ยืนยันการกำหนดยกเลิก"
  >
    <EmailText>
      เราได้รับคำขอยกเลิกแพ็กเกจ <strong style={{ color: brand.ink }}>{planLabel(priceId)}</strong>{" "}
      ของคุณแล้ว คุณยังใช้งานฟีเจอร์ Pro ได้จนถึงวันที่กำหนดด้านล่าง
    </EmailText>
    <EmailCard>
      <EmailCardLabel>แพ็กเกจ</EmailCardLabel>
      <EmailCardRow>{planLabel(priceId)}</EmailCardRow>
      <EmailCardLabel>ใช้งานได้ถึง</EmailCardLabel>
      <EmailCardRow highlight>{fmtDate(endsAt)}</EmailCardRow>
    </EmailCard>
    <EmailText>
      เปลี่ยนใจ? กลับมาเป็นสมาชิกได้ตลอดก่อนวันสิ้นสุด — ข้อมูลโปรเจกต์ของคุณยังอยู่ครบ
    </EmailText>
    <EmailButton href="https://solofreelancer.com/pricing">จัดการ Subscription</EmailButton>
  </EmailLayout>
);

export const template = {
  component: ScheduledCancelEmail,
  subject: () => `[So1o] ยืนยันกำหนดยกเลิก subscription`,
  displayName: "Subscription scheduled cancel",
  previewData: { priceId: "pro_monthly", endsAt: "2026-06-27" },
} satisfies TemplateEntry;

export default ScheduledCancelEmail;
