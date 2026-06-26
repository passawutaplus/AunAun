import * as React from 'react'
import { EMAIL_FOOTER_NOTIFICATION } from '../copyConstants'
import {
  EmailLayout, EmailCard, EmailCardLabel, EmailCardRow, EmailButton, EmailText, brand,
} from './layout'

export interface GiftReceivedEmailProps {
  recipientName?: string
  senderName?: string
  giftName?: string
  pricePx?: number
  message?: string
  projectTitle?: string
  actionUrl?: string
}

export const GiftReceivedEmail = ({
  recipientName = 'คุณ',
  senderName = 'ผู้สนับสนุน',
  giftName = 'ของขวัญ',
  pricePx = 0,
  message = '',
  projectTitle = '',
  actionUrl = 'https://aplus1-demo.vercel.app/earnings',
}: GiftReceivedEmailProps) => (
  <EmailLayout
    preview={`${senderName} ส่ง ${giftName} (${pricePx} px)`}
    badge="ของขวัญใหม่"
    badgeTone="success"
    icon="gift"
    title="ได้รับของขวัญ PX"
    footerNote={EMAIL_FOOTER_NOTIFICATION}
  >
    <EmailText>
      สวัสดี {recipientName} — <strong style={{ color: brand.ink }}>{senderName}</strong>{' '}
      ส่ง <strong style={{ color: brand.orange }}>{giftName}</strong> สนับสนุนคุณบน Aplus1
    </EmailText>
    <EmailCard>
      <EmailCardLabel>จาก</EmailCardLabel>
      <EmailCardRow highlight>{senderName}</EmailCardRow>
      <EmailCardLabel>ของขวัญ</EmailCardLabel>
      <EmailCardRow>{giftName}</EmailCardRow>
      <EmailCardLabel>มูลค่า</EmailCardLabel>
      <EmailCardRow highlight>{pricePx.toLocaleString('th-TH')} px</EmailCardRow>
      {projectTitle ? (
        <>
          <EmailCardLabel>ที่ผลงาน</EmailCardLabel>
          <EmailCardRow>{projectTitle}</EmailCardRow>
        </>
      ) : null}
      {message ? (
        <>
          <EmailCardLabel>ข้อความ</EmailCardLabel>
          <EmailCardRow>{message}</EmailCardRow>
        </>
      ) : null}
    </EmailCard>
    <EmailButton href={actionUrl}>ดูรายได้และของขวัญ</EmailButton>
  </EmailLayout>
)

export const giftReceivedTemplate = {
  component: GiftReceivedEmail,
  subject: (data: Record<string, unknown>) =>
    `[Aplus1] ${(data.senderName as string) ?? 'มีคน'} ส่งของขวัญ ${(data.giftName as string) ?? ''}`,
  displayName: 'Gift received',
  previewData: {
    recipientName: 'พี่บอส',
    senderName: 'น้องมิ้นท์',
    giftName: 'ดาวสนับสนุน',
    pricePx: 50,
    message: 'ชอบผลงานมากครับ สู้ๆ!',
    projectTitle: 'Rebrand Sundae Cafe',
    actionUrl: 'https://aplus1-demo.vercel.app/earnings',
  },
}

export default GiftReceivedEmail
