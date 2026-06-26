import * as React from 'react'
import { EMAIL_FOOTER_NOTIFICATION } from '../copyConstants'
import {
  EmailLayout, EmailCard, EmailCardLabel, EmailCardRow, EmailButton, EmailText, brand,
} from './layout'

export interface CashoutStatusEmailProps {
  recipientName?: string
  status?: 'submitted' | 'paid' | 'rejected'
  grossPx?: number
  netPx?: number
  actionUrl?: string
}

const STATUS_COPY = {
  submitted: {
    badge: 'ส่งคำขอถอนแล้ว',
    title: 'รับคำขอถอนเงินแล้ว',
    tone: 'brand' as const,
    body: 'เราได้รับคำขอถอนเงินของคุณแล้ว — ทีมงานจะตรวจสอบและดำเนินการต่อ',
  },
  paid: {
    badge: 'ถอนเงินสำเร็จ',
    title: 'โอนเงินเข้าบัญชีแล้ว',
    tone: 'success' as const,
    body: 'คำขอถอนเงินของคุณดำเนินการสำเร็จแล้ว',
  },
  rejected: {
    badge: 'คำขอถูกปฏิเสธ',
    title: 'ไม่สามารถถอนได้',
    tone: 'brand' as const,
    body: 'คำขอถอนถูกปฏิเสธ — ยอด px ถูกคืนเข้ากระเป๋า earned แล้ว',
  },
}

export const CashoutStatusEmail = ({
  recipientName = 'คุณ',
  status = 'submitted',
  grossPx = 0,
  netPx = 0,
  actionUrl = 'https://aplus1-demo.vercel.app/earnings',
}: CashoutStatusEmailProps) => {
  const copy = STATUS_COPY[status]
  return (
    <EmailLayout
      preview={copy.title}
      badge={copy.badge}
      badgeTone={copy.tone}
      icon="cashout"
      title={copy.title}
      footerNote={EMAIL_FOOTER_NOTIFICATION}
    >
      <EmailText>
        สวัสดี {recipientName} — {copy.body}
      </EmailText>
      <EmailCard>
        <EmailCardLabel>ยอดที่ขอถอน</EmailCardLabel>
        <EmailCardRow highlight>{grossPx.toLocaleString('th-TH')} px</EmailCardRow>
        {status === 'paid' && netPx > 0 ? (
          <>
            <EmailCardLabel>โอนสุทธิ</EmailCardLabel>
            <EmailCardRow>฿{netPx.toLocaleString('th-TH')}</EmailCardRow>
          </>
        ) : null}
      </EmailCard>
      <EmailButton href={actionUrl}>ดูรายได้</EmailButton>
    </EmailLayout>
  )
}

export const cashoutStatusTemplate = {
  component: CashoutStatusEmail,
  subject: (data: Record<string, unknown>) => {
    const s = (data.status as string) ?? 'submitted'
    if (s === 'paid') return `[Aplus1] ถอนเงินสำเร็จ ฿${Number(data.netPx ?? 0).toLocaleString('th-TH')}`
    if (s === 'rejected') return `[Aplus1] คำขอถอนถูกปฏิเสธ`
    return `[Aplus1] รับคำขอถอน ${Number(data.grossPx ?? 0).toLocaleString('th-TH')} px แล้ว`
  },
  displayName: 'Cashout status',
  previewData: {
    recipientName: 'พี่บอส',
    status: 'paid',
    grossPx: 1500,
    netPx: 1350,
    actionUrl: 'https://aplus1-demo.vercel.app/earnings',
  },
}

export default CashoutStatusEmail
