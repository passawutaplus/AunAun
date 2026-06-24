import * as React from 'react'
import { Link } from '@react-email/components'
import { EmailLayout, EmailButton, EmailText, link } from './layout'

interface InviteEmailProps { siteName: string; siteUrl: string; confirmationUrl: string }

export const InviteEmail = ({ siteName, siteUrl, confirmationUrl }: InviteEmailProps) => (
  <EmailLayout
    preview={`คุณได้รับเชิญเข้าร่วม ${siteName}`}
    badge="คำเชิญ"
    icon="mail"
    title="คุณได้รับคำเชิญ"
    footerNote="ถ้าคุณไม่ได้คาดหวังคำเชิญนี้ ลบอีเมลนี้ทิ้งได้เลย"
  >
    <EmailText>
      คุณได้รับเชิญให้เข้าร่วม <Link href={siteUrl} style={link}>{siteName}</Link>{' '}
      กดปุ่มด้านล่างเพื่อยอมรับคำเชิญและสร้างบัญชีของคุณได้เลย
    </EmailText>
    <EmailButton href={confirmationUrl}>ยอมรับคำเชิญ</EmailButton>
  </EmailLayout>
)

export default InviteEmail
