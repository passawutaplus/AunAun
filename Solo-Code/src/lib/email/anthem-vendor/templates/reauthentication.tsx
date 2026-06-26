import * as React from 'react'
import { Text } from '@react-email/components'
import { EmailLayout, EmailText } from './layout'
import { code } from './_brand'

interface ReauthenticationEmailProps { token: string }

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <EmailLayout
    preview="รหัสยืนยันตัวตนของคุณ"
    badge="ยืนยันตัวตน"
    icon="mail"
    title="ยืนยันตัวตนอีกครั้ง"
    footerNote="รหัสนี้จะหมดอายุภายในไม่กี่นาที ห้ามแชร์ให้คนอื่นเด็ดขาด"
  >
    <EmailText>กรอกรหัสด้านล่างเพื่อยืนยันว่าเป็นคุณ:</EmailText>
    <Text style={code}>{token}</Text>
  </EmailLayout>
)

export default ReauthenticationEmail
