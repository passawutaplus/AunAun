/** AUTO-GENERATED — do not edit. Source: Solo-Code/F:\So1o\AunAun-fresh\Solo-Code\src\data\plans.ts */
export type PlanId = "free" | "pro" | "pro_plus" | "inhouse";
export type BillingCycle = "monthly" | "yearly";

export interface Plan {
  id: PlanId;
  name: string;
  tagline: string;
  monthly: number;
  yearly: number;
  /** Short bullets shown on pricing cards */
  highlights: string[];
  /** Extra details shown in expandable section */
  details: string[];
  /** @deprecated Use highlights — kept for backward compatibility */
  features: string[];
  cta: string;
  highlighted?: boolean;
  perSeat?: boolean;
}

export const PLANS: Plan[] = [
  {
    id: "free",
    name: "Free",
    tagline: "เริ่มต้นใช้งานฟรี ทุกฟีเจอร์พื้นฐาน",
    monthly: 0,
    yearly: 0,
    highlights: [
      "เริ่มใช้งานฟรี ไม่ต้องผูกบัตร",
      "Job Tracker 3 งาน/เดือน",
      "ใบเสนอราคา QT/INV/RC + Brief PDF",
      "Portal ลูกค้า (Track/Brief) — มี So1o badge",
      "จัดการลูกค้า & Supplier · Fair Price Calculator",
      "AI Credit 5/วัน × 14 วัน (ทดลองฟรี)",
    ],
    details: [
      "So1o Storage 50 MB · Aplus1 300 MB",
      "โพสต์ผลงาน Aplus1 ได้ 15 ชิ้น · แบบร่าง 5 · รูป/ผลงาน 6 · วิดีโอ 1 คลิป",
      "เอกสารและ Portal ใช้สี So1o มาตรฐาน · ไม่ปรับแบรนด์เอง",
      "ไม่มี LINE แจ้งเตือน · ไม่ปลดล็อก ecosystem ข้ามแอป",
    ],
    features: [
      "เริ่มใช้งานฟรี ไม่ต้องผูกบัตร",
      "Job Tracker 3 งาน/เดือน",
      "ใบเสนอราคา QT/INV/RC + Brief PDF",
      "Portal ลูกค้า — มี So1o badge",
      "จัดการลูกค้า & Supplier · Fair Price Calculator",
      "AI Credit 5/วัน × 14 วัน (ทดลองฟรี)",
    ],
    cta: "เริ่มใช้งานฟรี",
  },
  {
    id: "pro",
    name: "Pro",
    tagline: "ปลดล็อกทุกฟีเจอร์เต็มรูปแบบ",
    monthly: 249,
    yearly: 2388,
    highlights: [
      "ปลดล็อก So1o My Desk + Aplus1 บัญชีเดียว",
      "Job Tracker ไม่จำกัด",
      "Credit AI 5/วัน + 800 เครดิต/รอบบิล",
      "White-label เอกสาร — เอา So1o badge + ปรับสี QT/INV/RC/Brief",
      "Portal ลูกค้าแบรนด์ของคุณ (โลโก้ + สี)",
      "Public Tracking Links ไม่จำกัด · Priority Support",
    ],
    details: [
      "So1o 2 GB · Aplus1 1.5 GB",
      "โพสต์ผลงาน Aplus1 ไม่จำกัด · แบบร่าง 50 · รูป 20 · วิดีโอ 3 คลิป/ผลงาน",
      "ตั้งค่าแบรนด์เอกสารใน Settings → Document Branding",
      "LINE แจ้งเตือนได้ · โชว์เคส Aplus1 เต็มรูปแบบ",
    ],
    features: [
      "ปลดล็อก So1o My Desk + Aplus1 บัญชีเดียว",
      "Job Tracker ไม่จำกัด",
      "Credit AI 5/วัน + 800 เครดิต/รอบบิล",
      "White-label เอกสาร + Portal ลูกค้า",
      "Public Tracking Links ไม่จำกัด",
      "Priority Support",
    ],
    cta: "อัพเกรดเป็น Pro",
    highlighted: true,
  },
  {
    id: "pro_plus",
    name: "Pro+",
    tagline: "Ecosystem เต็ม — Auto-link Aplus1 + เครดิต AI มากขึ้น",
    monthly: 399,
    yearly: 3828,
    highlights: [
      "ทุกอย่างใน Pro (white-label เอกสาร + Portal)",
      "Credit AI 5/วัน + 1,400 เครดิต/รอบบิล",
      "So1o 4 GB + Aplus1 2.5 GB",
      "Auto CRM / Quote จากแชท Aplus1 (เร็วๆ นี้)",
      "Priority Support",
    ],
    details: [
      "โควต้า Aplus1 เทียบ Pro: storage +75% · เหมาะกับ creator ที่โพสต์งานหนัก",
      "ยังไม่มี workspace ทีม · Studio combined quote อยู่ที่ In-House",
    ],
    features: [
      "ทุกอย่างใน Pro (white-label เอกสาร + Portal)",
      "Credit AI 5/วัน + 1,400 เครดิต/รอบบิล",
      "So1o 4 GB + Aplus1 2.5 GB",
      "Auto CRM / Quote จากแชท Aplus1 (เร็วๆ นี้)",
      "Priority Support",
    ],
    cta: "อัพเกรดเป็น Pro+",
  },
  {
    id: "inhouse",
    name: "In-House (Team)",
    tagline: "สำหรับทีมและบริษัท · คิดรายที่นั่ง · Co-working workspace",
    monthly: 599,
    yearly: 5750,
    highlights: [
      "ทุกอย่างใน Pro (white-label ส่วนตัว)",
      "Credit AI 5/วัน + 2,000 เครดิต/รอบบิล",
      "So1o 10 GB · Aplus1 8 GB",
      "แบรนด์องค์กร + ใบเสนอราคาทีม + Studio quote (nest)",
      "Multi-user Workspace · Kanban · Chat · Monitor · Team Roles",
      "Centralized Billing · ขั้นต่ำ 2 ที่นั่ง · สูงสุด 50",
    ],
    details: [
      "ตั้งค่า Document Branding ระดับ org (โลโก้/สี/ข้อมูลบริษัท)",
      "ใบเสนอราคาทีม + รวมสมาชิก Aplus1 nest ออกใบเดียวให้ลูกค้า",
      "แบบร่าง Aplus1 100 ชิ้น · Co-working workspace พร้อมใช้",
    ],
    features: [
      "ทุกอย่างใน Pro (white-label ส่วนตัว)",
      "Credit AI 5/วัน + 2,000 เครดิต/รอบบิล",
      "So1o 10 GB · Aplus1 8 GB",
      "แบรนด์องค์กร + ใบเสนอราคาทีม + Studio quote (nest)",
      "Multi-user Workspace · Kanban · Chat · Monitor",
      "Centralized Billing · 2–50 ที่นั่ง",
    ],
    cta: "เริ่มใช้งานสำหรับทีม",
    perSeat: true,
  },
];

export function planPrice(plan: Plan, cycle: BillingCycle, seats = 1): number {
  const base = cycle === "monthly" ? plan.monthly : plan.yearly;
  return plan.perSeat ? base * seats : base;
}
