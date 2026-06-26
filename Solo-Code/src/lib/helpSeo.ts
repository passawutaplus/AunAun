import { buildHelpCenterJsonLd, buildHelpGuideJsonLd, buildPublicPageHead } from "@/lib/seoHead";

const HELP_INDEX = {
  title: "ศูนย์ช่วยเหลือ",
  description:
    "คู่มือใช้งาน So1o ครบวงจร — เริ่มต้น ใบเสนอราคา รับชำระ Stripe Connect ภาษี Smart Brief ธีมเอกสาร แพ็ก Pro LINE Support Hub และ FAQ",
} as const;

export const HELP_GUIDE_SEO = {
  "/help/getting-started": {
    title: "เริ่มต้นใช้งาน So1o — 3 ขั้นแรก",
    description: "คู่มือเริ่มต้น So1o Freelancer — ตั้งค่าแบรนด์ เพิ่มลูกค้า และสร้างใบเสนอราคาแรก",
  },
  "/help/brief": {
    title: "คู่มือ Smart Brief & Job Tracker",
    description:
      "วิธีใช้ Smart Brief ส่งบรีฟให้ลูกค้า ติดตามงาน Job Tracker รับ feedback และชำระมัดจำ",
  },
  "/help/quotations": {
    title: "ใบเสนอราคา & เอกสาร — QT / INV / RC",
    description:
      "สร้างใบเสนอราคา ส่งอีเมลลูกค้า ยอมรับ QT ออกใบแจ้งหนี้และใบเสร็จ — So1o Freelancer",
  },
  "/help/payments": {
    title: "รับชำระจากลูกค้า — QR PromptPay & ชำระออนไลน์",
    description:
      "อธิบายความต่างระหว่าง QR PromptPay/โอนเงิน กับชำระออนไลน์ Stripe Connect บนหน้าติดตามงาน",
  },
  "/help/tax": {
    title: "คู่มือภาษีฟรีแลนซ์",
    description:
      "คู่มือภาษีสำหรับฟรีแลนซ์ไทย — บันทึกรายได้ ใบ 50ทวิ หักค่าใช้จ่าย ประมาณการ และส่งนักบัญชี",
  },
  "/help/branding": {
    title: "ธีมเอกสาร & Portal — White-label Pro",
    description: "ปรับสี PDF ใบเสนอราคา badge So1o และหน้า Track/Brief ลูกค้า — Settings ธีมเอกสาร",
  },
  "/help/plans": {
    title: "แพ็กเกจ & เครดิต AI — Free vs Pro",
    description:
      "เปรียบเทียบแพ็ก Free Pro Pro+ In-House Credit AI storage white-label และ ecosystem So1o + Aplus1",
  },
  "/help/line": {
    title: "แจ้งเตือน LINE",
    description:
      "เชื่อม LINE OA รับแจ้งเตือนงานใหม่ ชำระเงิน และครบกำหนด — ตั้งค่าใน Settings So1o",
  },
} as const;

export type HelpGuideSeoPath = keyof typeof HELP_GUIDE_SEO;

export function helpIndexHead() {
  return buildPublicPageHead({
    title: HELP_INDEX.title,
    description: HELP_INDEX.description,
    path: "/help",
    jsonLd: buildHelpCenterJsonLd(),
  });
}

export function helpGuideHead(path: HelpGuideSeoPath) {
  const seo = HELP_GUIDE_SEO[path];
  return buildPublicPageHead({
    title: seo.title,
    description: seo.description,
    path,
    jsonLd: buildHelpGuideJsonLd(path, seo.title, seo.description),
  });
}
