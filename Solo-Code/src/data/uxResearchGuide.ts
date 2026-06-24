/** Structured UX research guide — shared by /research page and docs/ux-research-review.md */

export type ResearchPersona = {
  id: string;
  label: string;
  setup: string;
  note: string;
};

export type JourneyStep = {
  step: number;
  title: string;
  where: string;
  criteria: string;
};

export type ChecklistItem = {
  id: string;
  text: string;
};

export type FeatureSection = {
  id: string;
  title: string;
  paths: string;
  account: string;
  steps: string[];
  uxCriteria: string[];
  success: string;
  items: ChecklistItem[];
};

export type ModeratedTask = {
  id: string;
  title: string;
  persona: string;
  steps: string[];
  success: string;
  interviewQuestions: string[];
};

export type PageMapGroup = {
  group: string;
  pages: { path: string; label: string; auth?: boolean; dashboard?: boolean }[];
};

export const RESEARCH_INTRO = {
  demoUrl: "https://solo-demo-liart.vercel.app",
  inAppPath: "/research",
  quickMinutes: "45–60",
  fullHours: "2–3",
  viewports: ["375×812 (mobile)", "768×1024 (tablet)", "1280+ (desktop)"],
  devices: ["Desktop Chrome (หลัก)", "iPhone Safari", "Android Chrome", "iPad แนวตั้ง (ถ้ามี)"],
} as const;

export const STRIPE_SANDBOX_HINT = "บัตรทดสอบ: 4242 4242 4242 4242 · วันหมดอายุอนาคต · CVC ใดก็ได้";

export const RESEARCH_PERSONAS: ResearchPersona[] = [
  {
    id: "freelancer-new",
    label: "ฟรีแลนซ์ใหม่",
    setup: "สมัครบัญชีใหม่ (แนะนำ Google Login)",
    note: "Landing, onboarding, ใบเสนอราคาแรก, Smart Brief",
  },
  {
    id: "freelancer-active",
    label: "ฟรีแลนซ์ที่มีงานแล้ว",
    setup: "บัญชีที่สร้าง Pipeline / QT / Job แล้ว 2–3 รายการ",
    note: "Pipeline, Job Tracker, รายได้, ภาษีประมาณการ",
  },
  {
    id: "freelancer-upgrade",
    label: "ฟรีแลนซ์กำลังอัปเกรด",
    setup: "บัญชี Free ที่ใช้งานมาแล้ว",
    note: "/pricing, Stripe sandbox checkout, Pro gate + AI credits",
  },
  {
    id: "inhouse-optional",
    label: "ทีมเล็ก (optional)",
    setup: "สมัคร In-House จาก /pricing",
    note: "Org workspace, invite member, kanban/chat",
  },
];

export const NEW_USER_JOURNEY: JourneyStep[] = [
  {
    step: 1,
    title: "Guest เปิดหน้าแรก",
    where: "/",
    criteria: "เข้าใจ value prop “รับบรีฟ → ใบเสนอราคา → เก็บเงิน → ภาษี” ภายใน 10 วินาที",
  },
  {
    step: 2,
    title: "ลอง Fair Price / So1o Mentor",
    where: "/ (scroll)",
    criteria: "รู้ว่ามีเครื่องมือฟรีก่อนสมัคร — calculator และ AI mentor guest quota",
  },
  {
    step: 3,
    title: "สมัครและ login",
    where: "/auth",
    criteria: "ไม่สับสน Tester 100 คน vs ใช้ฟรีทั่วไป — Google login รวดเร็ว",
  },
  {
    step: 4,
    title: "ตอบแบบสอบถาม",
    where: "/survey",
    criteria: "รู้ว่าเป็นฟรีแลนซ์หรือลูกค้า — flow ไม่ติด",
  },
  {
    step: 5,
    title: "Onboarding ครั้งแรก",
    where: "/dashboard",
    criteria: "รู้ next step — ตั้งโปรไฟล์ / สร้าง QT / เปิด Command menu (⌘K)",
  },
  {
    step: 6,
    title: "สร้างงานแรก end-to-end",
    where: "Pipeline → Quotation → /track/:token",
    criteria: "ลูกค้า (ตัวเองใน incognito) เปิดลิงก์ public และยอมรับ QT ได้",
  },
];

export const DESIGN_CHECKLIST: ChecklistItem[] = [
  {
    id: "d-brand",
    text: "Brand & messaging — “หลังบ้านฟรีแลนซ์” สื่อสารได้ ไม่ปนกับ Pixel100",
  },
  { id: "d-thai", text: "Typography ไทย — อ่านง่ายใน dashboard ที่ข้อมูลหนาแน่น" },
  { id: "d-hierarchy", text: "Visual hierarchy — Sidebar / Bottom nav / sub-tab แยกชัด" },
  { id: "d-nav", text: "Navigation — หา Pipeline, QT, Brief ได้ภายใน 3 คลิก" },
  {
    id: "d-responsive",
    text: "Responsive — Dashboard ใช้ได้บน iPhone Safari (safe-area, bottom nav)",
  },
  { id: "d-states", text: "States — empty / loading / error ภาษาไทย เข้าใจใน 3 วินาที" },
  { id: "d-microcopy", text: "Microcopy — QT / INV / Track / Brief ไม่สับสน" },
  { id: "d-trust", text: "Trust — disclaimer ภาษี/กฎหมาย แสดงครั้งเดียวต่อ context" },
  { id: "d-a11y", text: "Accessibility — focus, labels ฟอร์ม QT, contrast ปุ่มหลัก" },
  {
    id: "d-solo-vs-px",
    text: "So1o (หลังบ้านจัดการงาน) vs Pixel100 (หน้าร้านโชว์ผลงาน) — เข้าใจความต่างไหม",
  },
];

export const FEATURE_SECTIONS: FeatureSection[] = [
  {
    id: "A",
    title: "Landing & conversion",
    paths: "/, /pricing, /help",
    account: "Guest",
    steps: [
      "เปิด / บน mobile",
      "อ่าน hero + pain points + flow 5 ขั้น",
      "ลอง Fair Price calculator",
      "ลอง So1o Mentor (guest quota)",
    ],
    uxCriteria: [
      "First impression ชัดว่าเป็นแอปหลังบ้านฟรีแลนซ์",
      "CTA สมัคร Tester ไม่กดยาก",
      "ลิงก์ Pixel100 / Help ทำงาน",
    ],
    success: "Guest เข้าใจว่า So1o ทำอะไรและอยากลองสมัคร",
    items: [
      { id: "a1", text: "Hero อ่านง่าย value prop ชัด" },
      { id: "a2", text: "Fair Price calculator ใช้ได้ไม่ต้อง login" },
      { id: "a3", text: "So1o Mentor ทดลองได้ (guest quota)" },
      { id: "a4", text: "CTA สมัคร Tester ไม่กดยาก" },
      { id: "a5", text: "ลิงก์ไป Pixel100 / Help / Pricing ทำงาน" },
    ],
  },
  {
    id: "B",
    title: "Auth & session",
    paths: "/auth, /auth/callback, /auth/forgot, /reset-password",
    account: "ฟรีแลนซ์ใหม่",
    steps: [
      "สมัคร Google OAuth",
      "ลอง email signup + verification gate",
      "Logout แล้ว refresh",
      "ลอง forgot password (optional)",
    ],
    uxCriteria: ["Demo ไม่ชวนสับสนกับ production", "Error login อ่านเข้าใจ"],
    success: "Login/logout ไม่สับสน; session หมดแล้วรู้ว่าต้องทำอะไร",
    items: [
      { id: "b1", text: "Google OAuth สำเร็จ" },
      { id: "b2", text: "Email signup + verification gate" },
      { id: "b3", text: "Forgot password flow" },
      { id: "b4", text: "Logout แล้ว back ไม่เห็น data" },
      { id: "b5", text: "Session หมดอายุ — ข้อความชัด" },
    ],
  },
  {
    id: "C",
    title: "Onboarding & Home",
    paths: "/survey, /dashboard?tab=home|overview",
    account: "ฟรีแลนซ์ใหม่",
    steps: [
      "ทำ /survey",
      "ดู onboarding ครั้งแรก",
      "สำรวจ Home tab + Overview",
      "ลอง Command menu (⌘K)",
    ],
    uxCriteria: ["Onboarding ไม่ overwhelming", "Home มี next step ชัด"],
    success: "หลัง login รู้ว่าเริ่มจาก tab ไหน",
    items: [
      { id: "c1", text: "/survey ครบ ไม่ติด" },
      { id: "c2", text: "Onboarding flow ครั้งแรก" },
      { id: "c3", text: "Home tab — trends / announcements" },
      { id: "c4", text: "Dashboard overview KPI อ่านง่าย" },
      { id: "c5", text: "Command menu (⌘K) ค้นหา feature" },
    ],
  },
  {
    id: "D",
    title: "Pipeline & deals",
    paths: "/dashboard?tab=finance&sub=pipeline",
    account: "ฟรีแลนซ์ใหม่หรือ active",
    steps: ["สร้างดีลใหม่", "ย้าย stage", "เชื่อม QT กับดีล", "Refresh แล้ว data ยังอยู่"],
    uxCriteria: ["Kanban อ่าน stage ได้เร็ว", "Empty state มี CTA"],
    success: "จัดการดีลได้โดยไม่หลงเมนู",
    items: [
      { id: "d1", text: "สร้างดีลใหม่" },
      { id: "d2", text: "ย้าย stage ใน pipeline" },
      { id: "d3", text: "เชื่อม QT กับดีล" },
      { id: "d4", text: "Empty state มี CTA" },
      { id: "d5", text: "Refresh แล้ว data ยังอยู่" },
    ],
  },
  {
    id: "E",
    title: "Smart Brief & Meeting",
    paths: "/dashboard?tab=planner&sub=briefs|meetings, /brief/:token",
    account: "ฟรีแลนซ์ใหม่",
    steps: [
      "สร้าง brief + Quick Capture",
      "แชร์ /brief/:token — เปิด incognito",
      "ลอง Meeting tab (ถ้าเปิด)",
    ],
    uxCriteria: ["ลูกค้าไม่ต้อง login กรอก brief ได้", "AI disclaimer ชัด"],
    success: "รับบรีฟจากลูกค้าได้โดยไม่ถามซ้ำใน LINE",
    items: [
      { id: "e1", text: "สร้าง brief" },
      { id: "e2", text: "Quick Capture / upload" },
      { id: "e3", text: "AI extract (ถ้ามีเครดิต)" },
      { id: "e4", text: "แชร์ /brief/:token" },
      { id: "e5", text: "Meeting — บันทึก/รายงาน (ถ้าเปิด)" },
    ],
  },
  {
    id: "F",
    title: "Quotations & PDF",
    paths: "/dashboard?tab=finance&sub=quotations",
    account: "ฟรีแลนซ์ใหม่",
    steps: [
      "สร้าง QT ครบฟิลด์",
      "ดู PDF preview",
      "ตั้งมัดจำ / WHT 3%",
      "ส่งอีเมล QT (ถ้าตั้งค่าแล้ว)",
    ],
    uxCriteria: ["ภาษาไทยใน QT อ่านเป็นธรรมชาติ", "PDF สวยบน mobile"],
    success: "สร้างและส่งใบเสนอราคา professional ได้",
    items: [
      { id: "f1", text: "สร้าง QT ครบฟิลด์" },
      { id: "f2", text: "PDF preview สวย / พิมพ์ได้" },
      { id: "f3", text: "มัดจำ / WHT คำนวณถูก" },
      { id: "f4", text: "ส่งอีเมล QT (ถ้ามี)" },
      { id: "f5", text: "Duplicate / template" },
      { id: "f6", text: "Handoff จาก Pixel100 (ถ้าทดลอง)" },
    ],
  },
  {
    id: "G",
    title: "Job Tracker & Track",
    paths: "/dashboard?tab=finance&sub=jobs, /track/:token",
    account: "ฟรีแลนซ์ active",
    steps: [
      "สร้าง job จาก QT",
      "อัปเดตสถานะ + deadline",
      "แชร์ /track/:token",
      "ลูกค้ายอมรับ QT จากหน้า Track",
    ],
    uxCriteria: ["Track vs Brief ต่างกันชัด", "Client view ไม่ต้อง login"],
    success: "ติดตามงานครบวงจรโดยไม่หลง",
    items: [
      { id: "g1", text: "สร้าง job จาก QT" },
      { id: "g2", text: "อัปเดตสถานะ + deadline" },
      { id: "g3", text: "/track/:token ฝั่งลูกค้า" },
      { id: "g4", text: "Client accept QT" },
      { id: "g5", text: "Client checkout sandbox (ถ้ามี)" },
    ],
  },
  {
    id: "H",
    title: "Income & finance",
    paths: "/dashboard?tab=finance&sub=income|subs",
    account: "ฟรีแลนซ์ active",
    steps: ["บันทึกรายได้", "ซิงค์จากงานปิดแล้ว", "ดูกราฟ/สรุป", "สังเกต subscription banner"],
    uxCriteria: ["ตัวเลขอ่านง่าย", "Subscription status ชัด"],
    success: "เห็นภาพรวมการเงินจากงานจริง",
    items: [
      { id: "h1", text: "บันทึกรายได้" },
      { id: "h2", text: "ซิงค์จากงานปิดแล้ว" },
      { id: "h3", text: "กราฟ/สรุปอ่านง่าย" },
      { id: "h4", text: "Export / print (ถ้ามี)" },
      { id: "h5", text: "Subscription banner สถานะชัด" },
    ],
  },
  {
    id: "I",
    title: "Tax sandbox",
    paths: "/dashboard?tab=finance&sub=tax",
    account: "ฟรีแลนซ์ active",
    steps: ["ประมาณภาษี", "ดู disclaimer", "ลอง WHT scan AI (optional)"],
    uxCriteria: ["ไม่รู้สึกว่าเป็นคำปรึกษาทางการ", "ตัวเลขสอดคล้องรายได้"],
    success: "เข้าใจว่าเป็นคำแนะนำเบื้องต้น ไม่ใช่ยื่นจริง",
    items: [
      { id: "i1", text: "ประมาณภาษีแสดง disclaimer" },
      { id: "i2", text: "ลดหย่อน / 50 ทวิ UI" },
      { id: "i3", text: "WHT scan AI (optional)" },
      { id: "i4", text: "ไม่รู้สึกว่าเป็นคำปรึกษาทางการ" },
      { id: "i5", text: "ตัวเลขสอดคล้องรายได้" },
    ],
  },
  {
    id: "J",
    title: "Subscription & pricing",
    paths: "/pricing, /dashboard?tab=finance&sub=subs",
    account: "ฟรีแลนซ์ upgrade",
    steps: ["เปิด /pricing", "Stripe sandbox checkout Pro", "กลับ dashboard ดู Pro gate"],
    uxCriteria: ["ราคา Pro vs Free ชัด", "Sandbox ไม่รู้สึกว่าจ่ายจริง"],
    success: "เข้าใจว่า upgrade ได้อะไรเพิ่ม",
    items: [
      { id: "j1", text: "/pricing ตารางชัด" },
      { id: "j2", text: "Stripe sandbox checkout" },
      { id: "j3", text: "Pro gate บน feature ที่ล็อก" },
      { id: "j4", text: "Upgrade / cancel path" },
      { id: "j5", text: "เครดิต AI หลัง Pro" },
    ],
  },
  {
    id: "K",
    title: "Clients & My Data",
    paths: "/dashboard?tab=mydata&sub=clients|suppliers|assets|legal",
    account: "ฟรีแลนซ์ active",
    steps: ["เพิ่มลูกค้า CRM", "สำรวจ Suppliers/Assets/Legal", "Prefill ใน QT จากลูกค้า"],
    uxCriteria: ["CRM ไม่ overwhelming", "Legal Desk disclaimer ชัด"],
    success: "จัดการข้อมูลลูกค้าและเอกสารได้",
    items: [
      { id: "k1", text: "เพิ่มลูกค้า CRM" },
      { id: "k2", text: "Suppliers / Assets" },
      { id: "k3", text: "Legal Desk" },
      { id: "k4", text: "Prefill ใน QT จากลูกค้า" },
      { id: "k5", text: "RLS — ไม่เห็นข้อมูลคนอื่น" },
    ],
  },
  {
    id: "L",
    title: "Planner",
    paths: "/dashboard?tab=planner&sub=content|projects|feedback",
    account: "ฟรีแลนซ์ active",
    steps: ["Content calendar", "To Do list", "Feedback ลูกค้า", "สลับ sub-tab บน mobile"],
    uxCriteria: ["Planner ไม่รู้สึกแยกจาก Finance เกินไป"],
    success: "วางแผนงานและ feedback ได้ในที่เดียว",
    items: [
      { id: "l1", text: "Content calendar" },
      { id: "l2", text: "To Do list" },
      { id: "l3", text: "Feedback ลูกค้า" },
      { id: "l4", text: "สลับ sub-tab ไม่หลง" },
      { id: "l5", text: "Mobile ใช้ planner ได้" },
    ],
  },
  {
    id: "M",
    title: "Settings & integrations",
    paths: "/dashboard?tab=settings, /line-link",
    account: "ฟรีแลนซ์ active",
    steps: ["โปรไฟล์ + branding", "LINE link", "Notification prefs", "Dashboard shortcuts"],
    uxCriteria: ["Settings หา path ได้จาก Help table"],
    success: "ปรับโปรไฟล์และการแจ้งเตือนได้",
    items: [
      { id: "m1", text: "โปรไฟล์ + branding" },
      { id: "m2", text: "LINE link /line-link" },
      { id: "m3", text: "Notification prefs" },
      { id: "m4", text: "Theme / shortcuts" },
      { id: "m5", text: "Storage usage (ถ้ามี)" },
    ],
  },
  {
    id: "N",
    title: "Help Center",
    paths: "/help, /help/getting-started, /help/quotations, /help/tax, /help/brief",
    account: "Guest + login",
    steps: ["ค้นหา Track ใน /help", "อ่าน getting started 3 ขั้น", "ลิงก์กลับ dashboard"],
    uxCriteria: ["Help ไม่ซ้ำกับ /research ทั้งหมด"],
    success: "หาคำตอบ self-serve ได้",
    items: [
      { id: "n1", text: "/help ค้นหาได้" },
      { id: "n2", text: "Getting started 3 ขั้น" },
      { id: "n3", text: "คู่มือ QT / Tax / Brief" },
      { id: "n4", text: "ลิงก์กลับ dashboard ทำงาน" },
    ],
  },
  {
    id: "O",
    title: "Assistant & Mentor",
    paths: "/ (Mentor), Assistant sidebar ใน dashboard",
    account: "Guest + login",
    steps: ["Mentor บน landing", "Assistant ใน dashboard", "ทดสอบ quota หมด"],
    uxCriteria: ["AI disclaimer ชัด", "Assistant ไม่บังเนื้อหาหลัก"],
    success: "หาความช่วยเหลือ AI ได้เมื่อติด",
    items: [
      { id: "o1", text: "Mentor บน landing (guest)" },
      { id: "o2", text: "Assistant ใน dashboard" },
      { id: "o3", text: "AI disclaimer" },
      { id: "o4", text: "Quota หมด — ข้อความชัด" },
    ],
  },
  {
    id: "P",
    title: "In-House (optional)",
    paths: "/inhouse, /pricing (In-House tier)",
    account: "ทีมเล็ก",
    steps: ["สร้าง org", "Invite member", "ลอง kanban/chat workspace"],
    uxCriteria: ["Seat limit message ชัด"],
    success: "ทีมเล็กใช้ workspace ร่วมกันได้",
    items: [
      { id: "p1", text: "สร้าง org จาก pricing" },
      { id: "p2", text: "Invite member" },
      { id: "p3", text: "Kanban / chat workspace" },
      { id: "p4", text: "Seat limit message" },
    ],
  },
  {
    id: "Q",
    title: "Public token pages",
    paths: "/brief/:token, /track/:token, /supplier/:token",
    account: "Guest (incognito)",
    steps: ["เปิด brief token valid", "เปิด track token valid", "ลอง invalid token"],
    uxCriteria: ["Empty state สุภาพ", "ไม่ leak data คนอื่น"],
    success: "ลูกค้าใช้ลิงก์ public ได้โดยไม่งง",
    items: [
      { id: "q1", text: "/brief/:token valid" },
      { id: "q2", text: "/track/:token valid" },
      { id: "q3", text: "/supplier/:token (ถ้าทดลอง)" },
      { id: "q4", text: "Invalid token → empty state สุภาพ" },
    ],
  },
  {
    id: "R",
    title: "Legal & trust",
    paths: "/privacy, /terms, /cookies, Cookie consent",
    account: "Guest",
    steps: ["Cookie consent", "เปิด privacy/terms", "สังเกต demo banner vs หน้านี้"],
    uxCriteria: ["Legal ภาษาไทยอ่านได้", "Demo banner ไม่ซ้ำเนื้อหา research"],
    success: "ผู้ใช้ใหม่รู้สิทธิก่อนใช้งานจริง",
    items: [
      { id: "r1", text: "Cookie consent accept/reject" },
      { id: "r2", text: "/privacy /terms" },
      { id: "r3", text: "Demo banner ไม่ซ้ำกับ /research" },
      { id: "r4", text: "ภาษี/กฎหมาย disclaimer" },
      { id: "r5", text: "ไม่มีข้อความ tech โผล่ (Supabase ฯลฯ)" },
    ],
  },
  {
    id: "S",
    title: "Mobile & PWA",
    paths: "Dashboard ทุก tab บน mobile",
    account: "ทุก persona",
    steps: ["Bottom nav", "Upload รูป QT/Brief", "PDF บน mobile", "Safe area / keyboard"],
    uxCriteria: ["Sidebar → bottom nav transition ไม่หลง"],
    success: "ใช้งานหลักได้บนมือถือจริง",
    items: [
      { id: "s1", text: "Bottom nav ใช้งานได้" },
      { id: "s2", text: "Upload รูปใน QT/Brief" },
      { id: "s3", text: "PDF บน mobile" },
      { id: "s4", text: "Safe area / keyboard ไม่บังปุ่ม" },
    ],
  },
  {
    id: "T",
    title: "Errors & support",
    paths: "404, Support Hub, FeedbackFab",
    account: "Guest + login",
    steps: ["เปิด URL ไม่มี", "404 page", "FeedbackFab + Support Hub"],
    uxCriteria: ["Error page อ่านใน 3 วินาที"],
    success: "ติด error แล้วรู้ว่าทำอะไรต่อ",
    items: [
      { id: "t1", text: "404 อ่านเข้าใจ + ปุ่มกลับ" },
      { id: "t2", text: "Network error recoverable" },
      { id: "t3", text: "Support Hub / ticket" },
      { id: "t4", text: "FeedbackFab ทุกหน้าหลัก" },
    ],
  },
];

export const MODERATED_TASKS: ModeratedTask[] = [
  {
    id: "T1",
    title: "First impression (Guest)",
    persona: "Guest",
    steps: ["เปิด / บน mobile", "อ่าน hero + pain points", "ลอง Fair Price calculator 1 ครั้ง"],
    success: "เข้าใจว่า So1o ต่างจาก Pixel100 อย่างไร",
    interviewQuestions: [
      "ภายใน 10 วินาที รู้ว่าแอปนี้ทำอะไรไหม?",
      "ความต่างหลังบ้าน vs หน้าร้าน Pixel100 ชัดไหม?",
    ],
  },
  {
    id: "T2",
    title: "Sign up & onboarding",
    persona: "ฟรีแลนซ์ใหม่",
    steps: ["สมัคร Google หรืออีเมล", "ทำ /survey", "เข้า /dashboard ดู onboarding + Home"],
    success: "รู้ว่าหลัง login เริ่มจาก tab ไหน",
    interviewQuestions: ["Onboarding ช่วยหรือรบกวน?", "Command menu (⌘K) หาได้ไหม?"],
  },
  {
    id: "T3",
    title: "Pipeline → Quotation",
    persona: "ฟรีแลนซ์ใหม่",
    steps: ["Finance → Pipeline สร้างดีล", "Finance → Quotation สร้าง QT", "ดู PDF preview"],
    success: "สร้าง QT ได้โดยไม่งง hierarchy ฟิลด์",
    interviewQuestions: ["ภาษาไทยในใบเสนอราคาอ่านเป็นธรรมชาติไหม?", "ราคา/มัดจำ/WHT 3% เข้าใจไหม?"],
  },
  {
    id: "T4",
    title: "Smart Brief + ลิงก์ลูกค้า",
    persona: "ฟรีแลนซ์ใหม่",
    steps: ["Planner → Smart Brief สร้าง brief", "แชร์ /brief/:token", "เปิดลิงก์ใน incognito"],
    success: "ลูกค้าไม่ต้อง login กรอก brief ได้",
    interviewQuestions: ["ลูกค้ารู้ว่ากำลังทำอะไรไหม?", "Quick Capture / AI extract เข้าใจไหม?"],
  },
  {
    id: "T5",
    title: "Job Tracker + Track link",
    persona: "ฟรีแลนซ์ active",
    steps: ["สร้าง Job จาก QT", "แชร์ /track/:token", "อัปเดตสถานะ + ดูฝั่งลูกค้า"],
    success: "ติดตามงานครบวงจรโดยไม่หลง",
    interviewQuestions: ["Track vs Brief ต่างกันชัดไหม?", "ลูกค้ายอมรับ QT จากหน้า Track ได้ไหม?"],
  },
  {
    id: "T6",
    title: "รายได้ & ภาษี",
    persona: "ฟรีแลนซ์ active",
    steps: ["Finance → รายได้", "Finance → ภาษี โหมดประมาณการ", "อ่าน disclaimer"],
    success: "เข้าใจว่าเป็นคำแนะนำเบื้องต้น ไม่ใช่ยื่นจริง",
    interviewQuestions: ["Disclaimer ภาษีชัดพอไหม?", "ตัวเลขประมาณการน่าเชื่อถือแค่ไหน?"],
  },
  {
    id: "T7",
    title: "Subscription sandbox",
    persona: "ฟรีแลนซ์ upgrade",
    steps: ["เปิด /pricing", "Checkout Pro ด้วยบัตร sandbox", "กลับ dashboard ดู Pro gate"],
    success: "เข้าใจว่าจ่าย sandbox ไม่ใช่เงินจริง",
    interviewQuestions: ["ราคา Pro vs Free สื่อสารชัดไหม?", "หลัง upgrade UI เปลี่ยนเข้าใจได้ไหม?"],
  },
  {
    id: "T8",
    title: "Help, Feedback, Support",
    persona: "ทุก persona",
    steps: ["เปิด /help ค้นหา Track", "กด FeedbackFab", "เปิด Support Hub ใน dashboard"],
    success: "หาคำตอบและช่องทางแจ้งปัญหาได้",
    interviewQuestions: ["Help Center vs คู่มือ UX ซ้ำกันไหม?", "FeedbackFab รบกวนการใช้งานไหม?"],
  },
];

export const PAGE_MAP: PageMapGroup[] = [
  {
    group: "Public",
    pages: [
      { path: "/", label: "Landing" },
      { path: "/pricing", label: "ราคา" },
      { path: "/help", label: "ศูนย์ช่วยเหลือ" },
      { path: "/research", label: "คู่มือ UX (หน้านี้)" },
      { path: "/labs", label: "Creative Labs" },
      { path: "/apply", label: "สมัคร Tester" },
    ],
  },
  {
    group: "Auth",
    pages: [
      { path: "/auth", label: "เข้าสู่ระบบ" },
      { path: "/auth/callback", label: "OAuth callback" },
      { path: "/survey", label: "แบบสอบถาม onboarding" },
    ],
  },
  {
    group: "My Desk (login)",
    pages: [
      { path: "/dashboard", label: "Dashboard หลัก", auth: true, dashboard: true },
      {
        path: "/dashboard?tab=finance&sub=pipeline",
        label: "Pipeline",
        auth: true,
        dashboard: true,
      },
      {
        path: "/dashboard?tab=finance&sub=quotations",
        label: "Quotation",
        auth: true,
        dashboard: true,
      },
      {
        path: "/dashboard?tab=finance&sub=jobs",
        label: "Job Tracker",
        auth: true,
        dashboard: true,
      },
      {
        path: "/dashboard?tab=planner&sub=briefs",
        label: "Smart Brief",
        auth: true,
        dashboard: true,
      },
      { path: "/dashboard?tab=settings", label: "ตั้งค่า", auth: true, dashboard: true },
    ],
  },
  {
    group: "ลิงก์ลูกค้า (token)",
    pages: [
      { path: "/brief/:token", label: "Smart Brief ฝั่งลูกค้า" },
      { path: "/track/:token", label: "ติดตามงาน / ยอมรับ QT" },
      { path: "/supplier/:token", label: "Supplier portal" },
    ],
  },
  {
    group: "Legal",
    pages: [
      { path: "/privacy", label: "นโยบายความเป็นส่วนตัว" },
      { path: "/terms", label: "ข้อกำหนดการใช้งาน" },
      { path: "/cookies", label: "คุกกี้" },
    ],
  },
  {
    group: "Ecosystem",
    pages: [{ path: "https://1px-demo.vercel.app", label: "Pixel100 (หน้าร้านโชว์ผลงาน)" }],
  },
];

export const FEEDBACK_TEMPLATE = {
  fields: [
    "Persona ที่ใช้",
    "Task (T1–T8 หรือ section A–T)",
    "Severity (blocker / major / minor / suggestion)",
    "หน้าที่เจอ (path + viewport)",
    "Screenshot",
    "ข้อเสนอ / ความรู้สึก",
  ],
  prompts: [
    "ภาษาไทยอ่านง่ายไหม — คำศัพท์ฟรีแลนซ์/ภาษี",
    "First impression 10 วินาที — เข้าใจไหม",
    "Flow รับงาน→เก็บเงิน — ติดตรงไหน",
    "Mobile vs Desktop — จุดที่ใช้ยากสุด",
    "So1o vs Pixel100 — เข้าใจความต่างไหม",
    "Empty / loading / error — เข้าใจไหม",
  ],
};

export const OUT_OF_SCOPE = [
  "การชำระเงิน / Stripe production",
  "Admin panel (/admin) — staff only",
  "Ops Hub (hq.solofreelancer.com)",
  "KYC/AML admin flows",
  "อีเมลจริงไปลูกค้าจริง (ใช้ sandbox / อีเมลตัวเอง)",
  "LINE notification production (ต้องตั้งค่า OAuth แยก)",
];

export const ADMIN_APPENDIX = {
  note: "Optional — สำหรับ staff เท่านั้น ไม่บังคับ UX researcher ทั่วไป",
  paths: ["/admin"],
  items: [
    "Mission Control nav ครบและอ่านง่าย",
    "Reports/feedback batch actions",
    "CSV export ใช้งานได้",
  ],
};
