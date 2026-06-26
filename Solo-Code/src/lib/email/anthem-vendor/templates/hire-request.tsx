import * as React from 'react'
import { EMAIL_FOOTER_NOTIFICATION } from '../copyConstants'
import {
  EmailLayout, EmailCard, EmailCardLabel, EmailCardRow, EmailButton, EmailText, brand,
} from './layout'

export interface HireRequestEmailProps {
  recipientName?: string
  clientName?: string
  projectTitle?: string
  message?: string
  budgetAmount?: string
  deadline?: string
  actionUrl?: string
}

export const HireRequestEmail = ({
  recipientName = 'คุณ',
  clientName = 'ลูกค้า',
  projectTitle = 'งานจ้างใหม่',
  message = '',
  budgetAmount = '',
  deadline = '',
  actionUrl = 'https://1px-demo.vercel.app/chat',
}: HireRequestEmailProps) => (
  <EmailLayout
    preview={`${clientName} ส่งคำขอจ้าง — ${projectTitle}`}
    badge="คำขอจ้างใหม่"
    badgeTone="brand"
    icon="hire"
    title="มีคนสนใจจ้างงาน"
    footerNote={EMAIL_FOOTER_NOTIFICATION}
  >
    <EmailText>
      สวัสดี {recipientName} — <strong style={{ color: brand.ink }}>{clientName}</strong>{' '}
      ส่งคำขอจ้างผ่าน Pixel100 สำหรับ{' '}
      <strong style={{ color: brand.ink }}>{projectTitle}</strong>
    </EmailText>
    <EmailCard>
      <EmailCardLabel>ลูกค้า</EmailCardLabel>
      <EmailCardRow highlight>{clientName}</EmailCardRow>
      <EmailCardLabel>โปรเจกต์</EmailCardLabel>
      <EmailCardRow>{projectTitle}</EmailCardRow>
      {budgetAmount ? (
        <>
          <EmailCardLabel>งบประมาณ</EmailCardLabel>
          <EmailCardRow>{budgetAmount}</EmailCardRow>
        </>
      ) : null}
      {deadline ? (
        <>
          <EmailCardLabel>กำหนดส่ง</EmailCardLabel>
          <EmailCardRow>{deadline}</EmailCardRow>
        </>
      ) : null}
      {message ? (
        <>
          <EmailCardLabel>ข้อความ</EmailCardLabel>
          <EmailCardRow>{message}</EmailCardRow>
        </>
      ) : null}
    </EmailCard>
    <EmailButton href={actionUrl}>เปิดแชทและตอบกลับ</EmailButton>
  </EmailLayout>
)

export const hireRequestTemplate = {
  component: HireRequestEmail,
  subject: (data: Record<string, unknown>) =>
    `[Pixel100] คำขอจ้างใหม่ — ${(data.projectTitle as string) ?? 'งานจ้างใหม่'}`,
  displayName: 'Hire request',
  previewData: {
    recipientName: 'พี่บอส',
    clientName: 'บริษัท Sundae Cafe',
    projectTitle: 'Rebrand & Logo Design',
    message: 'สนใจสไตล์ minimal โทนอุ่น ขอดู portfolio เพิ่มได้ไหมครับ',
    budgetAmount: '฿25,000',
    deadline: '30 มิ.ย. 2026',
    actionUrl: 'https://1px-demo.vercel.app/chat/example',
  },
}

export default HireRequestEmail
