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

interface ProjectAlertProps {
  recipientName?: string;
  projectName?: string;
  alertType?: "deadline" | "comment" | "status" | "analysis_complete";
  message?: string;
  actionUrl?: string;
  dueDate?: string;
}

const ALERT_LABEL: Record<NonNullable<ProjectAlertProps["alertType"]>, string> = {
  deadline: "ใกล้ครบกำหนด",
  comment: "มีคอมเมนต์ใหม่",
  status: "อัปเดตสถานะ",
  analysis_complete: "วิเคราะห์บรีฟเสร็จแล้ว",
};

const ALERT_BADGE: Record<NonNullable<ProjectAlertProps["alertType"]>, string> = {
  deadline: "ใกล้ครบกำหนด",
  comment: "คอมเมนต์ใหม่",
  status: "อัปเดตสถานะ",
  analysis_complete: "AI วิเคราะห์เสร็จ",
};

const ProjectAlertEmail = ({
  recipientName = "คุณ",
  projectName = "โปรเจกต์ของคุณ",
  alertType = "status",
  message = "มีความเคลื่อนไหวใหม่ในโปรเจกต์ของคุณ",
  actionUrl = "https://solofreelancer.com/dashboard",
  dueDate,
}: ProjectAlertProps) => (
  <EmailLayout
    preview={`${ALERT_LABEL[alertType]} — ${projectName}`}
    badge={ALERT_BADGE[alertType]}
    badgeTone={alertType === "deadline" ? "warning" : "brand"}
    icon="bell"
    title={ALERT_LABEL[alertType]}
    footerNote="คุณได้รับอีเมลนี้เพราะมีกิจกรรมใหม่ในโปรเจกต์ของคุณ"
  >
    <EmailText>
      สวัสดีครับ {recipientName} — มีอัปเดตจากโปรเจกต์{" "}
      <strong style={{ color: brand.ink }}>{projectName}</strong> ที่คุณควรดูครับ
    </EmailText>
    <EmailCard>
      <EmailCardLabel>โปรเจกต์</EmailCardLabel>
      <EmailCardRow highlight>{projectName}</EmailCardRow>
      <EmailCardLabel>รายละเอียด</EmailCardLabel>
      <EmailCardRow>{message}</EmailCardRow>
      {dueDate ? (
        <>
          <EmailCardLabel>กำหนดส่ง</EmailCardLabel>
          <EmailCardRow highlight>{dueDate}</EmailCardRow>
        </>
      ) : null}
    </EmailCard>
    <EmailButton href={actionUrl}>เปิดดูโปรเจกต์</EmailButton>
  </EmailLayout>
);

export const template = {
  component: ProjectAlertEmail,
  subject: (data: Record<string, any>) => {
    const t = (data?.alertType ?? "status") as keyof typeof ALERT_LABEL;
    const name = data?.projectName ?? "โปรเจกต์ของคุณ";
    return `[So1o] ${ALERT_LABEL[t] ?? "แจ้งเตือนโปรเจกต์"} — ${name}`;
  },
  displayName: "Project alert",
  previewData: {
    recipientName: "พี่บอส",
    projectName: "Rebrand ร้านกาแฟ Sundae",
    alertType: "deadline",
    message: "งานออกแบบโลโก้รอบ Final ใกล้ครบกำหนดส่งแล้ว เหลืออีก 2 วัน",
    actionUrl: "https://solofreelancer.com/dashboard",
    dueDate: "28 พ.ค. 2026",
  },
} satisfies TemplateEntry;

export default ProjectAlertEmail;
