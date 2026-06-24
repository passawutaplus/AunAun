import * as React from "react";
import { EMAIL_FOOTER_NOT_REQUESTED } from "../copyConstants";
import { EmailLayout, EmailButton, EmailText } from "./layout";

interface RecoveryEmailProps {
  siteName: string;
  confirmationUrl: string;
}

export const RecoveryEmail = ({ siteName, confirmationUrl }: RecoveryEmailProps) => (
  <EmailLayout
    preview={`รีเซ็ตรหัสผ่าน ${siteName}`}
    icon="mail"
    title="รีเซ็ตรหัสผ่าน"
    footerNote={EMAIL_FOOTER_NOT_REQUESTED}
  >
    <EmailText>
      กดปุ่มด้านล่างตั้งรหัสผ่านใหม่ — ลิงก์ใช้ได้ครั้งเดียว หมดอายุใน 1 ชั่วโมง
    </EmailText>
    <EmailButton href={confirmationUrl}>ตั้งรหัสผ่านใหม่</EmailButton>
  </EmailLayout>
);

export default RecoveryEmail;
