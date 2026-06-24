import * as React from "react";
import { EmailLayout, EmailButton, EmailText, brand } from "./layout";

interface EmailChangeEmailProps {
  siteName: string;
  oldEmail: string;
  email: string;
  newEmail: string;
  confirmationUrl: string;
}

export const EmailChangeEmail = ({
  siteName,
  oldEmail,
  newEmail,
  confirmationUrl,
}: EmailChangeEmailProps) => (
  <EmailLayout
    preview={`ยืนยันการเปลี่ยนอีเมล ${siteName}`}
    badge="เปลี่ยนอีเมล"
    icon="mail"
    title="ยืนยันการเปลี่ยนอีเมล"
    footerNote="ถ้าคุณไม่ได้เป็นคนทำรายการนี้ โปรดเปลี่ยนรหัสผ่านทันทีเพื่อความปลอดภัย"
  >
    <EmailText>
      คุณขอเปลี่ยนอีเมลของบัญชี {siteName} จาก{" "}
      <strong style={{ color: brand.ink }}>{oldEmail}</strong> เป็น{" "}
      <strong style={{ color: brand.orange }}>{newEmail}</strong>
    </EmailText>
    <EmailButton href={confirmationUrl}>ยืนยันการเปลี่ยนแปลง</EmailButton>
  </EmailLayout>
);

export default EmailChangeEmail;
