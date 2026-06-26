import type { LucideIcon } from "lucide-react";
import {
  Bell,
  Coins,
  CreditCard,
  FileText,
  HelpCircle,
  LayoutDashboard,
  MessageCircle,
  Palette,
  Rocket,
  Settings,
  Sparkles,
  Users,
  Wallet,
} from "lucide-react";

export type HelpRoute =
  | "/help/getting-started"
  | "/help/brief"
  | "/help/quotations"
  | "/help/payments"
  | "/help/tax"
  | "/help/branding"
  | "/help/plans"
  | "/help/line"
  | "/pricing"
  | "/terms"
  | "/privacy"
  | "/cookies"
  | "/refund";

export interface HelpLink {
  to: HelpRoute;
  hash?: string;
  label: string;
  description?: string;
}

export interface HelpGuideCard {
  to: HelpRoute;
  hash?: string;
  icon: LucideIcon;
  title: string;
  description: string;
  tag: string;
  minutes?: number;
}

export interface HelpCategory {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  topics: HelpLink[];
}

export interface HelpJourney {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  steps: HelpLink[];
}

export interface HelpFaqItem {
  id: string;
  category: "general" | "account" | "client" | "money" | "tax" | "brand";
  question: string;
  answer: string;
  link?: HelpLink;
}

export interface HelpSettingsRow {
  task: string;
  settingsPath: string;
  link: HelpLink;
}

export interface HelpGlossaryTerm {
  term: string;
  definition: string;
  link?: HelpLink;
}

export const HELP_CONTACT = {
  email: "hello@solofreelancer.com",
  lineUrl: "https://lin.ee/q3W9Qds",
  lineHandle: "@solofreelancer",
  supportResponse: "ปกติตอบภายใน 15 นาที (Support Hub ใน Dashboard)",
} as const;

/** เส้นทางแนะนำ — ทำตามลำดับได้เลย */
export const HELP_JOURNEYS: HelpJourney[] = [
  {
    id: "onboard",
    title: "สมัครใหม่ — เริ่มใช้งาน",
    description: "ตั้งร้าน → ลูกค้า → ใบเสนอราคาแรก",
    icon: Rocket,
    steps: [
      { to: "/help/getting-started", label: "ตั้งโปรไฟล์ร้าน & การเงิน" },
      { to: "/help/getting-started", label: "เพิ่มลูกค้าใน CRM" },
      { to: "/help/quotations", label: "สร้าง QT และส่งลิงก์ Track" },
    ],
  },
  {
    id: "client-flow",
    title: "Flow ลูกค้า — บรีฟถึงเก็บเงิน",
    description: "บรีฟ → ใบเสนอราคา → ติดตาม → ชำระ",
    icon: Users,
    steps: [
      { to: "/help/brief", label: "ส่ง Smart Brief" },
      { to: "/help/quotations", label: "ออกใบเสนอราคา QT" },
      { to: "/help/brief", label: "Job Tracker & feedback" },
      { to: "/help/payments", label: "รับมัดจำ / งวดสุดท้าย" },
    ],
  },
  {
    id: "money",
    title: "รับเงิน & ภาษี",
    description: "ตั้งช่องทางชำระ → บันทึกรายได้ → 50ทวิ",
    icon: Wallet,
    steps: [
      { to: "/help/payments", hash: "qr", label: "ตั้ง QR / โอน" },
      { to: "/help/payments", hash: "online", label: "เปิด Stripe Connect (ถ้าต้องการ)" },
      { to: "/help/tax", label: "บันทึกรายได้ & ภาษี" },
    ],
  },
  {
    id: "pro",
    title: "อัพเกรด Pro",
    description: "white-label · AI · LINE · Aplus1",
    icon: Sparkles,
    steps: [
      { to: "/help/plans", label: "เปรียบเทียบแพ็ก" },
      { to: "/help/branding", label: "ตั้งธีมเอกสาร & Portal" },
      { to: "/help/line", label: "เชื่อม LINE แจ้งเตือน" },
      { to: "/help/plans", hash: "ecosystem", label: "โชว์เคส Aplus1" },
    ],
  },
];

export const HELP_QUICK_TOPICS: HelpLink[] = [
  {
    to: "/help/getting-started",
    label: "เริ่มต้นใช้งานครั้งแรก",
    description: "ตั้งโปรไฟล์ร้าน ลูกค้า ใบเสนอราคาแรก",
  },
  {
    to: "/help/quotations",
    label: "สร้างและส่งใบเสนอราคา",
    description: "QT / INV / RC และส่งอีเมลลูกค้า",
  },
  { to: "/help/brief", label: "ส่งบรีฟและติดตามงาน", description: "Smart Brief + Job Tracker" },
  {
    to: "/help/payments",
    hash: "qr",
    label: "ตั้ง QR PromptPay / โอนเงิน",
    description: "Settings → การเงิน",
  },
  {
    to: "/help/payments",
    hash: "online",
    label: "รับชำระออนไลน์ (บัตร)",
    description: "Stripe Connect บนหน้า Track",
  },
  { to: "/help/tax", label: "บันทึกรายได้และภาษี", description: "50ทวิ ประมาณการ ส่งนักบัญชี" },
  {
    to: "/help/branding",
    label: "ปรับสีเอกสาร & Portal",
    description: "White-label Pro ธีมลูกค้า",
  },
  { to: "/help/plans", label: "แพ็กเกจ Pro และ Credit AI", description: "Free vs Pro Credit AI" },
  { to: "/help/line", label: "แจ้งเตือน LINE", description: "เชื่อม LINE OA รับแจ้งเตือนงาน" },
  {
    to: "/help/plans",
    hash: "ecosystem",
    label: "So1o + Aplus1 คืออะไร",
    description: "บัญชีเดียว สมัครครั้งเดียว",
  },
];

export const HELP_CATEGORIES: HelpCategory[] = [
  {
    id: "start",
    title: "เริ่มต้น",
    description: "My Desk, ecosystem และแพ็กเกจ",
    icon: LayoutDashboard,
    topics: [
      {
        to: "/help/getting-started",
        label: "3 ขั้นแรกหลังสมัคร",
        description: "โปรไฟล์ · ลูกค้า · Pipeline",
      },
      {
        to: "/help/plans",
        hash: "ecosystem",
        label: "So1o กับ Aplus1",
        description: "หลังบ้าน + โชว์เคส",
      },
      {
        to: "/help/plans",
        label: "แพ็กเกจ Free / Pro / Pro+ / In-House",
        description: "ราคา Credit AI storage",
      },
      { to: "/pricing", label: "ตารางเปรียบเทียบแพ็ก", description: "ดูราคาเต็มทุกฟีเจอร์" },
    ],
  },
  {
    id: "client",
    title: "ลูกค้า & งาน",
    description: "บรีฟ ติดตาม Portal และสื่อสาร",
    icon: Users,
    topics: [
      {
        to: "/help/brief",
        label: "Smart Brief",
        description: "ลิงก์ `/brief/:token` ให้ลูกค้ากรอกบรีฟ",
      },
      {
        to: "/help/brief",
        label: "Job Tracker & Portal",
        description: "ลิงก์ `/track/:token` ติดตามงาน",
      },
      {
        to: "/help/quotations",
        label: "ใบเสนอราคา & ส่งอีเมล",
        description: "ลูกค้ายอมรับ QT จากลิงก์",
      },
      { to: "/help/line", label: "แจ้งเตือน LINE", description: "งานใหม่ ชำระเงิน ครบกำหนด" },
    ],
  },
  {
    id: "money",
    title: "การเงิน & ภาษี",
    description: "รับชำระ บันทึกรายได้ เอกสารภาษี",
    icon: Wallet,
    topics: [
      {
        to: "/help/payments",
        hash: "qr",
        label: "QR / โอน + อัปสลิป",
        description: "Settings → การเงิน",
      },
      {
        to: "/help/payments",
        hash: "online",
        label: "ชำระออนไลน์ Stripe",
        description: "มัดจำ/งวดสุดท้ายอัตโนมัติ",
      },
      {
        to: "/help/quotations",
        hash: "invoice",
        label: "INV / RC",
        description: "ใบแจ้งหนี้ & ใบเสร็จ",
      },
      { to: "/help/tax", label: "ภาษีฟรีแลนซ์", description: "รายได้ · 50ทวิ · ส่งนักบัญชี" },
    ],
  },
  {
    id: "brand",
    title: "เอกสาร & แบรนด์",
    description: "PDF QT/INV/RC และหน้า Portal",
    icon: Palette,
    topics: [
      {
        to: "/help/branding",
        label: "ธีมเอกสาร & Portal",
        description: "สี badge white-label (Pro)",
      },
      { to: "/help/quotations", label: "โครงสร้างใบเสนอราคา", description: "รายการ มัดจำ VAT/WHT" },
      {
        to: "/help/getting-started",
        label: "โลโก้ & ข้อมูลร้าน",
        description: "Settings → โปรไฟล์ร้าน",
      },
    ],
  },
  {
    id: "settings",
    title: "ตั้งค่า & AI",
    description: "Settings ใน My Desk",
    icon: Settings,
    topics: [
      { to: "/help/payments", label: "หมวด «การเงิน»", description: "QR, โอน, Stripe Connect" },
      {
        to: "/help/branding",
        label: "ธีมเอกสาร & Portal",
        description: "section หุบได้ใน Settings",
      },
      {
        to: "/help/plans",
        hash: "ai",
        label: "Credit AI & Storage",
        description: "ยอดคงเหลือรอบบิล",
      },
      { to: "/help/line", label: "LINE OAuth", description: "แจ้งเตือนส่วนตัว (ไม่ใช่ลูกค้า)" },
    ],
  },
];

export const HELP_GUIDES: HelpGuideCard[] = [
  {
    to: "/help/getting-started",
    icon: Rocket,
    title: "เริ่มต้นใช้งาน",
    description: "3 ขั้นแรก — ตั้งแบรนด์ เพิ่มลูกค้า สร้างใบเสนอราคา",
    tag: "แนะนำ",
    minutes: 5,
  },
  {
    to: "/help/quotations",
    icon: FileText,
    title: "ใบเสนอราคา & เอกสาร",
    description: "QT/INV/RC ส่งอีเมล ลูกค้ายอมรับ ออกใบแจ้งหนี้",
    tag: "เอกสาร",
    minutes: 8,
  },
  {
    to: "/help/brief",
    icon: MessageCircle,
    title: "Smart Brief & Job Tracker",
    description: "ส่งบรีฟ ติดตามงาน feedback ชำระมัดจำ",
    tag: "ลูกค้า",
    minutes: 10,
  },
  {
    to: "/help/payments",
    icon: CreditCard,
    title: "รับชำระจากลูกค้า",
    description: "QR PromptPay / โอน vs Stripe บนหน้า Track",
    tag: "การเงิน",
    minutes: 7,
  },
  {
    to: "/help/tax",
    icon: Coins,
    title: "คู่มือภาษีฟรีแลนซ์",
    description: "บันทึกรายได้ 50ทวิ ประมาณการ ส่งนักบัญชี",
    tag: "ภาษี",
    minutes: 12,
  },
  {
    to: "/help/branding",
    icon: Palette,
    title: "ธีมเอกสาร & Portal",
    description: "ปรับสี PDF white-label และ Track/Brief",
    tag: "แบรนด์",
    minutes: 6,
  },
  {
    to: "/help/plans",
    icon: Sparkles,
    title: "แพ็กเกจ & Credit AI",
    description: "Free vs Pro โควต้า storage ecosystem",
    tag: "แพ็กเกจ",
    minutes: 5,
  },
  {
    to: "/help/line",
    icon: Bell,
    title: "แจ้งเตือน LINE",
    description: "เชื่อม LINE OA รับแจ้งเหตุการณ์สำคัญ",
    tag: "การแจ้งเตือน",
    minutes: 4,
  },
];

export const HELP_FAQ: HelpFaqItem[] = [
  {
    id: "free",
    category: "account",
    question: "ใช้ So1o ฟรีได้ไหม? จำกัดอะไรบ้าง?",
    answer:
      "ได้ — แผน Free มี Pipeline CRM ใบเสนอราคา Job Tracker 3 งาน/เดือน QR/โอน และ Credit AI 5/วัน × 14 วัน ไม่ต้องผูกบัตร",
    link: { to: "/help/plans", label: "แพ็กเกจ & โควต้า" },
  },
  {
    id: "pro-worth",
    category: "account",
    question: "Pro คุ้มเมื่อไหร่?",
    answer:
      "เมื่อต้องการ Job ไม่จำกัด white-label เอกสาร/Portal Credit AI มากขึ้น LINE แจ้งเตือน และปลดล็อก Aplus1 โชว์เคส",
    link: { to: "/pricing", label: "ตารางเปรียบเทียบ" },
  },
  {
    id: "ecosystem",
    category: "account",
    question: "So1o กับ Aplus1 ต้องสมัครแยกไหม?",
    answer: "ไม่ — บัญชีเดียว สมัครครั้งเดียว แพ็ก Pro ขึ้นไปปลดล็อกทั้งหลังบ้านและโชว์เคส",
    link: { to: "/help/plans", hash: "ecosystem", label: "Ecosystem" },
  },
  {
    id: "track-brief",
    category: "client",
    question: "Track กับ Brief ต่างกันยังไง?",
    answer:
      "Brief = ลูกค้ากรอกบรีฟงาน (/brief/:token) · Track = ติดตามงาน ดู QT ชำระเงิน feedback (/track/:token)",
    link: { to: "/help/brief", label: "คู่มือ Smart Brief & Tracker" },
  },
  {
    id: "accept-qt",
    category: "client",
    question: "ลูกค้ายอมรับใบเสนอราคายังไง?",
    answer: "ส่งลิงก์ Track พร้อมใบเสนอราคา — ลูกค้ากดยอมรับบนหน้าเดียว ไม่ต้องพิมพ์ตอบอีเมล",
    link: { to: "/help/quotations", label: "ใบเสนอราคา" },
  },
  {
    id: "both-pay",
    category: "money",
    question: "ใช้ QR และชำระบัตรพร้อมกันได้ไหม?",
    answer:
      "ได้ — ลูกค้าเห็นทั้งสองช่องทางบนหน้า Track ปิด Stripe ชั่วคราวได้ใน Settings โดย QR ยังใช้ได้",
    link: { to: "/help/payments", label: "รับชำระจากลูกค้า" },
  },
  {
    id: "money-go",
    category: "money",
    question: "เงินเข้าบัญชีไหน?",
    answer: "QR/โอน → บัญชีธนาคารที่ตั้งใน Settings · ชำระบัตร → Stripe Connect ของคุณ",
    link: { to: "/help/payments", hash: "qr", label: "ตั้งการเงิน" },
  },
  {
    id: "slip",
    category: "money",
    question: "ลูกค้าอัปสลิปแล้วทำไง?",
    answer: "คุณตรวจและอนุมัติใน Job Tracker — ระบบไม่ยืนยันอัตโนมัติสำหรับ QR/โอน",
    link: { to: "/help/payments", hash: "qr", label: "QR & สลิป" },
  },
  {
    id: "inv-rc",
    category: "money",
    question: "INV กับ RC ต่างกันอย่างไร?",
    answer: "INV = ใบแจ้งหนี้หลังยอมรับ QT · RC = ใบเสร็จหลังบันทึกว่ารับชำระแล้ว",
    link: { to: "/help/quotations", hash: "invoice", label: "INV / RC" },
  },
  {
    id: "tax-ai",
    category: "tax",
    question: "AI สแกน 50ทวิ ใช้แทนยื่นภาษีได้ไหม?",
    answer: "ไม่ — ช่วยกรอกข้อมูลเท่านั้น คุณต้องตรวจสอบความถูกต้องก่อนยื่นหรือส่งนักบัญชี",
    link: { to: "/help/tax", label: "คู่มือภาษี" },
  },
  {
    id: "brand-free",
    category: "brand",
    question: "Free ปรับสีเอกสารได้ไหม?",
    answer: "Free ใช้ธีม So1o มาตรฐาน มี badge — แพ็ก Pro ขึ้นไป white-label ปิด badge ได้",
    link: { to: "/help/branding", label: "ธีมเอกสาร" },
  },
  {
    id: "line-who",
    category: "general",
    question: "LINE แจ้งใคร?",
    answer: "แจ้งคุณ (ฟรีแลนซ์) เมื่อมีเหตุการณ์ใน My Desk ไม่ใช่ช่องทางส่งเอกสารให้ลูกค้า",
    link: { to: "/help/line", label: "แจ้งเตือน LINE" },
  },
  {
    id: "support",
    category: "general",
    question: "แจ้งบั๊กหรือขอความช่วยเหลือที่ไหน?",
    answer:
      "เปิด Support Hub มุมขวาล่างใน Dashboard — แจ้งปัญหา (ได้เลข TKT) แชททีม หรือดู FAQ ในแอป",
  },
];

export const HELP_SETTINGS_MAP: HelpSettingsRow[] = [
  {
    task: "ใส่ QR PromptPay / บัญชีโอน",
    settingsPath: "Settings → การเงิน",
    link: { to: "/help/payments", hash: "qr", label: "QR" },
  },
  {
    task: "เปิดรับชำระบัตร (Stripe Connect)",
    settingsPath: "Settings → การเงิน",
    link: { to: "/help/payments", hash: "online", label: "Stripe" },
  },
  {
    task: "ปรับสี PDF & Portal",
    settingsPath: "Settings → ธีมเอกสาร & Portal",
    link: { to: "/help/branding", label: "ธีม" },
  },
  {
    task: "โลโก้ / ชื่อร้าน / ที่อยู่",
    settingsPath: "Settings → โปรไฟล์ร้าน",
    link: { to: "/help/getting-started", label: "เริ่มต้น" },
  },
  {
    task: "เชื่อม LINE แจ้งเตือน",
    settingsPath: "Settings → LINE",
    link: { to: "/help/line", label: "LINE" },
  },
  {
    task: "ดูแพ็ก / อัพเกรด Pro",
    settingsPath: "Settings → แพ็กเกจ",
    link: { to: "/help/plans", label: "แพ็ก" },
  },
  {
    task: "Credit AI & Storage",
    settingsPath: "Settings → AI & Storage",
    link: { to: "/help/plans", hash: "ai", label: "AI" },
  },
];

export const HELP_GLOSSARY: HelpGlossaryTerm[] = [
  {
    term: "QT",
    definition: "ใบเสนอราคา (Quotation) — ส่งให้ลูกค้าก่อนเริ่มงาน",
    link: { to: "/help/quotations", label: "เอกสาร" },
  },
  {
    term: "INV",
    definition: "ใบแจ้งหนี้ — ออกหลังลูกค้ายอมรับ QT หรือถึงรอบเก็บเงิน",
    link: { to: "/help/quotations", hash: "invoice", label: "INV/RC" },
  },
  {
    term: "RC",
    definition: "ใบเสร็จรับเงิน — หลังบันทึกว่ารับชำระครบแล้ว",
    link: { to: "/help/quotations", hash: "invoice", label: "INV/RC" },
  },
  {
    term: "Track",
    definition: "หน้าติดตามงานลูกค้า `/track/:token` — QT ชำระเงิน feedback",
    link: { to: "/help/brief", label: "Job Tracker" },
  },
  {
    term: "Brief",
    definition: "หน้ารับบรีฟ `/brief/:token` — ลูกค้ากรอกรายละเอียดงาน",
    link: { to: "/help/brief", label: "Smart Brief" },
  },
  {
    term: "Portal",
    definition: "หน้าลูกค้า Track/Brief ที่ใช้สีแบรนด์ของคุณ (Pro)",
    link: { to: "/help/branding", label: "ธีม Portal" },
  },
  {
    term: "Connect",
    definition: "Stripe Connect — รับชำระบัตรเข้าบัญชีของคุณ",
    link: { to: "/help/payments", hash: "online", label: "Stripe" },
  },
  {
    term: "50ทวิ",
    definition: "ใบหัก ณ ที่จ่าย — บันทึกใน My Desk / สแกนด้วย AI",
    link: { to: "/help/tax", label: "ภาษี" },
  },
  {
    term: "Aplus1",
    definition: "โชว์เคสผลงาน — ecosystem คู่กับ So1o บัญชีเดียว",
    link: { to: "/help/plans", hash: "ecosystem", label: "Ecosystem" },
  },
];

export const HELP_POLICY_LINKS: HelpLink[] = [
  { to: "/terms", label: "ข้อกำหนดการใช้งาน" },
  { to: "/privacy", label: "นโยบายความเป็นส่วนตัว (PDPA)" },
  { to: "/cookies", label: "นโยบายคุกกี้" },
  { to: "/refund", label: "นโยบายคืนเงิน" },
  { to: "/pricing", label: "ราคา & แพ็กเกจ" },
];

export const HELP_DASHBOARD_LINKS: HelpLink[] = [
  { to: "/help/getting-started", label: "ยังไม่เคยใช้?", description: "เริ่มจากคู่มือ 3 ขั้น" },
  { to: "/help/payments", label: "รับเงินจากลูกค้า", description: "QR หรือ Stripe" },
  { to: "/help/tax", label: "ทำภาษี", description: "บันทึกรายได้" },
];

export const HELP_RELATED: Partial<Record<HelpRoute, HelpLink[]>> = {
  "/help/getting-started": [
    { to: "/help/quotations", label: "ใบเสนอราคา" },
    { to: "/help/payments", label: "รับชำระเงิน" },
    { to: "/help/brief", label: "Job Tracker" },
  ],
  "/help/quotations": [
    { to: "/help/brief", label: "ส่งลิงก์ติดตาม" },
    { to: "/help/payments", label: "รับชำระ" },
    { to: "/help/branding", label: "ธีมเอกสาร" },
  ],
  "/help/brief": [
    { to: "/help/payments", label: "มัดจำ & สลิป" },
    { to: "/help/quotations", label: "ใบเสนอราคา" },
  ],
  "/help/payments": [
    { to: "/help/tax", label: "บันทึกรายได้" },
    { to: "/help/quotations", label: "ใบเสนอราคา" },
  ],
  "/help/tax": [{ to: "/help/payments", label: "รับชำระจากลูกค้า" }],
  "/help/branding": [
    { to: "/help/plans", label: "แพ็ก Pro white-label" },
    { to: "/help/quotations", label: "PDF ใบเสนอราคา" },
  ],
  "/help/plans": [
    { to: "/pricing", label: "ดูราคาเต็ม" },
    { to: "/help/branding", label: "ธีมเอกสาร Pro" },
  ],
  "/help/line": [
    { to: "/help/brief", label: "Job Tracker" },
    { to: "/help/plans", label: "แพ็ก Pro (LINE)" },
  ],
};
