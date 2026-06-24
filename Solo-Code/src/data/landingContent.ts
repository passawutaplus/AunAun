import type { LucideIcon } from "lucide-react";
import {
  ListChecks,
  Briefcase,
  Users,
  Truck,
  FileText,
  Coins,
  Receipt,
  MessageSquare,
  CalendarDays,
  ClipboardList,
  CreditCard,
} from "lucide-react";

export const LANDING_COPY = {
  tagline: "หลังบ้านครบวงจรสำหรับฟรีแลนซ์",
  headline: "รับบรีฟ → ส่งใบเสนอราคา → เก็บเงิน → ยื่นภาษี ในแอปเดียว",
  subheadline:
    "สร้างใบเสนอราคาสวยใน 2 นาที ติดตามงานไม่หลุด ประมาณภาษีไทยอัตโนมัติ — ฟรี ไม่ต้องใช้บัตรเครดิต",
  trustChips: ["ฟรี ไม่มีบัตรเครดิต", "ใช้งานภาษาไทย", "รองรับภาษีไทย"],
  earlyAccessNote:
    "ใช้งานฟรีไม่จำกัด แม้สมัครเป็นผู้ทดลองไม่ทัน — เราจะค่อยๆ อัปเดตฟีเจอร์ที่พร้อมแล้วให้ใช้ในอนาคต",
} as const;

export type PainSolutionItem = {
  pain: string;
  solution: string;
  feature: string;
};

export const PAIN_SOLUTIONS: PainSolutionItem[] = [
  {
    pain: "ลืม follow-up ลูกค้า งานค้างไม่รู้ตัว",
    solution: "ติดตามทุกขั้นตอนใน Job Tracker — เห็นเดดไลน์และสถานะชัด",
    feature: "Job Tracker",
  },
  {
    pain: "ไม่รู้จะเสนอราคาเท่าไหร่",
    solution: "คำนวณราคางานฟรี + So1o Mentor ช่วยประเมินตลาด",
    feature: "Fair Price",
  },
  {
    pain: "งงภาษี 50 ทวิ และลดหย่อน",
    solution: "ประมาณภาษีอัตโนมัติ โหมดจำลองวางแผนก่อนยื่นจริง",
    feature: "ภาษี",
  },
  {
    pain: "ใบเสนอราคาดูไม่ professional",
    solution: "สร้าง QT/INV PDF สวย ส่งลิงก์ให้ลูกค้ายอมรับบนหน้า Track",
    feature: "Quotations",
  },
];

export type WorkflowStep = {
  id: string;
  label: string;
  title: string;
  desc: string;
  helpTo: string;
  helpLabel: string;
};

export const WORKFLOW_STEPS: WorkflowStep[] = [
  {
    id: "brief",
    label: "Brief",
    title: "Smart Brief",
    desc: "ลูกค้ากรอกบรีฟผ่านลิงก์ — ไม่ต้องถามซ้ำใน LINE",
    helpTo: "/help/brief",
    helpLabel: "คู่มือ Brief",
  },
  {
    id: "qt",
    label: "QT",
    title: "ใบเสนอราคา",
    desc: "สร้าง QT สวย ส่งลิงก์ Track ให้ลูกค้าดูและยอมรับ",
    helpTo: "/help/quotations",
    helpLabel: "คู่มือ QT",
  },
  {
    id: "track",
    label: "Track",
    title: "ติดตามงาน",
    desc: "ลูกค้าเห็นความคืบหน้า feedback และชำระเงิน",
    helpTo: "/help/brief",
    helpLabel: "Track & Brief",
  },
  {
    id: "invoice",
    label: "Invoice",
    title: "ใบแจ้งหนี้",
    desc: "ออก INV/RC หลังงานเสร็จ ซิงค์รายได้อัตโนมัติ",
    helpTo: "/help/quotations",
    helpLabel: "ใบแจ้งหนี้",
  },
  {
    id: "tax",
    label: "Tax",
    title: "ภาษี",
    desc: "ประมาณภาษี 50 ทวิ ลดหย่อน — เชื่อมจากรายได้จริง",
    helpTo: "/help/tax",
    helpLabel: "คู่มือภาษี",
  },
];

export type FeatureGroup = {
  id: "jobs" | "manage" | "finance";
  label: string;
  desc: string;
  items: { icon: LucideIcon; title: string; desc: string }[];
};

export const FEATURE_GROUPS: FeatureGroup[] = [
  {
    id: "jobs",
    label: "รับงาน",
    desc: "ตั้งแต่รับบรีฟ จนปิดงาน — ไม่หลุดเดดไลน์",
    items: [
      {
        icon: ListChecks,
        title: "ติดตามงาน",
        desc: "Job Tracker ตั้งแต่รับบรีฟ ส่งร่าง แก้ไข จนปิดงาน",
      },
      {
        icon: Users,
        title: "Clients CRM",
        desc: "บันทึกประวัติลูกค้าและรายละเอียดงาน",
      },
      {
        icon: ClipboardList,
        title: "Smart Brief",
        desc: "ลูกค้ากรอกบรีฟผ่านลิงก์ — ลดถามซ้ำ",
      },
    ],
  },
  {
    id: "manage",
    label: "บริหาร",
    desc: "จัดการ supplier feedback และ content",
    items: [
      {
        icon: Truck,
        title: "Suppliers Hub",
        desc: "รวม PDF ตัวอย่างงานและลิงก์อ้างอิง",
      },
      {
        icon: MessageSquare,
        title: "รวม Feedback ลูกค้า",
        desc: "แยกรอบ feedback ชัดเจน ไม่พลาด",
      },
      {
        icon: CalendarDays,
        title: "Content Planner",
        desc: "วางแผนโพสต์โซเชียลต่อเนื่อง",
      },
      {
        icon: Briefcase,
        title: "Subscriber Tracker",
        desc: "ติดตาม subscription และวันครบกำหนด",
      },
    ],
  },
  {
    id: "finance",
    label: "การเงิน/ภาษี",
    desc: "ใบเสนอราคา รายได้ ภาษี — ครบวงจร",
    items: [
      {
        icon: FileText,
        title: "Quotations & Invoices",
        desc: "สร้าง QT/INV/RC ส่งลิงก์ให้ลูกค้าได้ทันที",
      },
      {
        icon: Coins,
        title: "รายได้",
        desc: "กราฟรายเดือน ส่งออก CSV เชื่อมภาษี",
      },
      {
        icon: Receipt,
        title: "ภาษี & 50 ทวิ",
        desc: "ประมาณภาษี หักเหมา/จริง โหมดจำลอง",
      },
      {
        icon: CreditCard,
        title: "รับชำระเงิน",
        desc: "QR และบัตรบนหน้า Track ลูกค้า",
      },
    ],
  },
];

export const HOW_IT_WORKS_STEPS = [
  { n: "01", t: "สมัครฟรี", d: "สมัครและตอบแบบฟอร์มกลุ่มบุกเบิกสั้นๆ ให้เรารู้จักคุณ" },
  {
    n: "02",
    t: "รับสิทธิ์ Tester",
    d: "เข้าใช้งานหลังบ้านได้ทันทีหลังตอบแบบฟอร์ม จำกัด 100 user แรก",
  },
  { n: "03", t: "ใช้งาน + ให้ฟีดแบ็ก", d: "ทดลองทุกฟีเจอร์ พร้อมรับสิทธิพิเศษเมื่อเปิดตัวจริง" },
] as const;

/** Subset of HELP_FAQ ids shown on landing */
export const LANDING_FAQ_IDS = [
  "free",
  "track-brief",
  "accept-qt",
  "ecosystem",
  "pro-worth",
] as const;

export const FINAL_CTA = {
  title: (remaining: number) =>
    remaining > 0
      ? `เหลืออีก ${remaining} ที่นั่ง Tester — เริ่มใช้หลังบ้านฟรีวันนี้`
      : "พร้อมยกระดับงานฟรีแลนซ์ของคุณหรือยัง?",
  subtitle: "สมัครฟรี ไม่ต้องใช้บัตรเครดิต เริ่มใช้งานได้ทันที",
} as const;
