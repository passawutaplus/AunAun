import * as React from 'react'
import { EMAIL_FOOTER_NOTIFICATION } from '@/lib/copyConstants'
import {
  EmailLayout, EmailCard, EmailCardLabel, EmailCardRow, EmailButton, EmailText, brand,
} from './layout'

export interface JobMatchEmailProps {
  recipientName?: string
  jobTitle?: string
  roleCategory?: string
  matchScore?: number
  matchReasons?: string[]
  actionUrl?: string
}

export const JobMatchEmail = ({
  recipientName = 'คุณ',
  jobTitle = 'งานใหม่',
  roleCategory = '',
  matchScore = 0,
  matchReasons = [],
  actionUrl = 'https://1px-demo.vercel.app/jobs',
}: JobMatchEmailProps) => (
  <EmailLayout
    preview={`พบงานตรงสกิล — ${jobTitle}`}
    badge="งานแนะนำ"
    badgeTone="success"
    icon="job"
    title="มีงานตรงกับคุณ"
    footerNote={EMAIL_FOOTER_NOTIFICATION}
  >
    <EmailText>
      สวัสดี {recipientName} — พบงานที่ตรงกับโปรไฟล์ของคุณบน Pixel100
    </EmailText>
    <EmailCard>
      <EmailCardLabel>ตำแหน่ง</EmailCardLabel>
      <EmailCardRow highlight>{jobTitle}</EmailCardRow>
      {roleCategory ? (
        <>
          <EmailCardLabel>หมวด</EmailCardLabel>
          <EmailCardRow>{roleCategory}</EmailCardRow>
        </>
      ) : null}
      {matchScore > 0 ? (
        <>
          <EmailCardLabel>ความตรง</EmailCardLabel>
          <EmailCardRow>{matchScore}%</EmailCardRow>
        </>
      ) : null}
      {matchReasons.length > 0 ? (
        <>
          <EmailCardLabel>เหตุผล</EmailCardLabel>
          <EmailCardRow>{matchReasons.join(' · ')}</EmailCardRow>
        </>
      ) : null}
    </EmailCard>
    <EmailButton href={actionUrl}>ดูรายละเอียดงาน</EmailButton>
  </EmailLayout>
)

export const jobMatchTemplate = {
  component: JobMatchEmail,
  subject: (data: Record<string, unknown>) =>
    `[Pixel100] งานแนะนำ — ${(data.jobTitle as string) ?? 'งานใหม่'}`,
  displayName: 'Job match',
  previewData: {
    recipientName: 'พี่บอส',
    jobTitle: 'UI Designer — SaaS Dashboard',
    roleCategory: 'UI/UX Design',
    matchScore: 80,
    matchReasons: ['หมวด UI/UX Design', 'สกิลตรง 3 อย่าง', 'Remote'],
    actionUrl: 'https://1px-demo.vercel.app/jobs/example',
  },
}

export default JobMatchEmail
