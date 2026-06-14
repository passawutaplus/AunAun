export type TrackingStatus = "done" | "partial" | "planned";

export type TrackingFeature = {
  name: string;
  description: string;
  percent: number;
  status: TrackingStatus;
  done: string[];
  improve: string[];
};

export type TrackingCategory = {
  id: string;
  title: string;
  summary: string;
  features: TrackingFeature[];
};

export type TrackingSite = {
  id: "so1o" | "an1hem" | "ops_hub";
  name: string;
  url: string;
  tagline: string;
  overallPercent: number;
  tech: string;
  categories: TrackingCategory[];
};

const STATUS_LABEL: Record<TrackingStatus, string> = {
  done: "ใช้งานได้แล้ว",
  partial: "ทำบางส่วน",
  planned: "วางแผนไว้",
};

export function statusLabel(s: TrackingStatus) {
  return STATUS_LABEL[s];
}

export function percentColor(p: number) {
  if (p >= 85) return "text-emerald-600";
  if (p >= 60) return "text-amber-600";
  return "text-red-600";
}

export function percentBarColor(p: number) {
  if (p >= 85) return "bg-emerald-500";
  if (p >= 60) return "bg-amber-500";
  return "bg-red-500";
}

export const ECOSYSTEM_SITES: TrackingSite[] = [
  {
    id: "so1o",
    name: "So1o",
    url: "https://www.solofreelancer.com",
    tagline: "โต๊ะทำงานฟรีแลนซ์ — ใบเสนอราคา งาน ภาษี CRM สำหรับครีเอทีฟไทย",
    overallPercent: 82,
    tech: "TanStack Start · React 19 · Supabase · Vercel SSR · Gemini AI · Stripe",
    categories: [
      {
        id: "so1o-desk",
        title: "โต๊ะทำงาน (My Desk)",
        summary: "ฟีเจอร์หลักที่ฟรีแลนซ์ใช้ทุกวัน",
        features: [
          {
            name: "Pipeline & ใบเสนอราคา",
            description: "คิวงาน Kanban สร้างใบเสนอราคา ใบแจ้งหนี้ ใบเสร็จ และติดตามงาน",
            percent: 92,
            status: "done",
            done: ["Pipeline Kanban", "Quotation / Invoice / Receipt", "Job Tracker", "ลิงก์ให้ลูกค้าดูงาน (/track)"],
            improve: ["เชื่อมชำระเงินจากลูกค้าโดยตรง (PromptPay/Stripe)", "แจ้งเตือนอัตโนมัติเมื่อครบกำหนด"],
          },
          {
            name: "การเงิน & ภาษี",
            description: "บันทึกรายรับ-รายจ่าย คำนวณภาษี หัก ณ ที่จ่าย และ 50 ทวิ",
            percent: 90,
            status: "done",
            done: ["Income / Expense", "Tax simulator", "WHT & 50ทวิ", "ติดตาม SaaS subscription"],
            improve: ["ส่งออกไฟล์ให้นักบัญชีอัตโนมัติ", "เชื่อม Peak / FlowAccount"],
          },
          {
            name: "Smart Brief & แผนงาน",
            description: "รับบรีฟจากลูกค้า วางแผนโพสต์ และรอบ feedback",
            percent: 88,
            status: "done",
            done: ["Smart Brief + ลิงก์ให้ลูกค้ากรอก", "Content Planner", "Feedback rounds", "To Do / Work projects"],
            improve: ["AI สรุปบรีฟเป็น scope งานอัตโนมัติ"],
          },
          {
            name: "CRM & ข้อมูลลูกค้า",
            description: "เก็บลูกค้า ซัพพลายเออร์ แบรนด์ asset และ Legal Desk",
            percent: 86,
            status: "done",
            done: ["Clients CRM", "Suppliers", "Assets vault", "Legal Desk (สิทธิ์ใช้งาน/สัญญา)"],
            improve: ["Shared Squad — ทำงานเป็นทีม (DB พร้อม แต่ UI ยังปิด)"],
          },
        ],
      },
      {
        id: "so1o-public",
        title: "หน้าเว็บสาธารณะ",
        summary: "Landing, บล็อก, และลิงก์ให้ลูกค้าใช้งาน",
        features: [
          {
            name: "Landing & เครื่องคำนวณราคา",
            description: "หน้าแรก Fair Price calculator และ AI Mentor ช่วยตั้งราคา",
            percent: 90,
            status: "done",
            done: ["Landing page", "Fair Price calculator", "AI Mentor", "SEO sitemap"],
            improve: ["A/B test หน้า pricing"],
          },
          {
            name: "ลิงก์ให้ลูกค้า (Token pages)",
            description: "ลูกค้าเปิดลิงก์ดูงานโดยไม่ต้อง login",
            percent: 95,
            status: "done",
            done: ["/brief /track /planner /vision /supplier /license"],
            improve: ["Branding ลูกค้าแต่ละคน (white-label)"],
          },
          {
            name: "Creative Labs",
            description: "เครื่องมือครีเอทีฟเสริม",
            percent: 35,
            status: "partial",
            done: ["Color Lab (/labs) — ใช้งานได้"],
            improve: ["Vision board, Typography, Mockup, Grid — ยังไม่เปิด", "เติมเครดิต Creative Partner"],
          },
          {
            name: "แพ็กเกจ Pro & ชำระเงิน",
            description: "สมัคร Pro ผ่าน Stripe",
            percent: 65,
            status: "partial",
            done: ["Stripe webhook ทำงาน", "แสดงสถานะ subscription"],
            improve: ["หน้า Pricing บางแพ็กยัง Coming Soon", "In-House workspace ยังไม่เปิด"],
          },
        ],
      },
      {
        id: "so1o-admin",
        title: "Mission Control (Admin)",
        summary: "หน้าจัดการระบบ So1o — 20+ หมวด",
        features: [
          {
            name: "ภาพรวม & สมาชิก",
            description: "KPI สมาชิก กิจกรรม และ analytics",
            percent: 93,
            status: "done",
            done: ["Overview KPI", "Activity feed", "Users", "Feature usage", "Device analytics"],
            improve: ["แจ้งเตือน Slack/Email เมื่อมีเหตุการณ์สำคัญ"],
          },
          {
            name: "Support & Early Access",
            description: "ตั๋วช่วยเหลือ ฟีดแบ็ก beta และแชท",
            percent: 90,
            status: "done",
            done: ["Tickets + beta feedback", "Early Access อนุมัติ", "Admin chat"],
            improve: ["เชื่อมต่อ Ops Hub inbox แบบสองทาง"],
          },
          {
            name: "ธุรกิจ & AI",
            description: "Stripe, AI quota, บทความ, banners",
            percent: 88,
            status: "done",
            done: ["Payments/Stripe", "AI Center + HQ", "Articles CMS", "Banners", "Health check"],
            improve: ["รายงาน MRR รายเดือนอัตโนมัติ"],
          },
        ],
      },
      {
        id: "so1o-infra",
        title: "โครงสร้างระบบ",
        summary: "ฐานข้อมูลและ ecosystem",
        features: [
          {
            name: "ฐานข้อมูล Supabase",
            description: "public schema เป็นหลัก — กำลังแยก shared/anthem/so1o",
            percent: 70,
            status: "partial",
            done: ["111 migrations", "shared/anthem/so1o schema สร้างแล้ว", "RLS + Auth"],
            improve: ["ย้ายตาราง So1o จาก public → so1o schema", "E2E test ครบทุก flow"],
          },
        ],
      },
      {
        id: "so1o-monitoring",
        title: "Monitoring & Infra",
        summary: "Uptime, smoke, Stripe, AI, SEO — รวมศูนย์ที่ Ops Hub /monitor",
        features: [
          {
            name: "Health & smoke",
            description: "health-check.sh + smoke-public.sh บน production",
            percent: 85,
            status: "done",
            done: ["health-check.sh", "smoke-public CI", "Hub /monitor live probe"],
            improve: ["Cron health บน VPS", "UptimeRobot 3 URL"],
          },
          {
            name: "Supabase & Vercel usage",
            description: "Plan, DB/storage %, คำแนะนำอัปเกรด Pro",
            percent: 90,
            status: "done",
            done: ["ops-infra-monitor edge fn", "Ops Hub /monitor page"],
            improve: ["VERCEL_TOKEN สำหรับ billing API"],
          },
        ],
      },
    ],
  },
  {
    id: "an1hem",
    name: "an1hem",
    url: "https://an1hem.app",
    tagline: "ตลาดผลงานครีเอทีฟ — โชว์ผลงาน จ้างงาน แชท ของขวัญ Pixel",
    overallPercent: 78,
    tech: "React 18 · Vite · Supabase · Vercel · Edge Functions · Recharts",
    categories: [
      {
        id: "an1hem-showcase",
        title: "โชว์เคส & โซเชียล",
        summary: "ฟีด ผลงาน โปรไฟล์ และการมีส่วนร่วม",
        features: [
          {
            name: "ฟีด & ผลงาน",
            description: "Explore / For You / Following โพสต์ผลงาน ไลค์ คอมเมนต์",
            percent: 92,
            status: "done",
            done: ["Home feed", "Project CRUD + editor", "Project detail", "Explore by tag/tool", "Similar images (AI)"],
            improve: ["Algorithm แนะนำผลงานปรับตามพฤติกรรม"],
          },
          {
            name: "โปรไฟล์ & คอลเลกชัน",
            description: "หน้าโปรไฟล์สาธารณะ บอร์ดบันทึกผลงาน Inspire boards",
            percent: 90,
            status: "done",
            done: ["/u/:id, /@username", "Collections", "Inspire boards", "Follow"],
            improve: ["Analytics ให้ครีเอเตอร์ดูยอดวิวรายสัปดาห์"],
          },
          {
            name: "สตูดิโอ",
            description: "สร้างทีม ชวนสมาชิก หน้าสาธารณะ /s/:slug",
            percent: 82,
            status: "done",
            done: ["Studio create/manage", "Invites", "Public studio page"],
            improve: ["Admin ยังแก้/ลบ studio ไม่ได้ (read-only)"],
          },
        ],
      },
      {
        id: "an1hem-marketplace",
        title: "ตลาดงาน & จ้าง",
        summary: "จ้างงาน ร่วมงาน ประกาศงาน แชท",
        features: [
          {
            name: "จ้างงาน & ร่วมงาน",
            description: "ส่งคำขอจ้าง collab จากผลงานหรือโปรไฟล์",
            percent: 88,
            status: "done",
            done: ["Hire dialog", "Collab dialog", "Chat threads", "Notifications"],
            improve: ["Admin จัดการ hire/collab ยังดูอย่างเดียว", "Escrow ชำระเงินกลาง"],
          },
          {
            name: "งาน (Jobs board)",
            description: "ประกาศรับสมัคร สมัครงาน แจ้งเตือน match",
            percent: 85,
            status: "done",
            done: ["Job posts", "Applications", "job-match-dispatch edge fn"],
            improve: ["เชื่อม So1o pipeline เมื่อได้งาน"],
          },
          {
            name: "สัญญา AI",
            description: "สร้างสัญญาจ้างด้วย AI",
            percent: 78,
            status: "partial",
            done: ["Contract editor", "generate-contract edge fn"],
            improve: ["ลายเซ็นอิเล็กทรอนิกส์", "Admin แก้สัญญา"],
          },
        ],
      },
      {
        id: "an1hem-wallet",
        title: "กระเป๋า Pixel & การเงิน",
        summary: "ของขวัญ ถอนเงิน KYC AML",
        features: [
          {
            name: "Gifting (Pixel)",
            description: "ส่งของขวัญ PX ให้ครีเอเตอร์",
            percent: 80,
            status: "partial",
            done: ["Send/receive gifts", "Wallet balance", "AML guardrails (RPC)"],
            improve: ["ตั้ง payment_settings.mock_topup_enabled=false ก่อน production"],
          },
          {
            name: "ถอนเงิน & KYC",
            description: "ขอถอน Pixel ยืนยันตัวตน",
            percent: 75,
            status: "partial",
            done: ["Cashout request", "KYC flow", "Admin approve/reject"],
            improve: ["อัปโหลดเอกสาร KYC ยังไม่มี", "Stripe/Omise payout จริง"],
          },
          {
            name: "AML & ความปลอดภัย",
            description: "ตรวจจับพฤติกรรมเสี่ยง freeze บัญชี",
            percent: 88,
            status: "done",
            done: ["AML flags", "Freeze/unfreeze", "Gift limits config"],
            improve: ["รายงาน AML รายเดือนอัตโนมัติ"],
          },
        ],
      },
      {
        id: "an1hem-ads-mod",
        title: "โฆษณา & กลั่นกรอง",
        summary: "แคมเปญโฆษณา รายงานเนื้อหา ฟีดแบ็ก",
        features: [
          {
            name: "โฆษณา",
            description: "สมัครแคมเปญ ชำระเงิน แสดงในฟีด",
            percent: 82,
            status: "partial",
            done: ["Ad application", "Campaign management", "Admin approve"],
            improve: ["ชำระเงินโฆษณายัง mock"],
          },
          {
            name: "รายงาน & ฟีดแบ็ก",
            description: "รายงานเนื้อหาไม่เหมาะสม และ feedback จากผู้ใช้",
            percent: 90,
            status: "done",
            done: ["Report dialog + evidence", "Feedback FAB", "Admin moderation workflow"],
            improve: ["เชื่อม Ops Hub inbox อัตโนมัติ"],
          },
        ],
      },
      {
        id: "an1hem-admin",
        title: "Admin (27 หมวด)",
        summary: "หน้าจัดการ an1hem",
        features: [
          {
            name: "Dashboard & Analytics",
            description: "KPI กราฟ 14 วัน เหตุการณ์สด",
            percent: 90,
            status: "done",
            done: ["Overview", "Activity (platform_events)", "Analytics funnel"],
            improve: ["Session/page analytics ยังไม่ทำ", "System health → ดูที่ Ops Hub /monitor"],
          },
          {
            name: "จัดการเนื้อหา",
            description: "ผู้ใช้ ผลงาน คอมเมนต์ คอลเลกชัน",
            percent: 85,
            status: "done",
            done: ["Users (role/freeze)", "Projects (status/delete)", "Comments/Collections delete"],
            improve: ["Studios/Inspire — monitor อย่างเดียว"],
          },
          {
            name: "Wallet & Compliance",
            description: "กระเป๋า ของขวัญ ถอน KYC AML",
            percent: 88,
            status: "done",
            done: ["Wallet ledger", "Gifts + cashout approve", "KYC/AML admin"],
            improve: ["Stripe payout จริง"],
          },
        ],
      },
      {
        id: "an1hem-infra",
        title: "โครงสร้างระบบ",
        summary: "Schema และ types",
        features: [
          {
            name: "ฐานข้อมูล",
            description: "shared/anthem/public — types ยังไม่ sync กับ remote",
            percent: 55,
            status: "partial",
            done: ["53 migrations", "anthem schema บน remote", "Demo seed 50 users"],
            improve: ["Regen types.ts", "ย้ายตารางจาก public → anthem ให้ครบ", "Realtime ครบทุก schema"],
          },
        ],
      },
      {
        id: "an1hem-monitoring",
        title: "Monitoring & Infra",
        summary: "Moderation alerts, wallet queue, Supabase usage — Hub /monitor",
        features: [
          {
            name: "Ops Hub alerts",
            description: "Reports, cashout, KYC, AML, feedback ใน Overview",
            percent: 92,
            status: "done",
            done: ["Hub KPI + alert queue", "Deep links admin"],
            improve: ["Realtime platform_events ครบทุก trigger"],
          },
          {
            name: "Supabase Usage admin",
            description: "admin-supabase-usage + หน้า an1hem admin",
            percent: 95,
            status: "done",
            done: ["Edge function", "AdminSupabaseUsagePage", "รวมใน Ops Hub /monitor"],
            improve: ["Egress/MAU จาก dashboard billing"],
          },
        ],
      },
    ],
  },
  {
    id: "ops_hub",
    name: "Ops Hub",
    url: "https://hq.solofreelancer.com",
    tagline: "ศูนย์ควบคุมทีมดูแล — รวมคิวงาน KPI และ PM ภายใน",
    overallPercent: 80,
    tech: "React 18 · Vite · TanStack Query · Supabase multi-schema",
    categories: [
      {
        id: "ops-phase1",
        title: "Phase 1 — คิวงาน & ภาพรวม",
        summary: "รวมงานจาก So1o + an1hem ในที่เดียว",
        features: [
          {
            name: "ภาพรวม (Overview)",
            description: "KPI แยกหมวด กดลิงก์ไป Admin ได้ แจ้งเตือนด่วน",
            percent: 92,
            status: "done",
            done: ["KPI cards แยกหมวด So1o/an1hem", "Alert queue", "Deep links", "ภาษาไทย + คำอธิบาย"],
            improve: ["กราฟแนวโน้ม 7/30 วัน"],
          },
          {
            name: "กล่องขาเข้า & บอร์ด",
            description: "Triage งานใหม่ ลากการ์ดเปลี่ยนสถานะ",
            percent: 88,
            status: "done",
            done: ["Inbox (5 แหล่งข้อมูล)", "Kanban Board", "Filters", "Drawer แก้ status/note"],
            improve: ["Filter app_feedback ด้วย status (column พร้อมแล้ว)", "Bulk actions"],
          },
          {
            name: "Infra Monitor (/monitor)",
            description: "Health probe, Supabase/Vercel usage, คำแนะนำ Pro",
            percent: 95,
            status: "done",
            done: ["ops-infra-monitor", "เช็คลิสต์ต่อเว็บ", "Overview infra strip"],
            improve: ["Snapshot history รายวัน", "UptimeRobot API"],
          },
          {
            name: "รายการทั้งหมด",
            description: "ค้นหาและกรองงานทุกแหล่ง",
            percent: 90,
            status: "done",
            done: ["Issues list", "ค้นหา + กรองแหล่ง/สถานะ/ความสำคัญ"],
            improve: ["Export CSV"],
          },
          {
            name: "กิจกรรม",
            description: "platform_events timeline",
            percent: 75,
            status: "partial",
            done: ["Activity feed", "ตาราง platform_events สร้างแล้ว"],
            improve: ["ยังไม่มี event ถ้า trigger ยังไม่ติด", "Realtime live feed"],
          },
        ],
      },
      {
        id: "ops-phase2",
        title: "Phase 2 — PM ภายใน",
        summary: "งานทีม Sprint แผนงาน",
        features: [
          {
            name: "งานภายใน (Hub Work)",
            description: "สร้าง ops.issues หรือ promote จากคิว",
            percent: 78,
            status: "partial",
            done: ["ops schema + migration applied", "Create issue form", "ops_promote_work_item RPC"],
            improve: ["ต้อง login admin ถึงจะเห็นข้อมูล", "Comments UI ยังไม่มี"],
          },
          {
            name: "รอบงาน (Cycles)",
            description: "Sprint ปัจจุบัน นับงานตามสถานะ",
            percent: 75,
            status: "partial",
            done: ["Cycle 1 seed (Jun 2026)", "Status breakdown UI"],
            improve: ["สร้าง/แก้ cycle จาก UI", "ลาก issue เข้า cycle"],
          },
          {
            name: "แผนงาน (Roadmap)",
            description: "Timeline ตามไตรมาส + feature suggestions จาก So1o",
            percent: 72,
            status: "partial",
            done: ["ops.roadmap_items seed", "So1o planned suggestions แสดงได้"],
            improve: ["แก้ roadmap จาก UI", "ลิงก์ issue ↔ roadmap item"],
          },
        ],
      },
      {
        id: "ops-infra",
        title: "โครงสร้าง & การเชื่อมต่อ",
        summary: "DB routing และ deploy",
        features: [
          {
            name: "Multi-schema client",
            description: "public / anthem / shared / ops routing อัตโนมัติ",
            percent: 90,
            status: "done",
            done: ["db.ts proxy", "4 schema clients", "Admin RLS", "Health ใน /monitor"],
            improve: ["Settings page แยก"],
          },
          {
            name: "Migrations ล่าสุด",
            description: "schema gaps + ops PM + expose ops API",
            percent: 95,
            status: "done",
            done: [
              "app_feedback.status column",
              "platform_events table",
              "ops schema + seed",
              "db_schema expose ops",
            ],
            improve: ["เพิ่ม trigger platform_events อัตโนมัติ"],
          },
          {
            name: "Deploy",
            description: "Docker + nginx สำหรับ production",
            percent: 85,
            status: "done",
            done: ["Dockerfile", "nginx.conf", "hq.solofreelancer.com"],
            improve: ["CI/CD pipeline อัตโนมัติ"],
          },
        ],
      },
      {
        id: "ops-tracking",
        title: "ติดตามระบบ (หน้านี้)",
        summary: "บันทึกความคืบหน้าทุกเว็บใน ecosystem",
        features: [
          {
            name: "Ecosystem Tracker",
            description: "สรุปฟีเจอร์ % ความพร้อม และสิ่งที่พัฒนาต่อได้",
            percent: 100,
            status: "done",
            done: ["แยกเว็บ แยกหมวด", "คำอธิบายภาษาไทย", "% + สิ่งที่ทำแล้ว/พัฒนาต่อ"],
            improve: ["อัปเดตอัตโนมัติจาก git/DB", "ประวัติการเปลี่ยนแปลงตามวันที่"],
          },
        ],
      },
    ],
  },
];

export const TRACKING_UPDATED = "14 มิ.ย. 2026";
