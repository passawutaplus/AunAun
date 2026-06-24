import * as React from 'react'
import { EMAIL_FOOTER_NOT_REQUESTED } from '@/lib/copyConstants'
import { EmailLayout, EmailButton, EmailText } from './layout'

interface MagicLinkEmailProps { siteName: string; confirmationUrl: string }

export const MagicLinkEmail = ({ siteName, confirmationUrl }: MagicLinkEmailProps) => (
  <EmailLayout
    preview={`เข้าสู่ระบบ ${siteName}`}
    icon="mail"
    title="เข้าสู่ระบบด่วน"
    footerNote={EMAIL_FOOTER_NOT_REQUESTED}
  >
    <EmailText>
      กดปุ่มด้านล่างเข้า {siteName} โดยไม่ต้องใช้รหัสผ่าน — ลิงก์ใช้ได้ครั้งเดียว หมดอายุใน 1 ชั่วโมง
    </EmailText>
    <EmailButton href={confirmationUrl}>เข้าสู่ระบบ</EmailButton>
  </EmailLayout>
)

export default MagicLinkEmail
