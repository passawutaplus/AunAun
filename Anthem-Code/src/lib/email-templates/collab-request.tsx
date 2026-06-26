import * as React from 'react'
import { EMAIL_FOOTER_NOTIFICATION } from '@/lib/copyConstants'
import {
  EmailLayout, EmailCard, EmailCardLabel, EmailCardRow, EmailButton, EmailText, brand,
} from './layout'

export interface CollabRequestEmailProps {
  recipientName?: string
  senderName?: string
  projectTitle?: string
  collabTypes?: string
  message?: string
  actionUrl?: string
}

export const CollabRequestEmail = ({
  recipientName = 'คุณ',
  senderName = 'ครีเอเตอร์',
  projectTitle = 'ผลงานในฟีด',
  collabTypes = '',
  message = '',
  actionUrl = 'https://aplus1-demo.vercel.app/portfolio/manage?focus=collab',
}: CollabRequestEmailProps) => (
  <EmailLayout
    preview={`${senderName} อยากร่วมงาน — ${projectTitle}`}
    badge="คำขอคอลแลป"
    badgeTone="brand"
    icon="collab"
    title="มีคนอยากร่วมงาน"
    footerNote={EMAIL_FOOTER_NOTIFICATION}
  >
    <EmailText>
      สวัสดี {recipientName} — <strong style={{ color: brand.ink }}>{senderName}</strong>{' '}
      ส่งคำขอร่วมงานผ่าน Aplus1
    </EmailText>
    <EmailCard>
      <EmailCardLabel>จาก</EmailCardLabel>
      <EmailCardRow highlight>{senderName}</EmailCardRow>
      {projectTitle ? (
        <>
          <EmailCardLabel>อ้างอิงผลงาน</EmailCardLabel>
          <EmailCardRow>{projectTitle}</EmailCardRow>
        </>
      ) : null}
      {collabTypes ? (
        <>
          <EmailCardLabel>ประเภท</EmailCardLabel>
          <EmailCardRow>{collabTypes}</EmailCardRow>
        </>
      ) : null}
      {message ? (
        <>
          <EmailCardLabel>ข้อความ</EmailCardLabel>
          <EmailCardRow>{message}</EmailCardRow>
        </>
      ) : null}
    </EmailCard>
    <EmailButton href={actionUrl}>ดูคำขอคอลแลป</EmailButton>
  </EmailLayout>
)

export const collabRequestTemplate = {
  component: CollabRequestEmail,
  subject: (data: Record<string, unknown>) =>
    `[Aplus1] คำขอคอลแลปจาก ${(data.senderName as string) ?? 'ครีเอเตอร์'}`,
  displayName: 'Collab request',
  previewData: {
    recipientName: 'พี่บอส',
    senderName: 'น้องมิ้นท์',
    projectTitle: 'Brand Identity — Cafe Series',
    collabTypes: 'ร่วมโปรเจกต์ใหม่ · แลกเปลี่ยนสกิล',
    message: 'อยากชวน co-create visual system ร่วมกันครับ มี mood board แชร์ได้',
    actionUrl: 'https://aplus1-demo.vercel.app/portfolio/manage?focus=collab',
  },
}

export default CollabRequestEmail
