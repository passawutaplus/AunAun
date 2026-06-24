/** Shared legal page metadata — keep in sync across privacy / terms / cookies / refund. */
export const LEGAL = {
  siteName: "So1o Freelancer",
  siteUrl: "https://solofreelancer.com",
  ecosystemName: "Pixel100",
  ecosystemUrl: "https://pixel100.com",
  contactEmail: "hello@solofreelancer.com",
  /** Fixed date — update when policies change materially. */
  lastUpdated: "17 มิถุนายน 2569",
  lastUpdatedIso: "2026-06-17",
  controllerName: "So1o Freelancer",
  jurisdiction: "ประเทศไทย",
} as const;

/** Canonical public pricing — keep in sync with /pricing and Stripe lookup keys. */
export const PRICING = {
  proMonthly: 249,
  proYearly: 2388,
  proPlusMonthly: 399,
  proPlusYearly: 3828,
  inhouseMonthlyPerSeat: 599,
  inhouseYearlyPerSeat: 5750,
  freeMonthlyJobs: 3,
} as const;

export const REFUND_SECTIONS: LegalSection[] = [
  { id: "intro", title: "บทนำ" },
  { id: "subscription", title: "การสมัครแบบ subscription" },
  { id: "eligible", title: "กรณีที่อาจคืนเงิน" },
  { id: "not-eligible", title: "กรณีที่ไม่คืนเงิน" },
  { id: "client-payments", title: "ชำระจากลูกค้า (Stripe Connect)" },
  { id: "how", title: "วิธีขอคืนเงิน" },
  { id: "contact", title: "ติดต่อเรา" },
];

export type LegalSection = { id: string; title: string };

export const PRIVACY_SECTIONS: LegalSection[] = [
  { id: "intro", title: "บทนำ" },
  { id: "controller", title: "ผู้ควบคุมข้อมูล" },
  { id: "data-collected", title: "ข้อมูลที่เก็บ" },
  { id: "purposes", title: "วัตถุประสงค์และฐานทางกฎหมาย" },
  { id: "third-parties", title: "บุคคลที่สาม" },
  { id: "ecosystem", title: "So1o + Pixel100" },
  { id: "transfer", title: "การโอนข้อมูลต่างประเทศ" },
  { id: "retention", title: "ระยะเวลเก็บรักษา" },
  { id: "security", title: "ความปลอดภัย" },
  { id: "rights", title: "สิทธิของเจ้าของข้อมูล" },
  { id: "cookies", title: "คุกกี้" },
  { id: "esign", title: "ลายเซ็นอิเล็กทรอนิก" },
  { id: "ai", title: "การใช้ AI" },
  { id: "minors", title: "ผู้เยาว์" },
  { id: "changes", title: "การเปลี่ยนแปลง" },
  { id: "contact", title: "ติดต่อเรา" },
];

export const COOKIE_SECTIONS: LegalSection[] = [
  { id: "what", title: "คุกกี้คืออะไร" },
  { id: "categories", title: "ประเภทคุกกี้" },
  { id: "inventory", title: "รายการคุกกี้" },
  { id: "third-party", title: "บุคคลที่สาม" },
  { id: "manage", title: "จัดการคุกกี้" },
  { id: "contact", title: "ติดต่อเรา" },
];

export const TERMS_SECTIONS: LegalSection[] = [
  { id: "accept", title: "การยอมรับ" },
  { id: "service", title: "ลักษณะบริการ" },
  { id: "ecosystem", title: "So1o + Pixel100" },
  { id: "account", title: "บัญชีผู้ใช้" },
  { id: "prohibited", title: "การใช้งานที่ห้าม" },
  { id: "content", title: "กรรมสิทธิ์เนื้อหา" },
  { id: "client-portals", title: "หน้าลูกค้า (Track/Brief)" },
  { id: "esign", title: "ลายเซ็นเอกสาร" },
  { id: "payments-client", title: "รับชำระจากลูกค้า" },
  { id: "ai-tax", title: "AI และภาษี" },
  { id: "subscription", title: "แผนราคาและการชำระเงิน" },
  { id: "support", title: "Support Hub" },
  { id: "beta", title: "Early Access / Beta" },
  { id: "liability", title: "ข้อจำกัดความรับผิด" },
  { id: "termination", title: "การยกเลิกบัญชี" },
  { id: "changes", title: "การเปลี่ยนแปลง" },
  { id: "law", title: "กฎหมายที่ใช้บังคับ" },
  { id: "contact", title: "ติดต่อเรา" },
];

export type CookieInventoryRow = {
  name: string;
  storage: "Cookie" | "Local Storage" | "Session Storage";
  category: "essential" | "preferences" | "analytics";
  purpose: string;
  duration: string;
};

export const COOKIE_INVENTORY: CookieInventoryRow[] = [
  {
    name: "sb-*-auth-token",
    storage: "Local Storage",
    category: "essential",
    purpose: "รักษา Session การล็อกอิน (Supabase Auth)",
    duration: "ตาม Session / Refresh token",
  },
  {
    name: "so1o-cookie-consent",
    storage: "Local Storage",
    category: "essential",
    purpose: "บันทึกการเลือกยินยอมคุกกี้",
    duration: "180 วัน",
  },
  {
    name: "app-theme",
    storage: "Local Storage",
    category: "preferences",
    purpose: "จดจำธีมสว่าง/มืด",
    duration: "จนกว่าจะลบ",
  },
  {
    name: "sidebar_state",
    storage: "Cookie",
    category: "preferences",
    purpose: "จดจำสถานะเปิด/ปิด Sidebar ใน Dashboard",
    duration: "7 วัน",
  },
  {
    name: "so1o:fab-dock-pos:v1",
    storage: "Local Storage",
    category: "preferences",
    purpose: "ตำแหน่งปุ่มลัดลอย (FAB)",
    duration: "จนกว่าจะลบ",
  },
  {
    name: "so1o.announcement.dismissed.v2",
    storage: "Local Storage",
    category: "preferences",
    purpose: "ประกาศที่ผู้ใช้ปิดแล้ว",
    duration: "จนกว่าจะลบ",
  },
  {
    name: "so1o.mentor.guest_id",
    storage: "Local Storage",
    category: "analytics",
    purpose: "ระบุผู้เยี่ยมชมสำหรับ AI Mentor (ไม่ล็อกอิน)",
    duration: "จนกว่าจะลบ",
  },
  {
    name: "so1o.lastActiveBumpAt",
    storage: "Local Storage",
    category: "analytics",
    purpose: "จำกัดความถี่อัปเดต last_active_at",
    duration: "จนกว่าจะลบ",
  },
  {
    name: "so1o.lastActivityLog.*",
    storage: "Local Storage",
    category: "analytics",
    purpose: "จำกัดความถี่บันทึก user_activity_logs",
    duration: "จนกว่าจะลบ",
  },
  {
    name: "so1o.deviceTracked",
    storage: "Session Storage",
    category: "analytics",
    purpose: "จำกัดการบันทึก device analytics ต่อ session",
    duration: "Session",
  },
  {
    name: "so1o.sessionId",
    storage: "Session Storage",
    category: "analytics",
    purpose: "ระบุ session สำหรับวิเคราะห์อุปกรณ์",
    duration: "Session",
  },
  {
    name: "so1o-* (drafts)",
    storage: "Local Storage",
    category: "preferences",
    purpose: "Draft งาน, มุมมองแท็บ, ค่าตั้งต้น Dashboard",
    duration: "จนกว่าจะลบ",
  },
  {
    name: "__stripe_* / stripe.*",
    storage: "Cookie",
    category: "essential",
    purpose: "Checkout แผน Pro และ Stripe Connect (เมื่อชำระ/เชื่อมบัญชี)",
    duration: "ตาม Stripe (มัก ≤ 1 ปี)",
  },
];
