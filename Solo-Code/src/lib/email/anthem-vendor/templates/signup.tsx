import * as React from 'react'
import { Link } from '@react-email/components'
import { EMAIL_FOOTER_NOT_SIGNED_UP } from '../copyConstants'
import { EmailLayout, EmailButton, EmailText, link } from './layout'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({ siteName, siteUrl, recipient, confirmationUrl }: SignupEmailProps) => (
  <EmailLayout
    preview={`ยืนยันอีเมล ${siteName}`}
    icon="mail"
    title="ยินดีต้อนรับ"
    footerNote={EMAIL_FOOTER_NOT_SIGNED_UP}
  >
    <EmailText>
      กดปุ่มด้านล่างยืนยัน <strong>{recipient}</strong> แล้วเริ่มใช้{' '}
      <Link href={siteUrl} style={link}>{siteName}</Link> ได้เลย
    </EmailText>
    <EmailButton href={confirmationUrl}>ยืนยันอีเมลของฉัน</EmailButton>
  </EmailLayout>
)

export default SignupEmail
