/** Structured UX research guide — shared by /research page and docs/ux-research-review.md */

export type ResearchPersona = {
  id: string;
  label: string;
  account: string;
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

export type ResearchScreenshot = {
  src: string;
  alt: string;
  caption?: string;
  viewport?: "mobile" | "desktop" | "tablet";
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
  screenshots?: ResearchScreenshot[];
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
  productionUrl: "https://aplus1.app",
  demoUrl: "https://aplus1-demo.vercel.app",
  feedbackPath: "/research/feedback",
  inAppPath: "/research",
  checklistPdfPath: "/aplus1-ux-usability-checklist.pdf",
  checklistPdfName: "aplus1-ux-usability-checklist.pdf",
  quickMinutes: "60–90",
  fullHours: "2.5–3.5",
  viewports: ["375×812 (mobile)", "768×1024 (tablet)", "1280+ (desktop)"],
  devices: ["Desktop Chrome (หลัก)", "Mobile Safari หรือ Chrome Android", "iPad แนวตั้ง (ถ้ามี)"],
} as const;

/** อ่านก่อนเริ่ม — แยก production (บัญชีจริง) vs demo */
export const RESEARCH_WARNINGS = {
  production: [
    "สมัครบัญชีใหม่ที่ /auth — ยืนยันอีเมลก่อนใช้งาน (อีเมล+รหัสผ่าน หรือ Google)",
    "บัญชีบันทึกถาวร — ผลงาน/โพสต์ที่ลงอยู่ในระบบจริง",
    "ใส่ข้อมูล mock ได้ — ไม่จำเป็นต้องใช้ข้อมูลส่วนตัวละเอียด",
    "อย่าชำระเงิน / อัปเกรดจ่ายจริง / ถอนเงิน / KYC จริง — ดู flow ได้แต่ไม่ต้องจบ transaction",
    "งาน 2 คน (แชท, จ้าง/คอลแลป) — ประสานกับ reviewer อีกคนหรือใช้บัญชีที่ 2",
  ],
  demo: [
    "บัญชี *@demo.pixel100.com บันทึกถาวร — ใช้ร่วมกัน อย่าสมัครใหม่",
    "อย่าใส่ข้อมูลส่วนตัวจริง · ไม่มีการชำระเงินจริง",
    "รหัสผ่าน demo ส่งผ่านช่องทางส่วนตัว — หมุนใหม่หลังจบรอบรีวิว",
  ],
} as const;

export const RESEARCH_PERSONAS: ResearchPersona[] = [
  {
    id: "creator-new",
    label: "ครีเอเตอร์ใหม่",
    account: "สมัครบัญชีใหม่ (ยังไม่มีผลงาน)",
    note: "Onboarding, Welcome PX, ลงผลงานแรก, โพสต์ Area แรก",
  },
  {
    id: "creator-active",
    label: "ครีเอเตอร์ที่มีผลงาน",
    account: "บัญชีที่ลงผลงาน 2–3 ชิ้น + โพสต์ Area",
    note: "โปรไฟล์ public, engagement, คอลเลกชัน, แท็บ Area/Drill",
  },
  {
    id: "hirer",
    label: "ผู้สำรวจ / จ้างงาน",
    account: "บัญชีที่ 2 หรือจับคู่กับ reviewer อีกคน",
    note: "Jobs, คำขอจ้าง/คอลแลป, แชท, So1o quote handoff",
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
    where: "FloatingNav, +1, จ้างงาน",
    criteria: "Auth dialog ชัด ไม่หลง — รู้ว่าต้อง login ก่อนทำอะไร",
  },
  {
    step: 3,
    title: "สมัครบัญชีใหม่",
    where: "/auth (สมัครสมาชิก)",
    criteria: "ฟอร์มไม่ซับซ้อน — consent ชัด, error ภาษาไทย, รหัสผ่าน ≥ 8 ตัว",
  },
  {
    step: 4,
    title: "ยืนยันอีเมล",
    where: "inbox → ลิงก์ยืนยัน",
    criteria: "รู้ว่าต้องยืนยันก่อนใช้งาน — resend ใช้ได้, ไม่หลง",
  },
  {
    step: 5,
    title: "หลัง login ครั้งแรก",
    where: "/portfolio",
    criteria: "Welcome checklist 8 ภารกิจชัด — รู้ next step ทันที",
  },
  {
    step: 6,
    title: "รับ Welcome PX",
    where: "/portfolio (checklist)",
    criteria: "เข้าใจว่า PX คืออะไร ใช้ทำอะไร — progress 0/500, ปุ่มรับ PX",
  },
  {
    step: 7,
    title: "เผยแพร่ผลงานแรก",
    where: "/portfolio/new",
    criteria: "Attestation ลิขสิทธิ์ก่อน publish ไม่รู้สึกกลัว/สับสน — ลิงก์ /legal/ip ช่วยได้",
  },
];

export const DESIGN_CHECKLIST: ChecklistItem[] = [
  { id: "d-brand", text: "Brand & messaging — คอนเซปต์ 1 PX สื่อสารได้; tagline ไม่ซ้ำกับ concept ในหน้าเดียว" },
  { id: "d-thai", text: "Typography ไทย — thai-display / thai-body อ่านง่าย บรรทัดยาวไม่แตกแปลก" },
  { id: "d-hierarchy", text: "Visual hierarchy — การ์ดผลงาน, ปุ่มจ้าง/คอลแลป/สนับสนุน แยกชัด" },
  { id: "d-nav", text: "Navigation — FloatingNav pill + FAB, Home vs Area, profile dropdown prefs" },
  { id: "d-responsive", text: "Responsive — safe-area, chat 3-panel + mobile partner slide-over, editor บน mobile, dark mode" },
  { id: "d-states", text: "States — skeleton / empty / error ภาษาไทยเข้าใจใน 3 วิ (รวม community editor, chat search empty)" },
  { id: "d-microcopy", text: "Microcopy — Projects vs Area, จ้าง vs คอลแลป vs สมัครงาน ไม่สับสน" },
  { id: "d-display", text: "Display prefs — ธีม + grid density + Area layout persist และใช้ได้ทุกหน้า" },
  { id: "d-trust", text: "Trust & legal — cookie banner, footer legal, /legal/ip, /legal/community อ่านง่าย" },
  { id: "d-a11y", text: "Accessibility — focus ring, alt รูป, contrast ปุ่มสำคัญ (รวม dark mode)" },
  { id: "d-1px-vs-solo", text: "Aplus1 (หน้าร้านโชว์งาน) vs So1o (หลังบ้านจัดการงาน) — handoff ใบเสนอราคาเข้าใจไหม" },
];

export const FEATURE_SECTIONS: FeatureSection[] = [
  {
    id: "A",
    title: "Discovery & Feed",
    paths: "/, /?mode=community, /?mode=designers, /?mode=studios, /drill, /explore/:kind/:value",
    account: "Guest หรือทุก persona",
    steps: [
      "เปิดหน้าแรก สังเกต hero และตัวเลขชุมชน",
      "สลับ Projects / Area / ดีไซเนอร์ / สตูดิโอ (และ Design Drill บน mobile)",
      "Area: แท็บ กำลังติดตาม / สำรวจ, filter หมวด/tag",
      "กดการ์ดผลงาน 2–3 รายการ, ลอง feed mode transition",
    ],
    uxCriteria: [
      "First impression ชัดว่าเป็นแพลตฟอร์มอะไร",
      "Home vs Area ไม่สับสน",
      "Skeleton ไม่กระพริบ empty ผิดพลาด",
    ],
    success: "ค้นหาและประเมินครีเอเตอร์จากฟีดได้โดยไม่ต้องถาม",
    screenshots: [
      {
        src: "/research/screenshots/a-feed-desktop.webp",
        alt: "ฟีดหลัก Projects บนเดสก์ท็อป",
        caption: "ดู hero, แท็บสลับ Projects/Area/ดีไซเนอร์/สตูดิโอ และการ์ดผลงาน — first impression ชัดไหม",
        viewport: "desktop",
      },
      {
        src: "/research/screenshots/a-area-desktop.webp",
        alt: "โหมด Area บนเดสก์ท็อป",
        caption: "ดู Area feed แยกจาก Projects — แท็บติดตาม/สำรวจและ filter หมวด/tag อ่านง่ายไหม",
        viewport: "desktop",
      },
    ],
    items: [
      { id: "a1", text: "Hero + tagline อ่านเข้าใจภายใน 10 วิ" },
      { id: "a2", text: "แท็บ Projects/Area/ดีไซเนอร์/สตูดิโอ สลับ smooth" },
      { id: "a3", text: "Area — แท็บติดตาม/สำรวจ, filter tag, empty state ไทย" },
      { id: "a4", text: "การ์ดผลงาน — รูป, ชื่อ, หมวด, engagement ชัด" },
      { id: "a5", text: "Design Drill (/drill) — วัตถุประสงค์ชัด vs portfolio ปกติ" },
      { id: "a6", text: "Feed mode จำค่า refresh · กด Home reset เป็น projects" },
      { id: "a7", text: "Explore / หมวดหมู่ — นำทางกลับฟีดได้" },
    ],
  },
  {
    id: "B",
    title: "โปรไฟล์ & ผลงาน public",
    paths: "/u/:id, /@username, /project/:id, /similar/:id, /?preview=1",
    account: "บัญชีที่มีผลงาน หรือ guest",
    steps: [
      "เปิดโปรไฟล์ public จากฟีด",
      "สลับแท็บ ผลงาน / Area / Design Drill / คอลเลกชัน / เกี่ยวกับ",
      "เปิดรายละเอียดผลงาน /project/:id",
      "ลอง visitor preview (?preview=1) บนโปรไฟล์ตัวเอง",
    ],
    uxCriteria: [
      "โปรไฟล์บอกว่าคนนี้ทำอะไรได้",
      "แท็บ pill layout ใช้ได้บน mobile",
      "หน้ารายละเอียดผลงาน — CTA จ้าง/คอลแลป/สนับสนุน ไม่แออัด",
    ],
    success: "ประเมินครีเอเตอร์และตัดสินใจติดต่อได้จากหน้าเดียว",
    screenshots: [
      {
        src: "/research/screenshots/b-profile-desktop.webp",
        alt: "โปรไฟล์ public บนเดสก์ท็อป",
        caption: "ดู avatar, bio, แท็บ section (ผลงาน/Area/Drill) และ CTA จ้าง/คอลแลป/สนับสนุน",
        viewport: "desktop",
      },
    ],
    items: [
      { id: "b1", text: "โปรไฟล์ — avatar, bio, skills, แท็บ section" },
      { id: "b2", text: "แท็บ Area — community post grid" },
      { id: "b3", text: "แท็บ Design Drill + คอลเลกชัน + เกี่ยวกับ" },
      { id: "b4", text: "Visitor preview — CTA แสดง preview toast" },
      { id: "b5", text: "ปุ่มติดตาม / แชร์ / รายงาน อยู่ตำแหน่งเหมาะสม" },
      { id: "b6", text: "Project detail — gallery, tools, stats, side panel" },
      { id: "b7", text: "+1 + คอมเมนต์ (guest → auth prompt)" },
      { id: "b8", text: "Similar images — ค้นหาผลงานใกล้เคียงได้" },
    ],
  },
  {
    id: "C",
    title: "Auth & Session",
    paths: "/auth, /auth/callback",
    account: "สมัครบัญชีใหม่",
    steps: [
      "Guest กด action ที่ต้อง login",
      "สมัครด้วยอีเมล+รหัสผ่าน หรือ Google",
      "ยืนยันอีเมลจาก inbox",
      "Login กลับ → redirect หน้าเดิม, logout แล้ว refresh",
    ],
    uxCriteria: [
      "Signup consent ชัด (ข้อกำหนด, ความเป็นส่วนตัว, อายุ)",
      "หน้ายืนยันอีเมลอธิบายชัดก่อนเข้าใช้งาน",
      "Error login/signup อ่านเข้าใจ",
    ],
    success: "สมัคร+ยืนยัน+login ไม่สับสน; รู้ว่า session หมดแล้วต้องทำอะไร",
    screenshots: [
      {
        src: "/research/screenshots/c-auth-signup-desktop.webp",
        alt: "หน้าสมัครสมาชิกบนเดสก์ท็อป",
        caption: "ดูแท็บสมัครสมาชิก — ฟอร์ม, consent checkboxes และข้อความ error/validation ภาษาไทย (ภาพจาก demo — แท็บสมัครอาจแสดงข้อความปิดการสมัครในโหมดทดสอบ)",
        viewport: "desktop",
      },
    ],
    items: [
      { id: "c1", text: "Auth dialog / หน้า /auth — CTA ชัด" },
      { id: "c2", text: "สมัคร — ฟอร์ม, validation, consent checkboxes" },
      { id: "c3", text: "ยืนยันอีเมล gate — resend + ออกจากระบบ" },
      { id: "c4", text: "Login ด้วย Google OAuth (ถ้าทดสอบ)" },
      { id: "c5", text: "Redirect กลับหน้าเดิมหลัง login (?redirect=)" },
      { id: "c6", text: "Logout แล้ว refresh ยัง logged out" },
    ],
  },
  {
    id: "D",
    title: "Onboarding & Welcome PX",
    paths: "/portfolio (Welcome checklist)",
    account: "บัญชีที่เพิ่งสมัคร",
    steps: [
      "Login ครั้งแรก → ดู checklist 8 ภารกิจ",
      "ทำภารกิจง่าย (+1, สำรวจฟีด, Area, jobs)",
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
    paths: "/portfolio, /portfolio/manage, /portfolio/saved",
    account: "บัญชีครีเอเตอร์",
    steps: [
      "ดูโปรไฟล์ของตัวเอง /portfolio",
      "ไป /portfolio/manage — แท็บ hiring / collab",
      "เปิด /portfolio/saved — โพสต์ที่บันทึก",
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
      { id: "e4", text: "Saved posts (/portfolio/saved)" },
      { id: "e5", text: "แชร์ลิงก์ @username" },
      { id: "e6", text: "ลิงก์ไป settings / earnings" },
    ],
  },
  {
    id: "F",
    title: "Project editor",
    paths: "/portfolio/new, /portfolio/:id/edit",
    account: "บัญชีครีเอเตอร์",
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
    account: "ผู้สำรวจ/จ้างงาน",
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
    screenshots: [
      {
        src: "/research/screenshots/g-jobs-desktop.webp",
        alt: "หน้า Jobs บนเดสก์ท็อป",
        caption: "ดูรายการงาน, filter/tab และการ์ดงาน — บทบาท งบ และสถานะอ่านเร็วไหม",
        viewport: "desktop",
      },
    ],
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
    account: "2 บัญชี — ส่ง (hirer) + รับ (creator)",
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
    title: "Chat v2",
    paths: "/chat, /chat/:id, /chat?studio=:id",
    account: "2 บัญชี — คุยกันจริง",
    steps: [
      "เปิด inbox — filter ทั้งหมด/งานจ้าง/คอลแลป/กลุ่ม, ค้นหา, pin",
      "เปิด thread — ส่งข้อความ, reply, แนบรูป, ส่งการ์ดผลงาน",
      "Desktop: partner/meta panel · Mobile: Info slide-over",
      "ลอง So1o quote handoff จาก hire thread",
    ],
    uxCriteria: [
      "Hire/collab/group badge สีแยก scan เร็ว",
      "Reply bar + read receipt ชัด",
      "Mobile — keyboard, safe-area, bottom nav ซ่อนใน thread",
    ],
    success: "คุยต่อจากคำขอจ้าง/งานได้ลื่น — context ครบใน panel",
    
    items: [
      { id: "i1", text: "Inbox — filter tabs, search, pin/unpin" },
      { id: "i2", text: "Badge unread บน FloatingNav" },
      { id: "i3", text: "Thread — ส่ง/รับ, quick-reply chips" },
      { id: "i4", text: "Reply + quote scroll, unsend 24h" },
      { id: "i5", text: "แนบรูป + ส่งการ์ดผลงาน" },
      { id: "i6", text: "Partner panel — โปรไฟล์, ผลงาน, job meta" },
      { id: "i7", text: "So1o quote / studio quote handoff" },
      { id: "i8", text: "Group + studio chat — แยกจาก 1:1" },
      { id: "i9", text: "Report user/message, profanity warning" },
      { id: "i10", text: "Empty inbox / search empty state" },
    ],
  },
  {
    id: "J",
    title: "Notifications",
    paths: "/notifications",
    account: "บัญชี login",
    steps: [
      "เปิด /notifications",
      "Mark read / กดลิงก์ไปหน้าที่เกี่ยวข้อง",
      "Badge บน FloatingNav",
    ],
    uxCriteria: [
      "ประเภทแจ้งเตือนแยกอ่านได้ (จ้าง, +1, แชท)",
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
    account: "บัญชีที่มี engagement",
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
    title: "Gifting, PX, Earnings & Referrals",
    paths: "SupportButton, /earnings, /referrals",
    account: "2 บัญชี (ส่ง PX) หรือบัญชีเดียว",
    steps: [
      "เปิดผลงาน → ส่ง PX/ของขวัญ",
      "ดู DonationModal — welcome_px vs earned",
      "เปิด /earnings ดูยอด",
      "เปิด /referrals — copy/share link",
    ],
    uxCriteria: [
      "PX ไม่สับสนกับเงินบาท",
      "Referral ไม่สับสนกับ cash earnings",
    ],
    success: "เข้าใจระบบ PX, สนับสนุนครีเอเตอร์, referral ได้",
    items: [
      { id: "l1", text: "SupportButton บน project" },
      { id: "l2", text: "DonationModal — จำนวน, ยอดคงเหลือ" },
      { id: "l3", text: "Success feedback หลังส่ง" },
      { id: "l4", text: "/earnings — balance breakdown" },
      { id: "l5", text: "Cashout flow — ดูได้ อย่าถอนจริง" },
      { id: "l6", text: "/referrals — copy/share link, signup reward PX" },
    ],
  },
  {
    id: "M",
    title: "Studio",
    paths: "/s/:slug, /studio/new, /studio/new?invite=:userId, /studio/manage, /studio/invites",
    account: "บัญชีครีเอเตอร์",
    steps: [
      "เปิด /s/doi-studio (public) หรือสตูดิโออื่น",
      "สร้างสตูดิโอ — ชื่อ, slug check, logo, เชิญสมาชิก",
      "ลอง invite จากแชท (?invite=)",
    ],
    uxCriteria: [
      "Studio profile ต่างจาก personal profile",
      "Name/slug availability feedback ก่อน submit",
    ],
    success: "เข้าใจว่าสตูดิโอคือทีม/แบรนด์ ไม่ใช่บุคคล",
    screenshots: [
      {
        src: "/research/screenshots/m-studio-desktop.webp",
        alt: "หน้าสตูดิโอ public บนเดสก์ท็อป",
        caption: "ดูโปรไฟล์สตูดิโอ — สมาชิก, ผลงานร่วม และความต่างจากโปรไฟล์บุคคล",
        viewport: "desktop",
      },
    ],
    items: [
      { id: "m1", text: "Studio public page /s/:slug" },
      { id: "m2", text: "สมาชิก + ผลงานร่วม" },
      { id: "m3", text: "/studio/new — สร้าง + slug live-check" },
      { id: "m4", text: "เชิญสมาชิก + prefill ?invite=" },
      { id: "m5", text: "/studio/manage + /studio/invites" },
      { id: "m6", text: "Studio chat + combined quote" },
    ],
  },
  {
    id: "N",
    title: "Contracts",
    paths: "/contracts, /contracts/new",
    account: "บัญชี login",
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
    account: "บัญชี login",
    steps: [
      "เปิด /settings — profile, skills, การแสดงผล",
      "ปรับธีม, grid density, Area layout",
      "ตั้ง @username — ทดสอบ validation ชื่อซ้ำ/สงวน",
      "เปิด /verify — ดู flow KYC (อย่าส่งจริง)",
    ],
    uxCriteria: [
      "Settings จัดกลุ่ม logical",
      "Display prefs sync กับ profile menu",
    ],
    success: "ปรับโปรไฟล์ การแสดงผล และการแจ้งเตือนได้โดยไม่หลง",
    
    items: [
      { id: "o1", text: "Profile edit — avatar, bio, skills" },
      { id: "o2", text: "การแสดงผล — ธีม, grid, Area layout" },
      { id: "o3", text: "@username live validation" },
      { id: "o4", text: "Email notification toggles" },
      { id: "o5", text: "ลิงก์ /me/reports, /me/feedback, /legal/community" },
      { id: "o6", text: "/verify — identity flow (ดูอย่างเดียว)" },
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
    success: "เข้าใจว่า upgrade ได้อะไรเพิ่ม — อย่าชำระเงินจริง",
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
      "รายงานผลงาน/โปรไฟล์/คอมเมนต์/แชท",
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
    paths: "/legal/privacy, /terms, /cookies, /rights, /legal/ip, /legal/community",
    account: "Guest",
    steps: [
      "เปิด legal pages จาก footer",
      "อ่าน /legal/ip — attestation",
      "อ่าน /legal/community — กฎชุมชน",
      "Cookie consent banner",
    ],
    uxCriteria: [
      "Legal ภาษาไทยอ่านได้ ไม่ wall of text เกิน",
      "IP + community rules สอดคล้อง editor/chat warnings",
    ],
    success: "ผู้ใช้ใหม่รู้สิทธิ/หน้าที่ก่อนเผยแพร่ผลงาน",
    items: [
      { id: "r1", text: "/legal/privacy" },
      { id: "r2", text: "/legal/terms" },
      { id: "r3", text: "/legal/cookies + banner" },
      { id: "r4", text: "/legal/rights — PDPA" },
      { id: "r5", text: "/legal/ip — attestation text" },
      { id: "r6", text: "/legal/community — กฎชุมชน" },
    ],
  },
  {
    id: "S",
    title: "Assistant & Help",
    paths: "AnthemAssistantFab, /research",
    account: "Guest + login",
    steps: [
      "กด Assistant FAB ถามคำถาม",
      "เปิด /research (หน้านี้)",
      "โหลด PDF checklist",
    ],
    uxCriteria: [
      "Assistant ช่วยได้จริง ไม่ hallucinate แรง",
      "คู่มือ research ครบและอัปเดต",
    ],
    success: "หาความช่วยเหลือได้เมื่อติด",
    items: [
      { id: "s1", text: "AnthemAssistantFab — เปิด/ปิด" },
      { id: "s2", text: "คำตอบ assistant เป็นภาษาไทย" },
      { id: "s3", text: "/research — คู่มือครบ" },
      { id: "s4", text: "PDF checklist โหลดได้" },
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
  {
    id: "U",
    title: "Community & Area",
    paths: "/?mode=community, /community, /community/:id, /community/new, /community/:id/edit",
    account: "Guest + บัญชีครีเอเตอร์",
    steps: [
      "Guest เปิด Area feed และโพสต์ detail",
      "Login — like, comment, save, report",
      "สร้างโพสต์: caption, media, หมวด, @mention",
      "Publish → โผล่ใน Area feed + profile Area tab",
    ],
    uxCriteria: [
      "Editor ใช้ได้บน mobile",
      "Rate limit / profanity / moderation banner ภาษาไทย",
    ],
    success: "อ่านและโพสต์ใน Area ได้โดยไม่สับสนกับ Projects feed",
    screenshots: [
      {
        src: "/research/screenshots/u-area-mobile.webp",
        alt: "Area feed บนมือถือ",
        caption: "ดู Area feed บนมือถือ — แยกจาก Projects ชัดไหม, engagement actions และ infinite scroll",
        viewport: "mobile",
      },
    ],
    items: [
      { id: "u1", text: "Area feed — infinite scroll, engagement actions" },
      { id: "u2", text: "Community post detail — like/comment/save/report" },
      { id: "u3", text: "/community/new — editor, media, crop/reorder" },
      { id: "u4", text: "Draft autosave + publish feedback" },
      { id: "u5", text: "Profanity hint + moderation ban banner" },
      { id: "u6", text: "โพสต์โผล่ใน profile Area tab" },
    ],
  },
  {
    id: "V",
    title: "Theme & Display preferences",
    paths: "Profile menu, /settings → การแสดงผล",
    account: "บัญชี login",
    steps: [
      "ตั้งธีม สว่าง/มืด/ตามระบบ — จาก profile menu และ settings",
      "ตั้ง grid ผลงาน (desktop 3/5/7, mobile 1/2)",
      "ตั้ง Area layout (ฟีด vs กริด)",
      "Refresh — ค่าจำอยู่",
    ],
    uxCriteria: [
      "ไม่ flash ธีมผิดตอนโหลด",
      "Dark mode contrast อ่านง่าย",
      "Prefs sync ระหว่าง profile menu ↔ settings",
    ],
    success: "ปรับการแสดงผลได้ตามชอบและจำค่าได้",
    items: [
      { id: "v1", text: "Theme สว่าง / มืด / ตามระบบ" },
      { id: "v2", text: "Theme transition smooth (reduce motion)" },
      { id: "v3", text: "Project grid density — desktop + mobile" },
      { id: "v4", text: "Area feed layout — ฟีด vs กริด" },
      { id: "v5", text: "ค่า persist หลัง refresh" },
    ],
  },
  {
    id: "W",
    title: "Navigation shell (FloatingNav)",
    paths: "Global mobile/tablet, ซ่อนใน /chat/:id",
    account: "Guest + login",
    steps: [
      "375px: FloatingNav pill — Home, Area, Jobs, Chat, กระดิ่ง, โปรไฟล์",
      "ปุ่ม + FAB — ลงผลงาน / โพสชุมชน",
      "Profile menu — shortcuts + display prefs",
      "Guest กด Chat → auth",
    ],
    uxCriteria: [
      "Pill + FAB ไม่บังเนื้อหา",
      "Active tab ชัด, chat badge แยกจาก notification bell",
    ],
    success: "นำทางหลักบน mobile ไม่หลง",
    screenshots: [
      {
        src: "/research/screenshots/w-nav-mobile.webp",
        alt: "FloatingNav บนมือถือ",
        caption: "ดู pill navigation ด้านล่าง — Home, Area, Jobs, Chat, กระดิ่ง, โปรไฟล์ และปุ่ม + FAB",
        viewport: "mobile",
      },
    ],
    items: [
      { id: "w1", text: "FloatingNav pill + labels" },
      { id: "w2", text: "Home vs Area distinction" },
      { id: "w3", text: "+ FAB → CreateContentDrawer" },
      { id: "w4", text: "Profile menu dropdown + quick prefs" },
      { id: "w5", text: "Chat unread badge บน nav" },
      { id: "w6", text: "Bottom nav ซ่อนใน chat thread" },
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
      "สลับ Projects / Area / ดีไซเนอร์ / สตูดิโอ",
      "เปิดโปรไฟล์และผลงาน 2–3 รายการ",
    ],
    success: "เข้าใจว่าฟีดช่วยค้นหาและประเมินครีเอเตอร์ได้เร็วแค่ไหน",
    interviewQuestions: [
      "ภายใน 10 วินาที เข้าใจว่าเว็บนี้ทำอะไรไหม?",
      "Home vs Area สับสนไหม?",
    ],
  },
  {
    id: "T2",
    title: "สมัคร + Onboarding + Welcome PX",
    persona: "บัญชีที่เพิ่งสมัคร",
    steps: [
      "สมัครที่ /auth และยืนยันอีเมล",
      "ไป /portfolio ดู Welcome checklist",
      "ทำ 2–3 ภารกิจและกดรับ PX",
    ],
    success: "รู้ว่าหลังสมัคร+ยืนยันอีเมล ทำอะไรต่อได้ทันที และเข้าใจ PX",
    interviewQuestions: [
      "ยืนยันอีเมลชัดไหม — ติดตรงไหน?",
      "PX คืออะไรในความเข้าใจคุณ?",
    ],
  },
  {
    id: "T3",
    title: "สร้างและเผยแพร่ผลงาน + attestation",
    persona: "บัญชีครีเอเตอร์",
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
    persona: "2 บัญชี — hirer ส่ง + creator รับ",
    steps: [
      "เปิดผลงานจากฟีด",
      "กดจ้างงาน — สังเกตฟอร์ม",
      "กดขอคอลแลป — เปรียบเทียบ",
      "ผู้รับดูใน portfolio/manage",
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
    persona: "ผู้สำรวจ/จ้างงาน",
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
    persona: "2 บัญชีคุยกัน",
    steps: [
      "เปิด /chat — filter, search, pin",
      "ส่งข้อความ + reply ใน thread",
      "เปิด /notifications ดูรายการ",
    ],
    success: "ติดตามการสนทนาและเหตุการณ์ใหม่ได้",
    interviewQuestions: [
      "Inbox หาห้องที่ต้องการง่ายไหม?",
      "Partner panel ช่วยไหม?",
    ],
  },
  {
    id: "T7",
    title: "ส่ง PX และคอลเลกชัน",
    persona: "2 บัญชี (หรือดูตัวเอง)",
    steps: [
      "เปิดผลงาน → ส่ง PX",
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
  {
    id: "T9",
    title: "Area discovery & โพสต์แรก",
    persona: "บัญชีครีเอเตอร์",
    steps: [
      "เปิด Area tab — อ่านโพสต์ 2–3 รายการ",
      "สร้างโพสต์สั้น /community/new",
      "หาโพสต์ใน profile Area tab",
    ],
    success: "เข้าใจ Area และโพสต์ได้โดยไม่สับสนกับ Projects",
    interviewQuestions: [
      "Area ต่างจาก Projects ชัดไหม?",
      "Editor โพสต์ใช้ง่ายบน mobile ไหม?",
    ],
  },
  {
    id: "T10",
    title: "แชท hire end-to-end",
    persona: "2 บัญชี — hire thread",
    steps: [
      "เปิด hire thread จากคำขอจ้าง",
      "Reply + แนบรูป + ดู partner panel",
      "ลอง So1o quote handoff (ดู prefilled)",
    ],
    success: "แชท hire มี context ครบและ handoff So1o เข้าใจได้",
    interviewQuestions: [
      "รู้ไหมว่ากำลังออกไป So1o?",
      "Job meta ใน panel อ่านง่ายไหม?",
    ],
  },
  {
    id: "T11",
    title: "Display preferences",
    persona: "ทุก persona",
    steps: [
      "เปลี่ยนธีม สว่าง/มืด",
      "เปลี่ยน grid density + Area layout",
      "ตรวจ feed, chat, settings สอดคล้องกัน",
    ],
    success: "การตั้งค่าการแสดงผลมีประโยชน์และจำค่าได้",
    interviewQuestions: [
      "Dark mode อ่านง่ายไหม?",
      "หา prefs ได้จากไหน — profile menu หรือ settings?",
    ],
  },
];

export const PAGE_MAP: PageMapGroup[] = [
  {
    group: "Public",
    pages: [
      { path: "/", label: "ฟีดหลัก (Projects)" },
      { path: "/?mode=community", label: "Area / ชุมชน" },
      { path: "/drill", label: "Design Drill" },
      { path: "/jobs", label: "งาน" },
      { path: "/community", label: "Community feed (legacy route)" },
      { path: "/community/:id", label: "รายละเอียดโพสต์ชุมชน" },
      { path: "/advertise", label: "ลงโฆษณา" },
      { path: "/upgrade", label: "อัปเกรด" },
      { path: "/research", label: "คู่มือ UX (หน้านี้)" },
      { path: "/research/feedback", label: "ส่งผลการทดสอบ" },
      { path: "/s/doi-studio", label: "สตูดิโอตัวอย่าง" },
      { path: "/project/:id", label: "รายละเอียดผลงาน" },
      { path: "/u/:id", label: "โปรไฟล์ public" },
    ],
  },
  {
    group: "Auth",
    pages: [
      { path: "/auth", label: "เข้าสู่ระบบ / สมัคร" },
      { path: "/auth/callback", label: "OAuth callback" },
    ],
  },
  {
    group: "Creator (login)",
    pages: [
      { path: "/portfolio", label: "พอร์ตโฟลิโอของฉัน", auth: true },
      { path: "/portfolio/manage", label: "จัดการคำขอจ้าง/คอลแลป", auth: true },
      { path: "/portfolio/saved", label: "โพสต์ที่บันทึก", auth: true },
      { path: "/portfolio/new", label: "สร้างผลงาน", auth: true },
      { path: "/community/new", label: "โพสต์ชุมชน", auth: true },
      { path: "/earnings", label: "รายได้ / PX", auth: true },
      { path: "/referrals", label: "ชวนเพื่อนรับ PX", auth: true },
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
      { path: "/legal/community", label: "กฎชุมชน" },
    ],
  },
];

export const FEEDBACK_TEMPLATE = {
  fields: [
    "ชื่อ reviewer",
    "Persona ที่เล่น",
    "Task (T1–T11 หรือ section A–W)",
    "Severity (blocker / major / minor / suggestion)",
    "หน้าที่เจอ (path + viewport)",
    "Screenshot",
    "ข้อเสนอ / ความรู้สึก",
  ],
  prompts: [
    "ภาษาไทยอ่านง่ายไหม — คำศัพท์ tech/ฟรีแลนซ์",
    "คอนเซปต์ \"ทุกคนคือ 1 PX\" สื่อสารได้หรือยัง",
    "สมัคร+ยืนยันอีเมล รู้ next step หลัง login ไหม",
    "Home vs Area สับสนไหม",
    "แชทใหม่ (3-panel, reply, partner panel) ใช้ลื่นไหม",
    "ธีม + grid prefs มีประโยชน์/สับสนไหม",
    "Mobile vs Desktop — จุดที่ใช้ยากที่สุด",
    "ความต่าง Aplus1 vs So1o — เข้าใจไหม",
  ],
};

export const OUT_OF_SCOPE = [
  "การชำระเงิน / Stripe checkout จริง",
  "ถอนเงิน / KYC จริง (ดู flow ได้ อย่าส่งเอกสารจริง)",
  "KYC/AML admin flows",
  "Admin panel (/admin) — staff only",
  "So1o back-office (ยกเว้น handoff ใบเสนอราคา)",
  "Ops Hub",
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
