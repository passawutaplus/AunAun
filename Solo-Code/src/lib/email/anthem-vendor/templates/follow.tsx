import * as React from "react";
import { EMAIL_FOOTER_NOTIFICATION } from "../copyConstants";
import {
  EmailLayout,
  EmailCard,
  EmailCardLabel,
  EmailCardRow,
  EmailButton,
  EmailText,
  brand,
} from "./layout";

export interface FollowEmailProps {
  recipientName?: string;
  followerName?: string;
  actionUrl?: string;
}

export const FollowEmail = ({
  recipientName = "คุณ",
  followerName = "ครีเอเตอร์",
  actionUrl = "https://1px-demo.vercel.app/portfolio/manage",
}: FollowEmailProps) => (
  <EmailLayout
    preview={`${followerName} เริ่มติดตามคุณ`}
    badge="ผู้ติดตามใหม่"
    badgeTone="brand"
    icon="follow"
    title="มีคนติดตามคุณ"
    footerNote={EMAIL_FOOTER_NOTIFICATION}
  >
    <EmailText>
      สวัสดี {recipientName} — <strong style={{ color: brand.ink }}>{followerName}</strong>{" "}
      เริ่มติดตามโปรไฟล์ของคุณบน Pixel100
    </EmailText>
    <EmailCard>
      <EmailCardLabel>ผู้ติดตาม</EmailCardLabel>
      <EmailCardRow highlight>{followerName}</EmailCardRow>
    </EmailCard>
    <EmailButton href={actionUrl}>ดูโปรไฟล์ของฉัน</EmailButton>
  </EmailLayout>
);

export const followTemplate = {
  component: FollowEmail,
  subject: (data: Record<string, unknown>) =>
    `[Pixel100] ${(data.followerName as string) ?? "มีคน"} เริ่มติดตามคุณ`,
  displayName: "New follower",
  previewData: {
    recipientName: "พี่บอส",
    followerName: "น้องมิ้นท์",
    actionUrl: "https://1px-demo.vercel.app/portfolio/manage",
  },
};

export default FollowEmail;
