import * as React from 'react'
import { EMAIL_FOOTER_NOTIFICATION } from '../copyConstants'
import {
  EmailLayout, EmailCard, EmailCardLabel, EmailCardRow, EmailButton, EmailText, brand,
} from './layout'

export interface JobApplicationEmailProps {
  recipientName?: string
  applicantName?: string
  jobTitle?: string
  coverPreview?: string
  actionUrl?: string
}

export const JobApplicationEmail = ({
  recipientName = 'คุณ',
  applicantName = 'ผู้สมัคร',
  jobTitle = 'งานใหม่',
  coverPreview = '',
  actionUrl = 'https://1px-demo.vercel.app/jobs',
}: JobApplicationEmailProps) => (
  <EmailLayout
    preview={`${applicantName} สมัคร ${jobTitle}`}
    badge="ใบสมัครใหม่"
    badgeTone="brand"
    icon="application"
    title="มีผู้สมัครงาน"
    footerNote={EMAIL_FOOTER_NOTIFICATION}
  >
    <EmailText>
      สวัสดี {recipientName} — <strong style={{ color: brand.ink }}>{applicantName}</strong>{' '}
      สมัครงาน <strong style={{ color: brand.ink }}>{jobTitle}</strong>
    </EmailText>
    <EmailCard>
      <EmailCardLabel>ผู้สมัคร</EmailCardLabel>
      <EmailCardRow highlight>{applicantName}</EmailCardRow>
      <EmailCardLabel>ตำแหน่ง</EmailCardLabel>
      <EmailCardRow>{jobTitle}</EmailCardRow>
      {coverPreview ? (
        <>
          <EmailCardLabel>จดหมายสั้นๆ</EmailCardLabel>
          <EmailCardRow>{coverPreview}</EmailCardRow>
        </>
      ) : null}
    </EmailCard>
    <EmailButton href={actionUrl}>ดูใบสมัคร</EmailButton>
  </EmailLayout>
)

export const jobApplicationTemplate = {
  component: JobApplicationEmail,
  subject: (data: Record<string, unknown>) =>
    `[Pixel100] ผู้สมัครใหม่ — ${(data.jobTitle as string) ?? 'งาน'}`,
  displayName: 'Job application',
  previewData: {
    recipientName: 'พี่บอส',
    applicantName: 'น้องมิ้นท์',
    jobTitle: 'UI Designer — SaaS Dashboard',
    coverPreview: 'สนใจงานนี้มากครับ มี portfolio ด้าน dashboard หลายชิ้น',
    actionUrl: 'https://1px-demo.vercel.app/jobs/example',
  },
}

export default JobApplicationEmail
