import { BRAND_NAME, BRAND_SUPPORT_EMAIL } from '@/lib/brandConfig'

export type HttpErrorKind = '400' | '403' | '404' | '405' | '500' | '502' | '503' | 'generic' | 'token'

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
  '400': {
    code: 400,
    titleTh: 'อ่านคำขอนี้ไม่ได้',
    titleEn: 'Could not read this.',
    descTh: 'คำขอมาในรูปแบบที่อ่านไม่ได้',
    descEn: 'The request did not arrive in a form we can use.',
    taglineTh: '',
    taglineEn: '',
  },
  '403': {
    code: 403,
    titleTh: 'หน้านี้ไม่เปิด',
    titleEn: 'Not open.',
    descTh: 'หน้านี้ไม่เปิดให้เข้า',
    descEn: 'This page is closed.',
    taglineTh: '',
    taglineEn: '',
  },
  '404': {
    code: 404,
    titleTh: 'ไม่พบหน้านี้',
    titleEn: 'Page not found.',
    descTh: 'หน้านี้ย้ายไปแล้ว หรือไม่เคยมี',
    descEn: 'It may have moved, or it was never here.',
    taglineTh: '',
    taglineEn: '',
    hintTh: `มั่นใจว่าหน้านี้ควรมีอยู่? แจ้ง ${BRAND_SUPPORT_EMAIL}`,
    hintEn: `Think this page should exist? Contact ${BRAND_SUPPORT_EMAIL}`,
  },
  '405': {
    code: 405,
    titleTh: 'วิธีนี้ใช้ไม่ได้',
    titleEn: 'Not that way.',
    descTh: 'วิธีนี้ใช้กับหน้านี้ไม่ได้',
    descEn: 'This action is not available here.',
    taglineTh: '',
    taglineEn: '',
  },
  '500': {
    code: 500,
    titleTh: 'ทำให้ไม่สำเร็จ',
    titleEn: 'Could not finish.',
    descTh: 'ทำหน้านี้ไม่สำเร็จ ลองใหม่ในอีกสักครู่',
    descEn: 'This page could not be completed. Try again in a moment.',
    taglineTh: '',
    taglineEn: '',
    hintTh: `ติดต่อ ${BRAND_SUPPORT_EMAIL}`,
    hintEn: `Contact ${BRAND_SUPPORT_EMAIL}`,
  },
  '502': {
    code: 502,
    titleTh: 'ไม่มีคำตอบกลับ',
    titleEn: 'No reply.',
    descTh: 'บริการที่หน้านี้ใช้ไม่ตอบกลับ',
    descEn: 'A service this page needs did not answer.',
    taglineTh: '',
    taglineEn: '',
  },
  '503': {
    code: 503,
    titleTh: 'ปิดชั่วครู่',
    titleEn: 'Briefly closed.',
    descTh: `${BRAND_NAME} ไม่พร้อมชั่วครู่`,
    descEn: `${BRAND_NAME} is unavailable for a moment.`,
    taglineTh: '',
    taglineEn: '',
  },
  generic: {
    code: 0,
    titleTh: 'โหลดไม่ได้',
    titleEn: 'Could not load.',
    descTh: 'อาจเป็นเน็ตชั่วคราว ลองใหม่',
    descEn: 'This may be a connection issue. Try again.',
    taglineTh: '',
    taglineEn: '',
  },
  token: {
    code: 404,
    titleTh: 'ลิงก์หมดอายุ',
    titleEn: 'Link expired.',
    descTh: 'หมดอายุ หรือพิมพ์ไม่ครบ',
    descEn: 'It has expired, or it was not complete.',
    taglineTh: '',
    taglineEn: '',
    hintTh: `ยังมีปัญหา? แจ้ง ${BRAND_SUPPORT_EMAIL}`,
    hintEn: `Still having trouble? Contact ${BRAND_SUPPORT_EMAIL}`,
  },
}

export function resolveErrorKind(code?: number, kind?: HttpErrorKind): HttpErrorKind {
  if (kind) return kind
  if (code === 400) return '400'
  if (code === 403) return '403'
  if (code === 404) return '404'
  if (code === 405) return '405'
  if (code === 502) return '502'
  if (code === 503) return '503'
  if (code && code >= 500) return '500'
  return 'generic'
}
