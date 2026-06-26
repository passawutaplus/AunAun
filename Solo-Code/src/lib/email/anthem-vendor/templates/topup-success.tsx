import * as React from 'react'
import { EMAIL_FOOTER_NOTIFICATION } from '../copyConstants'
import { EmailLayout, EmailCard, EmailCardLabel, EmailCardRow, EmailButton, EmailText, brand } from './layout'

export interface TopupSuccessEmailProps {
  recipientName?: string
  amountPx?: number
  actionUrl?: string
}

export const TopupSuccessEmail = ({
  recipientName = 'คุณ',
  amountPx = 0,
  actionUrl = 'https://1px-demo.vercel.app/earnings',
}: TopupSuccessEmailProps) => (
  <EmailLayout
    preview={`เติม ${amountPx.toLocaleString('th-TH')} px สำเร็จ`}
    badge="เติม Pixel สำเร็จ"
    badgeTone="success"
    icon="topup"
    title="ยอด px เข้ากระเป๋าแล้ว"
    footerNote={EMAIL_FOOTER_NOTIFICATION}
  >
    <EmailText>
      สวัสดี {recipientName} — การเติม Pixel ของคุณบน Pixel100 สำเร็จแล้ว
    </EmailText>
    <EmailCard>
      <EmailCardLabel>จำนวนที่เติม</EmailCardLabel>
      <EmailCardRow highlight>{amountPx.toLocaleString('th-TH')} px</EmailCardRow>
      <EmailCardLabel>หมายเหตุ</EmailCardLabel>
      <EmailCardRow>ยอดที่เติมอาจมีช่วงพัก 24 ชม. ก่อนใช้ส่งของขวัญ (AML)</EmailCardRow>
    </EmailCard>
    <EmailButton href={actionUrl}>เปิดกระเป๋า Pixel</EmailButton>
  </EmailLayout>
)

export const topupSuccessTemplate = {
  component: TopupSuccessEmail,
  subject: (data: Record<string, unknown>) =>
    `[Pixel100] เติม Pixel สำเร็จ +${Number(data.amountPx ?? 0).toLocaleString('th-TH')} px`,
  displayName: 'Top-up success',
  previewData: {
    recipientName: 'พี่บอส',
    amountPx: 500,
    actionUrl: 'https://1px-demo.vercel.app/earnings',
  },
}

export default TopupSuccessEmail
