import { BRAND_NAME, BRAND_SUPPORT_EMAIL } from '@/lib/brandConfig'

export type HttpErrorKind = '404' | '405' | '500' | '503' | 'generic' | 'token'

export type HttpErrorCopy = {
  code: number
  titleTh: string
  titleEn: string
  descTh: string
  descEn: string
  taglineTh: string
  taglineEn: string
  hintTh?: string
  hintEn?: string
}

export const HTTP_ERROR_COPY: Record<HttpErrorKind, HttpErrorCopy> = {
  '404': {
    code: 404,
    titleTh: 'หาไม่เจอหน้านี้',
    titleEn: 'Page not found',
    descTh: 'ลิงก์อาจผิดหรือหน้าถูกย้าย — ลองกลับหน้าแรก',
    descEn: 'The link may be wrong or the page moved.',
    taglineTh: '',
    taglineEn: '',
    hintTh: `มั่นใจว่าหน้านี้ควรมีอยู่? แจ้ง ${BRAND_SUPPORT_EMAIL}`,
    hintEn: `Think this page should exist? Contact ${BRAND_SUPPORT_EMAIL}`,
  },
  '405': {
    code: 405,
    titleTh: 'วิธีการนี้ไม่รองรับ',
    titleEn: 'Method not allowed',
    descTh: 'ลองกลับไปหน้าก่อนหน้าแล้วทำรายการใหม่',
    descEn: 'Go back and try the action again.',
    taglineTh: '',
    taglineEn: '',
    hintTh: `ยังเจอปัญหา? ติดต่อ ${BRAND_SUPPORT_EMAIL}`,
    hintEn: `Still stuck? Contact ${BRAND_SUPPORT_EMAIL}`,
  },
  '500': {
    code: 500,
    titleTh: 'มีบางอย่างขัดข้อง',
    titleEn: 'Something went wrong',
    descTh: 'ลองรีเฟรชหรือกลับมาใหม่ — ยังไม่หาย แจ้งทีมงานได้',
    descEn: 'Try refreshing. Contact support if it persists.',
    taglineTh: '',
    taglineEn: '',
    hintTh: `ติดต่อ ${BRAND_SUPPORT_EMAIL}`,
    hintEn: `Contact ${BRAND_SUPPORT_EMAIL}`,
  },
  '503': {
    code: 503,
    titleTh: 'กำลังปรับปรุงระบบ',
    titleEn: 'Under maintenance',
    descTh: `อัปเดตเพื่อให้ ${BRAND_NAME} ลื่นขึ้น — กลับมาใหม่ในอีกสักครู่`,
    descEn: `We're updating ${BRAND_NAME}. Back shortly.`,
    taglineTh: '',
    taglineEn: '',
  },
  generic: {
    code: 0,
    titleTh: 'โหลดหน้าไม่สำเร็จ',
    titleEn: "Page didn't load",
    descTh: 'อาจเป็นเน็ตชั่วคราว — ลองกดลองใหม่',
    descEn: 'Could be a connection issue. Try again.',
    taglineTh: '',
    taglineEn: '',
    hintTh: `ยังไม่ได้? ติดต่อ ${BRAND_SUPPORT_EMAIL}`,
    hintEn: `Still stuck? Contact ${BRAND_SUPPORT_EMAIL}`,
  },
  token: {
    code: 404,
    titleTh: 'ลิงก์ใช้ไม่ได้แล้ว',
    titleEn: 'Invalid link',
    descTh: 'หมดอายุหรือพิมพ์ไม่ครบ — ขอลิงก์ใหม่จากผู้ส่ง',
    descEn: 'Expired or incomplete. Ask for a new link.',
    taglineTh: '',
    taglineEn: '',
    hintTh: `ยังมีปัญหา? แจ้ง ${BRAND_SUPPORT_EMAIL}`,
    hintEn: `Still having trouble? Contact ${BRAND_SUPPORT_EMAIL}`,
  },
}

export function resolveErrorKind(code?: number, kind?: HttpErrorKind): HttpErrorKind {
  if (kind) return kind
  if (code === 404) return '404'
  if (code === 405) return '405'
  if (code === 503) return '503'
  if (code && code >= 500) return '500'
  return 'generic'
}
