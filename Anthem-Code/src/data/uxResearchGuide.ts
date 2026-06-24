/** Structured UX research guide — shared by /research page and docs/ux-research-review.md */

export type ResearchPersona = {
  id: string;
  label: string;
  email: string;
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
  pages: { path: string; label: string; auth?: boolean }[];
};

export const RESEARCH_INTRO = {
  demoUrl: "https://1px-demo.vercel.app",
  inAppPath: "/research",
  quickMinutes: "45–60",
  fullHours: "2–3",
  viewports: ["375×812 (mobile)", "768×1024 (tablet)", "1280+ (desktop)"],
  devices: ["Desktop Chrome (หลัก)", "Mobile Safari หรือ Chrome Android", "iPad แนวตั้ง (ถ้ามี)"],
} as const;

export const RESEARCH_PERSONAS: ResearchPersona[] = [
  {
    id: "creator-new",
    label: "ครีเอเตอร์ใหม่",
    email: "phatsawut@demo.pixel100.com",
    note: "Onboarding, Welcome PX, สร้าง/เผยแพร่ผลงานแรก",
  },
  {
    id: "creator-popular",
    label: "ครีเอเตอร์ยอดนิยม",
    email: "napatsara@demo.pixel100.com",
    note: "โปรไฟล์ที่มี engagement, ของขวัญ, คอลเลกชัน",
  },
  {
    id: "hirer",
    label: "ผู้จ้าง / สำรวจงาน",
    email: "chatchai@demo.pixel100.com",
    note: "Jobs, คำขอจ้าง, แชท, สมัครงาน",
  },
];

export const NEW_USER_JOURNEY: JourneyStep[] = [
  {
    step: 1,
    title: "Guest เปิดหน้าแรก",
    where: "/",
    criteria: "เข้าใจ value prop “ทุกคนคือ 1 PX” ภายใน 10 วินาที — hero, แท็บฟีด, ตัวเลขชุมชน",
  },
  {
    step: 2,
    title: "Guest กด action ที่ต้อง login",
    where: "Bottom nav, ไลก์, จ้างงาน",
    criteria: "Auth dialog ชัด ไม่หลง — รู้ว่าต้อง login ก่อนทำอะไร",
  },
  {
    step: 3,
    title: "Login ด้วยบัญชี demo",
    where: "/auth",
    criteria: "ไม่สับสนกับการสมัคร production — hint บัญชี demo มองเห็นได้",
  },
  {
    step: 4,
    title: "หลัง login ครั้งแรก",
    where: "/portfolio",
    criteria: "Welcome checklist 8 ภารกิจชัด — รู้ next step ทันที",
  },
  {
    step: 5,
    title: "รับ Welcome PX",
    where: "/portfolio (checklist)",
    criteria: "เข้าใจว่า PX คืออะไร ใช้ทำอะไร — progress 0/500, ปุ่มรับ PX",
  },
  {
    step: 6,
    title: "เผยแพร่ผลงานแรก",
    where: "/portfolio/new",
    criteria: "Attestation ลิขสิทธิ์ก่อน publish ไม่รู้สึกกลัว/สับสน — ลิงก์ /legal/ip ช่วยได้",
  },
];

export const DESIGN_CHECKLIST: ChecklistItem[] = [
  { id: "d-brand", text: "Brand & messaging — คอนเซปต์ 1 PX สื่อสารได้; tagline ไม่ซ้ำกับ concept ในหน้าเดียว" },
  { id: "d-thai", text: "Typography ไทย — thai-display / thai-body อ่านง่าย บรรทัดยาวไม่แตกแปลก" },
  { id: "d-hierarchy", text: "Visual hierarchy — การ์ดผลงาน, ปุ่มจ้าง/คอลแลป/สนับสนุน แยกชัด" },
  { id: "d-nav", text: "Navigation — bottom nav (mobile) vs header (desktop) ไม่หลง" },
  { id: "d-responsive", text: "Responsive — safe-area, chat ซ่อน bottom nav, editor ใช้ได้บน mobile" },
  { id: "d-states", text: "States — skeleton / empty / error ภาษาไทยเข้าใจใน 3 วินาที" },
  { id: "d-microcopy", text: "Microcopy — จ้าง vs คอลแลป vs สมัครงาน ไม่สับสน" },
  { id: "d-trust", text: "Trust & legal — cookie banner, footer legal, /legal/ip อ่านง่าย" },
  { id: "d-a11y", text: "Accessibility — focus ring, alt รูป demo, contrast ปุ่มสำคัญ" },
  { id: "d-1px-vs-solo", text: "Pixel100 (หน้าร้านโชว์งาน) vs So1o (หลังบ้านจัดการงาน) — ผู้ใช้ใหม่เข้าใจความต่างไหม" },
];

export const FEATURE_SECTIONS: FeatureSection[] = [
  {
    id: "A",
    title: "Discovery & Feed",
    paths: "/, /?mode=designers, /?mode=studios, /explore/:kind/:value",
    account: "Guest หรือทุก persona",
    steps: [
      "เปิดหน้าแรก สังเกต hero และตัวเลขชุมชน",
      "สลับแท็บ ผลงาน / ดีไซเนอร์ / สตูดิโอ",
      "กดการ์ดผลงาน 2–3 รายการ",
      "ลอง filter/explore ถ้ามีลิงก์จากหมวดหมู่",
    ],
    uxCriteria: [
      "First impression ชัดว่าเป็นแพลตฟอร์มอะไร",
      "Skeleton ไม่กระพริบ empty ผิดพลาด",
      "แท็บสลับแล้ว context ไม่หลง",
    ],
    success: "ค้นหาและประเมินครีเอเตอร์จากฟีดได้โดยไม่ต้องถาม",
    items: [
      { id: "a1", text: "Hero + tagline อ่านเข้าใจภายใน 10 วิ" },
      { id: "a2", text: "แท็บ ผลงาน/ดีไซเนอร์/สตูดิโอ สลับ smooth" },
      { id: "a3", text: "การ์ดผลงาน — รูป, ชื่อ, หมวด, engagement ชัด" },
      { id: "a4", text: "Empty state ภาษาไทย (ถ้า filter แล้วไม่มี)" },
      { id: "a5", text: "Explore / หมวดหมู่ — นำทางกลับฟีดได้" },
    ],
  },
  {
    id: "B",
    title: "โปรไฟล์ & ผลงาน public",
    paths: "/u/:id, /@username, /project/:id, /similar/:id",
    account: "napatsara@ หรือ guest",
    steps: [
      "เปิดโปรไฟล์ public จากฟีด",
      "เปิดรายละเอียดผลงาน /project/:id",
      "ดู ToolsGrid, ไลก์, คอมเมนต์",
      "ลอง similar images ถ้ามีลิงก์",
    ],
    uxCriteria: [
      "โปรไฟล์บอกว่าคนนี้ทำอะไรได้",
      "หน้ารายละเอียดผลงาน — CTA จ้าง/คอลแลป/สนับสนุน ไม่แออัด",
    ],
    success: "ประเมินครีเอเตอร์และตัดสินใจติดต่อได้จากหน้าเดียว",
    items: [
      { id: "b1", text: "โปรไฟล์ — avatar, bio, skills, ผลงาน grid" },
      { id: "b2", text: "ปุ่มติดตาม / แชร์ / รายงาน อยู่ตำแหน่งเหมาะสม" },
      { id: "b3", text: "Project detail — gallery, tools, stats, side panel" },
      { id: "b4", text: "ไลก์ + คอมเมนต์ (guest → auth prompt)" },
      { id: "b5", text: "Similar images — ค้นหาผลงานใกล้เคียงได้" },
    ],
  },
  {
    id: "C",
    title: "Auth & Session",
    paths: "/auth, /auth/callback",
    account: "phatsawut@ (login ใหม่)",
    steps: [
      "Guest กด action ที่ต้อง login",
      "Login ด้วย demo account",
      "Logout แล้ว refresh — ยัง logout",
      "ลอง redirect หลัง login (?redirect=)",
    ],
    uxCriteria: [
      "Demo hint ชัด ไม่ชวนสมัครใหม่ในโหมดทดสอบ",
      "Error login อ่านเข้าใจ",
    ],
    success: "Login/logout ไม่สับสน; รู้ว่า session หมดแล้วต้องทำอะไร",
    items: [
      { id: "c1", text: "Auth dialog / หน้า /auth — CTA ชัด" },
      { id: "c2", text: "Demo login hint มองเห็นในโหมด demo" },
      { id: "c3", text: "Redirect กลับหน้าเดิมหลัง login" },
      { id: "c4", text: "Logout แล้ว refresh ยัง logged out" },
      { id: "c5", text: "Unverified user gate (ถ้ามี) อธิบายชัด" },
    ],
  },
  {
    id: "D",
    title: "Onboarding & Welcome PX",
    paths: "/portfolio (Welcome checklist)",
    account: "phatsawut@",
    steps: [
      "Login ครั้งแรก → ดู checklist 8 ภารกิจ",
      "ทำภารกิมง่าย (ไลก์, สำรวจฟีด, ดู jobs)",
      "กดรับ PX ตามภารกิจ",
      "สังเกต progress 0/500 และ celebration",
    ],
    uxCriteria: [
      "Gamification ไม่รบกวน — ปิด/dismiss ได้",
      "รู้ว่า PX ใช้ส่งของขวัญ ไม่ใช่เงินจริง",
    ],
    success: "ผู้ใช้ใหม่รู้ next step และอยากทำภารกิจต่อ",
    items: [
      { id: "d1", text: "Checklist แสดงบน /portfolio หลัง login" },
      { id: "d2", text: "8 ภารกิจ — ลิงก์ไปหน้าที่เกี่ยวข้อง" },
      { id: "d3", text: "ปุ่มรับ PX + progress bar" },
      { id: "d4", text: "Celebration เมื่อครบ (ไม่ annoying)" },
      { id: "d5", text: "Dismiss checklist ได้" },
    ],
  },
  {
    id: "E",
    title: "Portfolio manage",
    paths: "/portfolio, /portfolio/manage",
    account: "phatsawut@",
    steps: [
      "ดูโปรไฟล์ของตัวเอง /portfolio",
      "ไป /portfolio/manage — แท็บ hiring / collab",
      "แก้ bio หรือเรียงผลงาน",
    ],
    uxCriteria: [
      "แยก public view vs manage ชัด",
      "คำขอจ้าง/คอลแลป อ่านสถานะได้",
    ],
    success: "จัดการพอร์ตโฟลิโอและคำขอได้โดยไม่หลงเมนู",
    items: [
      { id: "e1", text: "Portfolio ของฉัน — grid ผลงาน + stats" },
      { id: "e2", text: "Manage — hiring requests tab" },
      { id: "e3", text: "Manage — collab requests tab" },
      { id: "e4", text: "แชร์ลิงก์ @username" },
      { id: "e5", text: "ลิงก์ไป settings / earnings" },
    ],
  },
  {
    id: "F",
    title: "Project editor",
    paths: "/portfolio/new, /portfolio/:id/edit",
    account: "phatsawut@",
    steps: [
      "สร้างผลงานใหม่",
      "อัปโหลด gallery, เลือก tools, ใส่ license",
      "ลอง AI assist (ถ้ามี)",
      "ติ๊ก attestation แล้ว publish",
    ],
    uxCriteria: [
      "Editor ไม่ overwhelming บน mobile",
      "Attestation อ่านสั้น ลิงก์ /legal/ip ช่วย",
      "Publish บล็อกถ้ายังไม่ยืนยันลิขสิทธิ์",
    ],
    success: "เผยแพร่ผลงานแรกได้โดยเข้าใจข้อกำหนดลิขสิทธิ์",
    items: [
      { id: "f1", text: "ฟอร์ม editor — title, category, description" },
      { id: "f2", text: "Gallery DnD + รูป/วิดีโอ" },
      { id: "f3", text: "Tool picker + license fields" },
      { id: "f4", text: "AI assist panel (optional)" },
      { id: "f5", text: "Attestation checkbox + link /legal/ip" },
      { id: "f6", text: "Publish vs Draft ชัด" },
    ],
  },
  {
    id: "G",
    title: "Jobs",
    paths: "/jobs, /jobs/:id",
    account: "chatchai@",
    steps: [
      "เปิด /jobs ดูประกาศ",
      "เปิดรายละเอียดงาน",
      "ลองโพสต์งาน (login) หรือสมัคร",
    ],
    uxCriteria: [
      "แยกโหมดหางาน vs โพสต์งาน",
      "การ์ดงาน — บทบาท, งบ, สถานะ อ่านเร็ว",
    ],
    success: "เข้าใจว่าหางาน/โพสต์งานทำอย่างไร",
    items: [
      { id: "g1", text: "Jobs list — filter/tab ชัด" },
      { id: "g2", text: "Job detail — รายละเอียด + สมัคร" },
      { id: "g3", text: "โพสต์งาน — ฟอร์ม + validation" },
      { id: "g4", text: "รายงานงาน (ReportTrigger)" },
      { id: "g5", text: "Empty state เมื่อไม่มีงาน" },
    ],
  },
  {
    id: "H",
    title: "Hiring & Collab",
    paths: "ProjectSidePanel → /portfolio/manage?focus=",
    account: "chatchai@ (ส่ง) + phatsawut@ (รับ)",
    steps: [
      "เปิดผลงาน → กดจ้างงาน",
      "เปิดผลงาน → กดขอคอลแลป",
      "ดูยืนยันและข้อความ success",
      "Login ผู้รับ → ดูใน portfolio/manage",
    ],
    uxCriteria: [
      "จ้าง vs คอลแลป ต่างกันชัดในภาษาและฟอร์ม",
      "ไม่รู้สึกว่าส่งแล้วหาย — มี feedback",
    ],
    success: "ส่งคำขอได้โดยไม่สับสนประเภท",
    items: [
      { id: "h1", text: "ปุ่มจ้างงานบน project detail" },
      { id: "h2", text: "ปุ่มขอคอลแลป — copy ต่างจากจ้าง" },
      { id: "h3", text: "ฟอร์ม + validation" },
      { id: "h4", text: "Toast/confirm หลังส่ง" },
      { id: "h5", text: "ผู้รับเห็นใน manage tab" },
    ],
  },
  {
    id: "I",
    title: "Chat",
    paths: "/chat, /chat/:id",
    account: "phatsawut@ + chatchai@",
    steps: [
      "เปิด inbox /chat",
      "เปิด thread ส่งข้อความ",
      "ลอง report user/message",
      "Mobile — bottom nav ซ่อนใน thread",
    ],
    uxCriteria: [
      "Inbox อ่านง่าย — ชื่อ, preview, เวลา",
      "ส่งข้อความ feedback ชัด",
    ],
    success: "คุยต่อจากคำขอจ้าง/งานได้ลื่น",
    items: [
      { id: "i1", text: "Chat inbox list" },
      { id: "i2", text: "Thread — ส่ง/รับข้อความ" },
      { id: "i3", text: "Report user / message" },
      { id: "i4", text: "Mobile UX — keyboard, scroll" },
      { id: "i5", text: "Empty inbox state" },
    ],
  },
  {
    id: "J",
    title: "Notifications",
    paths: "/notifications",
    account: "phatsawut@",
    steps: [
      "เปิด /notifications",
      "Mark read / กดลิงก์ไปหน้าที่เกี่ยวข้อง",
      "Badge บน bottom nav",
    ],
    uxCriteria: [
      "ประเภทแจ้งเตือนแยกอ่านได้ (จ้าง, ไลก์, แชท)",
      "ลิงก์พาไป context ถูก",
    ],
    success: "รู้ว่ามีอะไรใหม่และไปต่อได้ทันที",
    items: [
      { id: "j1", text: "Notification list + icons" },
      { id: "j2", text: "Mark read" },
      { id: "j3", text: "Deep link ไป project/chat/job" },
      { id: "j4", text: "Empty state" },
      { id: "j5", text: "Badge count บน nav" },
    ],
  },
  {
    id: "K",
    title: "Collections & Inspire",
    paths: "/collections, /collections/:id, /inspire/:boardId",
    account: "napatsara@",
    steps: [
      "เปิด /collections",
      "สร้าง/เปิด collection",
      "บันทึกผลงานจาก project detail",
      "เปิด inspire board ถ้ามี",
    ],
    uxCriteria: [
      "Save to collection ไม่ซับซ้อน",
      "Inspire board ให้แรงบันดาลใจ ไม่หลง",
    ],
    success: "เก็บและจัดกลุ่มผลงานที่ชอบได้",
    items: [
      { id: "k1", text: "Collections list" },
      { id: "k2", text: "Collection detail — grid" },
      { id: "k3", text: "Save popover จาก project" },
      { id: "k4", text: "Inspire board detail" },
      { id: "k5", text: "Empty collection state" },
    ],
  },
  {
    id: "L",
    title: "Gifting, PX & Earnings",
    paths: "SupportButton, /earnings",
    account: "chatchai@ (ส่ง) + napatsara@ (รับ)",
    steps: [
      "เปิดผลงาน → ส่ง PX/ของขวัญ",
      "ดู DonationModal — welcome_px vs earned",
      "เปิด /earnings ดูยอดและถอน",
    ],
    uxCriteria: [
      "PX ไม่สับสนกับเงินบาท",
      "Welcome PX vs earned อธิบายชัด",
    ],
    success: "เข้าใจระบบ PX และสนับสนุนครีเอเตอร์ได้",
    items: [
      { id: "l1", text: "SupportButton บน project" },
      { id: "l2", text: "DonationModal — จำนวน, ยอดคงเหลือ" },
      { id: "l3", text: "Success feedback หลังส่ง" },
      { id: "l4", text: "/earnings — balance breakdown" },
      { id: "l5", text: "Cashout flow (demo — ไม่จ่ายจริง)" },
    ],
  },
  {
    id: "M",
    title: "Studio",
    paths: "/s/doi-studio, /studio/new, /studio/manage, /studio/invites",
    account: "Guest + phatsawut@",
    steps: [
      "เปิด /s/doi-studio (public)",
      "ดูสมาชิกและผลงานสตูดิโอ",
      "ลอง flow สร้างสตูดิโอ (ถ้ามีสิทธิ์)",
    ],
    uxCriteria: [
      "Studio profile ต่างจาก personal profile",
      "Invite/manage ไม่ overwhelming",
    ],
    success: "เข้าใจว่าสตูดิโอคือทีม/แบรนด์ ไม่ใช่บุคคล",
    items: [
      { id: "m1", text: "Studio public page /s/:slug" },
      { id: "m2", text: "สมาชิก + ผลงานร่วม" },
      { id: "m3", text: "/studio/new — สร้าง" },
      { id: "m4", text: "/studio/manage — จัดการ" },
      { id: "m5", text: "/studio/invites" },
    ],
  },
  {
    id: "N",
    title: "Contracts",
    paths: "/contracts, /contracts/new",
    account: "phatsawut@ หรือ chatchai@",
    steps: [
      "เปิด /contracts",
      "สร้างสัญญาใหม่ (ถ้ามี template)",
      "ดู editor/sign flow",
    ],
    uxCriteria: [
      "ภาษากฎหมายไม่น่ากลัวเกิน — มีคำอธิบาย",
      "ขั้นตอน sign ชัด",
    ],
    success: "เข้าใจว่าสัญญาช่วย formalize งาน",
    items: [
      { id: "n1", text: "Contracts list" },
      { id: "n2", text: "Contract editor" },
      { id: "n3", text: "Sign / status" },
      { id: "n4", text: "Empty state" },
    ],
  },
  {
    id: "O",
    title: "Settings & Verify",
    paths: "/settings, /verify",
    account: "phatsawut@",
    steps: [
      "เปิด /settings — profile, skills, notifications",
      "Toggle email/LINE prefs",
      "เปิด /verify ถ้ามี flow KYC",
    ],
    uxCriteria: [
      "Settings จัดกลุ่ม logical",
      "Notification prefs อธิบายแต่ละ toggle",
    ],
    success: "ปรับโปรไฟล์และการแจ้งเตือนได้โดยไม่หลง",
    items: [
      { id: "o1", text: "Profile edit — avatar, bio, skills" },
      { id: "o2", text: "Email notification toggles" },
      { id: "o3", text: "LINE section (Pro+)" },
      { id: "o4", text: "ลิงก์ /me/reports, /me/feedback" },
      { id: "o5", text: "/verify — identity flow" },
    ],
  },
  {
    id: "P",
    title: "Upgrade & Ads",
    paths: "/upgrade, /advertise, /ads/:id",
    account: "Guest + login",
    steps: [
      "เปิด /upgrade ดูแพ็กเกจ",
      "เปิด /advertise — ลงโฆษณา",
      "เปิด ad detail จาก seed",
    ],
    uxCriteria: [
      "Value prop แต่ละ tier ชัด",
      "Advertise ไม่รู้สึก spam",
    ],
    success: "เข้าใจว่า upgrade ได้อะไรเพิ่ม",
    items: [
      { id: "p1", text: "/upgrade — plan comparison" },
      { id: "p2", text: "CTA upgrade ไม่ aggressive" },
      { id: "p3", text: "/advertise — ฟอร์มลงโฆษณา" },
      { id: "p4", text: "/ads/:id — รายละเอียด" },
    ],
  },
  {
    id: "Q",
    title: "Trust & Safety",
    paths: "ReportTrigger, /me/reports, FeedbackFab, /me/feedback",
    account: "ทุก persona",
    steps: [
      "รายงานผลงาน/โปรไฟล์/คอมเมนต์",
      "เปิด FeedbackFab ส่ง feedback",
      "ดู /me/reports และ /me/feedback",
    ],
    uxCriteria: [
      "Report ไม่ซ่อนเกินไป ไม่รบกวนเกิน",
      "FeedbackFab ไม่บังเนื้อหาสำคัญ",
    ],
    success: "รู้ว่ารายงานปัญหา/ส่ง feedback ได้ที่ไหน",
    items: [
      { id: "q1", text: "ReportTrigger — project, profile, comment, chat, job" },
      { id: "q2", text: "Report dialog + evidence upload" },
      { id: "q3", text: "/me/reports — สถานะ open/resolved" },
      { id: "q4", text: "FeedbackFab — rating + comment" },
      { id: "q5", text: "/me/feedback — ดู admin reply" },
    ],
  },
  {
    id: "R",
    title: "Legal & Privacy",
    paths: "/legal/privacy, /terms, /cookies, /rights, /legal/ip",
    account: "Guest",
    steps: [
      "เปิด legal pages จาก footer",
      "อ่าน /legal/ip — attestation",
      "Cookie consent banner",
    ],
    uxCriteria: [
      "Legal ภาษาไทยอ่านได้ ไม่ wall of text เกิน",
      "IP page สอดคล้อง checkbox ใน editor",
    ],
    success: "ผู้ใช้ใหม่รู้สิทธิ/หน้าที่ก่อนเผยแพร่ผลงาน",
    items: [
      { id: "r1", text: "/legal/privacy" },
      { id: "r2", text: "/legal/terms" },
      { id: "r3", text: "/legal/cookies + banner" },
      { id: "r4", text: "/legal/rights — PDPA" },
      { id: "r5", text: "/legal/ip — attestation text" },
    ],
  },
  {
    id: "S",
    title: "Assistant & Help",
    paths: "AnthemAssistantFab, /research, DemoModeBanner",
    account: "Guest + login",
    steps: [
      "กด Assistant FAB ถามคำถาม",
      "เปิด /research (หน้านี้)",
      "สังเกต demo banner บนสุด",
    ],
    uxCriteria: [
      "Assistant ช่วยได้จริง ไม่ hallucinate แรง",
      "Banner demo ไม่รบกวนการใช้งาน",
    ],
    success: "หาความช่วยเหลือได้เมื่อติด",
    items: [
      { id: "s1", text: "AnthemAssistantFab — เปิด/ปิด" },
      { id: "s2", text: "คำตอบ assistant เป็นภาษาไทย" },
      { id: "s3", text: "/research — คู่มือครบ" },
      { id: "s4", text: "DemoModeBanner + ลิงก์คู่มือ" },
    ],
  },
  {
    id: "T",
    title: "Errors & 404",
    paths: "/error/*, route ไม่มี",
    account: "Guest",
    steps: [
      "เปิด URL ไม่มีอยู่",
      "เปิด /error/404, /error/500",
      "Offline (DevTools) แล้ว refresh",
    ],
    uxCriteria: [
      "Error page — title + desc ไม่ทับกัน",
      "มีทางกลับ home",
    ],
    success: "ติด error แล้วไม่ panic — รู้ว่าทำอะไรต่อ",
    items: [
      { id: "t1", text: "404 NotFound" },
      { id: "t2", text: "/error/404, /500 pages" },
      { id: "t3", text: "ปุ่มกลับหน้าแรก" },
      { id: "t4", text: "Network error feedback" },
    ],
  },
];

export const MODERATED_TASKS: ModeratedTask[] = [
  {
    id: "T1",
    title: "ค้นหาดีไซเนอร์จากฟีด",
    persona: "Guest",
    steps: [
      "เปิดหน้าแรก /",
      "สลับแท็บ ผลงาน / ดีไซเนอร์ / สตูดิโอ",
      "เปิดโปรไฟล์และผลงาน 2–3 รายการ",
    ],
    success: "เข้าใจว่าฟีดช่วยค้นหาและประเมินครีเอเตอร์ได้เร็วแค่ไหน",
    interviewQuestions: [
      "ภายใน 10 วินาที เข้าใจว่าเว็บนี้ทำอะไรไหม?",
      "จะเลือกครีเอเตอร์จากอะไร — รูป, ชื่อ, หมวด?",
    ],
  },
  {
    id: "T2",
    title: "Onboarding + Welcome PX",
    persona: "phatsawut@",
    steps: [
      "Login ด้วยบัญชี demo",
      "ไป /portfolio ดู Welcome checklist",
      "ทำ 2–3 ภารกิจและกดรับ PX",
    ],
    success: "รู้ว่าหลัง login ทำอะไรต่อได้ทันที และเข้าใจ PX คืออะไร",
    interviewQuestions: [
      "Checklist ช่วยหรือรบกวน?",
      "PX คืออะไรในความเข้าใจคุณ?",
    ],
  },
  {
    id: "T3",
    title: "สร้างและเผยแพร่ผลงาน + attestation",
    persona: "phatsawut@",
    steps: [
      "ไป /portfolio/new",
      "กรอกข้อมูล + อัปโหลดรูป",
      "ติ๊ก attestation แล้ว publish",
    ],
    success: "เผยแพร่ได้โดยเข้าใจข้อกำหนดลิขสิทธิ์",
    interviewQuestions: [
      "Attestation อ่านเข้าใจไหม — กลัวหรือมั่นใจ?",
      "Editor ใช้งานบน mobile เป็นอย่างไร?",
    ],
  },
  {
    id: "T4",
    title: "จ้างงาน vs ขอคอลแลป",
    persona: "chatchai@",
    steps: [
      "เปิดผลงานจากฟีด",
      "กดจ้างงาน — สังเกตฟอร์ม",
      "กดขอคอลแลป — เปรียบเทียบ",
    ],
    success: "ไม่สับสนระหว่างจ้าง vs คอลแลป",
    interviewQuestions: [
      "ความต่างจ้าง vs คอลแลปชัดไหม?",
      "หลังส่งแล้ว คาดหวังว่าจะเกิดอะไร?",
    ],
  },
  {
    id: "T5",
    title: "สำรวจงานและสมัคร",
    persona: "chatchai@",
    steps: [
      "ไป /jobs",
      "อ่านประกาศ 2–3 รายการ",
      "ลองสมัครหรือโพสต์งาน",
    ],
    success: "เห็นภาพรวมตลาดงานครีเอทีฟไทย",
    interviewQuestions: [
      "Jobs ต่างจากจ้างจากผลงานอย่างไร?",
      "การ์ดงานอ่านเร็วพอไหม?",
    ],
  },
  {
    id: "T6",
    title: "แชทและการแจ้งเตือน",
    persona: "phatsawut@ + chatchai@",
    steps: [
      "เปิด /chat จาก inbox",
      "ส่งข้อความใน thread",
      "เปิด /notifications ดูรายการ",
    ],
    success: "ติดตามการสนทนาและเหตุการณ์ใหม่ได้",
    interviewQuestions: [
      "Inbox หาห้องที่ต้องการง่ายไหม?",
      "Notification พาไป context ถูกไหม?",
    ],
  },
  {
    id: "T7",
    title: "ส่ง PX และคอลเลกชัน",
    persona: "chatchai@ → napatsara@",
    steps: [
      "เปิดผลงาน napatsara → ส่ง PX",
      "บันทึกผลงานลง collection",
      "เปิด /collections ดูรายการ",
    ],
    success: "สนับสนุนและเก็บผลงานที่ชอบได้",
    interviewQuestions: [
      "PX รู้สึกเหมือนเงินจริงไหม — สับสนไหม?",
      "Save collection หาได้ไหม?",
    ],
  },
  {
    id: "T8",
    title: "รายงานและ feedback",
    persona: "ทุก persona",
    steps: [
      "รายงานคอมเมนต์หรือผลงาน",
      "กด FeedbackFab ส่ง feedback",
      "เปิด /me/reports ดูสถานะ",
    ],
    success: "รู้ช่องทางรายงานปัญหาและส่งความคิดเห็น",
    interviewQuestions: [
      "หาปุ่มรายงานได้ไหม — ซ่อนเกินไปไหม?",
      "FeedbackFab รบกวนการใช้งานไหม?",
    ],
  },
];

export const PAGE_MAP: PageMapGroup[] = [
  {
    group: "Public",
    pages: [
      { path: "/", label: "ฟีดหลัก" },
      { path: "/jobs", label: "งาน" },
      { path: "/advertise", label: "ลงโฆษณา" },
      { path: "/upgrade", label: "อัปเกรด" },
      { path: "/research", label: "คู่มือ UX (หน้านี้)" },
      { path: "/s/doi-studio", label: "สตูดิโอตัวอย่าง" },
      { path: "/project/:id", label: "รายละเอียดผลงาน" },
      { path: "/u/:id", label: "โปรไฟล์ public" },
    ],
  },
  {
    group: "Auth",
    pages: [
      { path: "/auth", label: "เข้าสู่ระบบ" },
      { path: "/auth/callback", label: "OAuth callback" },
    ],
  },
  {
    group: "Creator (login)",
    pages: [
      { path: "/portfolio", label: "พอร์ตโฟลิโอของฉัน", auth: true },
      { path: "/portfolio/manage", label: "จัดการคำขอจ้าง/คอลแลป", auth: true },
      { path: "/portfolio/new", label: "สร้างผลงาน", auth: true },
      { path: "/earnings", label: "รายได้ / PX", auth: true },
      { path: "/settings", label: "ตั้งค่า", auth: true },
      { path: "/verify", label: "ยืนยันตัวตน", auth: true },
    ],
  },
  {
    group: "Community (login)",
    pages: [
      { path: "/chat", label: "แชท", auth: true },
      { path: "/notifications", label: "การแจ้งเตือน", auth: true },
      { path: "/collections", label: "คอลเลกชัน", auth: true },
      { path: "/contracts", label: "สัญญา", auth: true },
      { path: "/studio/new", label: "สร้างสตูดิโอ", auth: true },
    ],
  },
  {
    group: "Me",
    pages: [
      { path: "/me/reports", label: "รายงานของฉัน", auth: true },
      { path: "/me/feedback", label: "feedback ของฉัน", auth: true },
    ],
  },
  {
    group: "Legal",
    pages: [
      { path: "/legal/privacy", label: "นโยบายความเป็นส่วนตัว" },
      { path: "/legal/terms", label: "ข้อกำหนดการใช้งาน" },
      { path: "/legal/cookies", label: "คุกกี้" },
      { path: "/legal/rights", label: "สิทธิข้อมูลส่วนบุคคล" },
      { path: "/legal/ip", label: "ลิขสิทธิ์ & attestation" },
    ],
  },
];

export const FEEDBACK_TEMPLATE = {
  fields: ["Persona ที่ใช้", "Task (T1–T8 หรือ section A–T)", "Severity (blocker / major / minor / suggestion)", "หน้าที่เจอ (path + viewport)", "Screenshot", "ข้อเสนอ / ความรู้สึก"],
  prompts: [
    "ภาษาไทยอ่านง่ายไหม — คำศัพท์ tech/ฟรีแลนซ์",
    "คอนเซปต์ \"ทุกคนคือ 1 PX\" สื่อสารได้หรือยัง",
    "ผู้ใช้ใหม่รู้ next step หลัง login ไหม",
    "Mobile vs Desktop — จุดที่ใช้ยากที่สุด",
    "Empty / loading / error — เข้าใจไหม",
    "ความต่าง Pixel100 vs So1o — เข้าใจไหม",
  ],
};

export const OUT_OF_SCOPE = [
  "การชำระเงิน / Stripe จริง",
  "KYC/AML admin flows",
  "Admin panel (/admin) — staff only",
  "So1o back-office (ลิงก์ออกไปแอปอื่น)",
  "Ops Hub",
  "จดทะเบียนเครื่องหมาย / โดเมน production",
];

export const ADMIN_APPENDIX = {
  note: "Optional — สำหรับ staff เท่านั้น ไม่บังคับ UX researcher ทั่วไป",
  paths: ["/admin", "/admin/reports", "/admin/feedback", "/admin/users", "/admin/projects"],
  items: [
    "Admin nav ครบและอ่านง่าย",
    "Reports/feedback batch actions",
    "CSV export ใช้งานได้",
  ],
};
