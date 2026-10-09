import type { ComponentType } from "react";
import {
  Activity,
  Banknote,
  BarChart3,
  Bell,
  Bookmark,
  Bot,
  Building2,
  ClipboardList,
  Database,
  FileCheck,
  FileText,
  Flag,
  FolderKanban,
  Gift,
  HandshakeIcon,
  HardDrive,
  HeartHandshake,
  HeartPulse,
  Inbox,
  LayoutDashboard,
  Lightbulb,
  Map,
  Megaphone,
  MessageCircle,
  MessageSquare,
  MessageSquareHeart,
  Radio,
  Scale,
  ScrollText,
  Search,
  Settings,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Timer,
  TrendingUp,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import BriefcaseIcon from "@/components/icons/BriefcaseIcon";
import PackagesIcon from "@/components/icons/PackagesIcon";
import type { AdminAlertCounts } from "@/hooks/admin/useAdminAlerts";
import type { AdminStats } from "@/hooks/admin/useAdminData";
import { isAplus1LaunchMinimal } from "@/lib/aplus1Launch";
import { adminDbGapForPath } from "@/lib/admin/adminDbGaps";
import type { AdminTone } from "@/lib/admin/adminTone";

type IconComponent = LucideIcon | ComponentType<{ className?: string }>;

export type AdminStatKey = keyof AdminStats;

/** Work queues. Order here = order shown in "ต้องทำตอนนี้" (most urgent / most sensitive first). */
export const ADMIN_QUEUE_ORDER = ["kyc", "reports", "cashouts", "finance", "aml", "hiring", "collabs", "feedback"] as const;
export type AdminBadgeKey = (typeof ADMIN_QUEUE_ORDER)[number];

export type AdminNavItem = {
  to: string;
  label: string;
  /** One line: what you do on this page. */
  hint: string;
  icon: IconComponent;
  /** Exact match for NavLink (dashboard only). */
  end?: boolean;
  /** Pending-work counter shown as a pill and collected into the work queue. */
  badgeKey?: AdminBadgeKey;
  /** Small number on the overview shortcut card. */
  statKey?: AdminStatKey;
  statLabel?: string;
  /** Extra words for the Ctrl+K search (Thai + English synonyms). */
  keywords?: string[];
};

export type AdminNavGroup = {
  id: string;
  title: string;
  description: string;
  icon: IconComponent;
  tone: AdminTone;
  items: AdminNavItem[];
};

/** Single source of truth — sidebar, Ctrl+K search, overview shortcuts and the header breadcrumb all read this. */
export const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  {
    id: "home",
    title: "ภาพรวม",
    description: "ดูสถานะแพลตฟอร์มและกิจกรรมสด",
    icon: LayoutDashboard,
    tone: "slate",
    items: [
      { to: "/admin", label: "แดชบอร์ด", hint: "งานค้าง ตัวเลขวันนี้ และกราฟ 14 วัน", icon: LayoutDashboard, end: true, keywords: ["home", "dashboard", "หน้าแรก", "ภาพรวม"] },
      { to: "/admin/activity", label: "กิจกรรมสด", hint: "เหตุการณ์ล่าสุดทั้งเว็บแบบเรียลไทม์", icon: Radio, keywords: ["live", "feed", "realtime", "ล่าสุด"] },
    ],
  },
  {
    id: "people",
    title: "ผู้ใช้ & ตัวตน",
    description: "บัญชี การยืนยันตัวตน และองค์กรที่จ้างงาน",
    icon: Users,
    tone: "sky",
    items: [
      { to: "/admin/users", label: "ผู้ใช้", hint: "ค้นหา ดูโปรไฟล์ และจัดการบัญชี", icon: Users, statKey: "totalUsers", statLabel: "ทั้งหมด", keywords: ["user", "สมาชิก", "โปรไฟล์", "บัญชี", "profile"] },
      { to: "/admin/kyc", label: "ยืนยันตัวตน (KYC)", hint: "ตรวจบัตร/เซลฟี่/สมุดบัญชี อนุมัติหรือปฏิเสธ", icon: ShieldCheck, badgeKey: "kyc", statKey: "pendingKyc", statLabel: "รอตรวจ", keywords: ["kyc", "บัตรประชาชน", "selfie", "verify", "ยืนยัน"] },
      { to: "/admin/employer-orgs", label: "องค์กรจ้างงาน", hint: "ตรวจนิติบุคคลก่อนให้ลงประกาศ", icon: Building2, keywords: ["org", "บริษัท", "นิติบุคคล", "employer"] },
      { to: "/admin/studios", label: "สตูดิโอ (เลิกใช้)", hint: "พื้นที่ Studio ปิดรับแล้ว — ดูข้อมูลเก่า", icon: Building2, statKey: "totalStudios", statLabel: "สตูดิโอ", keywords: ["studio", "ทีม"] },
    ],
  },
  {
    id: "content",
    title: "ผลงาน & ชุมชน",
    description: "ผลงาน แพ็กเกจ คอมเมนต์ ฟอรัม และแชต",
    icon: FolderKanban,
    tone: "violet",
    items: [
      { to: "/admin/projects", label: "ผลงาน", hint: "ซ่อน/ลบผลงาน ดูยอดวิวและ +1", icon: FolderKanban, statKey: "publishedProjects", statLabel: "เผยแพร่", keywords: ["project", "portfolio", "พอร์ต", "งาน"] },
      { to: "/admin/packages", label: "แพ็กเกจบริการ", hint: "บริการที่ครีเอเตอร์เปิดขาย", icon: PackagesIcon, statKey: "totalPackages", statLabel: "แพ็กเกจ", keywords: ["package", "service", "บริการ"] },
      { to: "/admin/collections", label: "คอลเลกชัน", hint: "คอลเลกชันที่ผู้ใช้สร้าง", icon: Bookmark, statKey: "totalCollections", statLabel: "คอลเลกชัน", keywords: ["collection", "เซฟ"] },
      { to: "/admin/inspire", label: "Inspire", hint: "บอร์ดแรงบันดาลใจ", icon: Sparkles, keywords: ["inspire", "board", "บอร์ด"] },
      { to: "/admin/forum", label: "ฟอรัม", hint: "กระทู้ ประกาศ และหมวดหมู่", icon: MessageSquareHeart, keywords: ["forum", "กระทู้", "webboard"] },
      { to: "/admin/comments", label: "คอมเมนต์", hint: "ความคิดเห็นบนผลงาน", icon: MessageCircle, statKey: "comments24h", statLabel: "24 ชม.", keywords: ["comment"] },
      { to: "/admin/chats", label: "แชต", hint: "ดูบทสนทนาเมื่อมีรายงาน", icon: MessageSquare, statKey: "messages24h", statLabel: "ข้อความ 24 ชม.", keywords: ["chat", "message", "ข้อความ"] },
      { to: "/admin/notifications", label: "แจ้งเตือน", hint: "แจ้งเตือนในระบบและ push", icon: Bell, keywords: ["notification", "push"] },
      { to: "/admin/community", label: "โพสต์ชุมชน (เลิกใช้)", hint: "Public Area ปิดแล้ว — ดูโพสต์เก่า", icon: MessageSquare, keywords: ["community", "area"] },
    ],
  },
  {
    id: "work",
    title: "งานจ้าง",
    description: "ประกาศงาน คำขอจ้าง คอลแลป และสัญญา",
    icon: BriefcaseIcon,
    tone: "emerald",
    items: [
      { to: "/admin/hiring", label: "คำขอจ้าง", hint: "ลูกค้าส่งคำขอจ้างครีเอเตอร์โดยตรง", icon: HandshakeIcon, badgeKey: "hiring", statKey: "pendingHiring", statLabel: "รอดำเนินการ", keywords: ["hire", "hiring", "จ้าง", "ลูกค้า"] },
      { to: "/admin/collabs", label: "คอลแลป", hint: "คำขอร่วมงานระหว่างครีเอเตอร์", icon: HeartHandshake, badgeKey: "collabs", statKey: "pendingCollabs", statLabel: "รอดำเนินการ", keywords: ["collab", "ร่วมงาน"] },
      { to: "/admin/jobs", label: "ประกาศงาน", hint: "งานที่เปิดรับสมัคร", icon: BriefcaseIcon, statKey: "openJobs", statLabel: "เปิดรับ", keywords: ["job", "งาน", "ประกาศ"] },
      { to: "/admin/applications", label: "ใบสมัครงาน", hint: "ใบสมัครจากครีเอเตอร์", icon: ClipboardList, keywords: ["application", "สมัคร"] },
      { to: "/admin/contracts", label: "สัญญา", hint: "ข้อตกลงและเอกสารจ้างงาน", icon: FileText, keywords: ["contract", "เอกสาร"] },
    ],
  },
  {
    id: "money",
    title: "การเงิน",
    description: "ออเดอร์จ้าง การจ่ายเงิน กระเป๋า และของขวัญ",
    icon: Wallet,
    tone: "amber",
    items: [
      { to: "/admin/finance", label: "การเงิน (Omise)", hint: "เงินบาท: payout, webhook, ข้อพิพาท, ค่าธรรมเนียม", icon: Banknote, badgeKey: "finance", keywords: ["omise", "payout", "จ่ายเงิน", "promptpay", "dispute", "fee"] },
      { to: "/admin/wallet", label: "กระเป๋า & ถอนเงิน", hint: "ยอด PX และคำขอถอนเงิน", icon: Wallet, badgeKey: "cashouts", statKey: "pendingCashouts", statLabel: "ถอนรออนุมัติ", keywords: ["wallet", "cashout", "ถอน", "px", "ledger"] },
      { to: "/admin/gifts", label: "ของขวัญ", hint: "การสนับสนุนครีเอเตอร์ และเพดาน", icon: Gift, statKey: "gifts24h", statLabel: "24 ชม.", keywords: ["gift", "tip"] },
      { to: "/admin/ads", label: "โฆษณา", hint: "แคมเปญและพื้นที่โปรโมต", icon: Megaphone, keywords: ["ads", "ad", "โปรโมต", "boost"] },
    ],
  },
  {
    id: "safety",
    title: "ความปลอดภัย & กฎ",
    description: "รายงานเนื้อหา มาตรการ AML และกฎหมาย",
    icon: Scale,
    tone: "rose",
    items: [
      { to: "/admin/reports", label: "รายงานเนื้อหา", hint: "ผู้ใช้แจ้งเนื้อหา/บัญชีที่ไม่เหมาะสม", icon: Flag, badgeKey: "reports", statKey: "openReports", statLabel: "เปิดอยู่", keywords: ["report", "แจ้ง", "ร้องเรียน"] },
      { to: "/admin/moderation", label: "มาตรการ (Moderation)", hint: "เตือน ระงับ แบน และประวัติ", icon: Shield, keywords: ["ban", "แบน", "ระงับ", "suspend", "moderation"] },
      { to: "/admin/aml", label: "AML / ฟอกเงิน", hint: "ธงความเสี่ยงทางการเงิน อายัดบัญชี", icon: ShieldAlert, badgeKey: "aml", statKey: "openAmlFlags", statLabel: "ธงเปิด", keywords: ["aml", "ฟอกเงิน", "risk"] },
      { to: "/admin/compliance", label: "กฎหมาย (PDPA / ลิขสิทธิ์)", hint: "คำขอข้อมูลส่วนตัวและแจ้งลบงานละเมิด", icon: FileCheck, keywords: ["pdpa", "privacy", "copyright", "ลิขสิทธิ์", "ข้อมูลส่วนตัว", "consent"] },
      { to: "/admin/feedback", label: "ฟีดแบ็กผู้ใช้", hint: "ข้อเสนอแนะและบั๊กจากผู้ใช้", icon: Inbox, badgeKey: "feedback", statKey: "openFeedback", statLabel: "ใหม่", keywords: ["feedback", "bug", "ข้อเสนอแนะ"] },
    ],
  },
  {
    id: "growth",
    title: "การเติบโต & ข้อมูล",
    description: "วิเคราะห์ผู้ใช้ ข้อมูลดิบ และการตลาด",
    icon: TrendingUp,
    tone: "cyan",
    items: [
      { to: "/admin/analytics", label: "Analytics", hint: "แนวโน้มและ conversion", icon: BarChart3, keywords: ["analytics", "สถิติ", "conversion"] },
      { to: "/admin/insights", label: "Insights ผลงาน", hint: "ผลงานหมวดไหนคนดูมาก/น้อย", icon: Lightbulb, keywords: ["insight"] },
      { to: "/admin/page-time", label: "เวลาบนหน้า", hint: "ผู้ใช้อยู่แต่ละหน้ากี่นาที", icon: Timer, keywords: ["dwell", "time", "นาที"] },
      { to: "/admin/data", label: "Data Hub", hint: "ข้อมูลดิบ + ส่งออก CSV/ZIP", icon: Database, keywords: ["export", "csv", "ดาวน์โหลด", "data"] },
      { to: "/admin/marketing", label: "Marketing", hint: "ลีด คู่แข่ง คอนเทนต์ และแผนโฆษณา", icon: Megaphone, keywords: ["marketing", "lead", "การตลาด"] },
      { to: "/admin/seo", label: "SEO", hint: "Sitemap, meta, การ index", icon: Search, keywords: ["seo", "sitemap", "google"] },
    ],
  },
  {
    id: "system",
    title: "ระบบ",
    description: "สุขภาพระบบ ค่าใช้จ่าย และบันทึกการใช้งาน",
    icon: Settings,
    tone: "indigo",
    items: [
      { to: "/admin/system", label: "สุขภาพระบบ", hint: "สถานะบริการและตัวแปรแวดล้อม", icon: HeartPulse, keywords: ["health", "status", "env", "system"] },
      { to: "/admin/storage", label: "Storage & ค่าใช้จ่าย", hint: "พื้นที่ไฟล์/ฐานข้อมูลเกินลิมิตไหม", icon: HardDrive, keywords: ["storage", "quota", "ค่าใช้จ่าย", "supabase", "disk"] },
      { to: "/admin/ai", label: "AI Monitor", hint: "การใช้งานและค่าใช้จ่าย AI", icon: Bot, keywords: ["ai", "credit", "token"] },
      { to: "/admin/audit", label: "บันทึกการใช้งาน", hint: "ใครทำอะไรในหลังบ้าน (audit trail)", icon: ScrollText, keywords: ["audit", "log", "ประวัติ"] },
      { to: "/admin/dev-tasks", label: "แผนพัฒนา", hint: "Backlog และงานที่กำลังทำ", icon: Map, keywords: ["roadmap", "task", "backlog"] },
    ],
  },
];

/* ---------- visibility ---------- */

/** Features the public app switches off in launch-minimal mode (VITE_APLUS1_FULL_PRODUCT unset): no admin page needed yet. */
export const ADMIN_LAUNCH_HIDDEN_ADMIN_PATHS = ["/admin/contracts", "/admin/ads"] as const;

/**
 * Retired product areas (public Area, Studio discovery). Not in the menu or overview any more;
 * still reachable by URL and Ctrl+K so old data can be cleaned up.
 */
export const ADMIN_RETIRED_ADMIN_PATHS = ["/admin/community", "/admin/studios"] as const;

function matchesPrefix(pathname: string, prefixes: readonly string[]): boolean {
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function isAdminLaunchHiddenPath(pathname: string): boolean {
  if (!isAplus1LaunchMinimal()) return false;
  if (pathname === "/admin" || pathname === "/admin/") return false;
  return matchesPrefix(pathname, ADMIN_LAUNCH_HIDDEN_ADMIN_PATHS);
}

export function isAdminRetiredPath(pathname: string): boolean {
  return matchesPrefix(pathname, ADMIN_RETIRED_ADMIN_PATHS);
}

function stripQuery(to: string): string {
  return to.split("?")[0];
}

/** Groups with the items that belong in the menu (no launch-hidden, no retired). Empty groups are dropped. */
export function adminNavGroups(): AdminNavGroup[] {
  return ADMIN_NAV_GROUPS.map((g) => ({
    ...g,
    items: g.items.filter((i) => !isAdminLaunchHiddenPath(stripQuery(i.to)) && !isAdminRetiredPath(stripQuery(i.to))),
  })).filter((g) => g.items.length > 0);
}

/** Back-compat name used by the sidebar. */
export const adminSidebarSections = adminNavGroups;

/* ---------- search + breadcrumb ---------- */

export type AdminSearchEntry = AdminNavItem & { groupId: string; groupTitle: string; groupTone: AdminTone; retired: boolean };

/** Everything Ctrl+K can open: menu items plus retired pages, minus pages the launch mode blocks. */
export function adminSearchEntries(): AdminSearchEntry[] {
  return ADMIN_NAV_GROUPS.flatMap((g) =>
    g.items
      .filter((i) => !isAdminLaunchHiddenPath(stripQuery(i.to)))
      .map((i) => ({ ...i, groupId: g.id, groupTitle: g.title, groupTone: g.tone, retired: isAdminRetiredPath(stripQuery(i.to)) })),
  );
}

/** Text a search matches against: label, hint, group and keywords. */
export function adminSearchHaystack(e: AdminSearchEntry): string {
  return [e.label, e.hint, e.groupTitle, ...(e.keywords ?? [])].join(" ").toLowerCase();
}

export type AdminPageMeta = { group: AdminNavGroup; item: AdminNavItem };

/** Which menu entry a URL belongs to (longest path wins, so /admin/marketing/leads → Marketing). */
export function adminPageMeta(pathname: string): AdminPageMeta | null {
  const path = pathname.split("?")[0].replace(/\/+$/, "") || "/";
  let best: (AdminPageMeta & { len: number }) | null = null;
  for (const group of ADMIN_NAV_GROUPS) {
    for (const item of group.items) {
      const to = stripQuery(item.to);
      const hit = item.end ? path === to : path === to || path.startsWith(`${to}/`);
      if (hit && (!best || to.length > best.len)) best = { group, item, len: to.length };
    }
  }
  return best ? { group: best.group, item: best.item } : null;
}

/* ---------- work queue ---------- */

export type AdminBadgeCounts = Record<AdminBadgeKey, number>;

/** The stat fields that can feed a work queue (the full AdminStats also works). */
export type AdminQueueStats = Partial<
  Pick<AdminStats, "pendingKyc" | "openReports" | "pendingCashouts" | "openAmlFlags" | "pendingHiring" | "pendingCollabs" | "openFeedback">
>;

/** Merge the live alert counters with extra stats into one count per queue. Missing data counts as 0. */
export function adminBadgeCounts(alerts: AdminAlertCounts | undefined, stats: AdminQueueStats | undefined): AdminBadgeCounts {
  const n = (v: number | undefined | null) => (typeof v === "number" && Number.isFinite(v) && v > 0 ? v : 0);
  return {
    kyc: n(alerts?.pendingKyc ?? stats?.pendingKyc),
    reports: n(alerts?.openReports ?? stats?.openReports),
    cashouts: n(alerts?.pendingCashouts ?? stats?.pendingCashouts),
    finance: n(alerts?.financePayoutQueue) + n(alerts?.financeWebhookIssues) + n(alerts?.openFinanceDisputes),
    aml: n(alerts?.openAml ?? stats?.openAmlFlags),
    hiring: n(stats?.pendingHiring),
    collabs: n(stats?.pendingCollabs),
    feedback: n(stats?.openFeedback),
  };
}

export type AdminQueueEntry = { key: AdminBadgeKey; item: AdminNavItem; group: AdminNavGroup; count: number };

/** Queues with work waiting, in ADMIN_QUEUE_ORDER, limited to pages that are visible in this build. */
export function adminQueueEntries(counts: AdminBadgeCounts): AdminQueueEntry[] {
  const visible = adminNavGroups();
  const out: AdminQueueEntry[] = [];
  for (const key of ADMIN_QUEUE_ORDER) {
    if (!counts[key]) continue;
    for (const group of visible) {
      const item = group.items.find((i) => i.badgeKey === key);
      if (item) {
        out.push({ key, item, group, count: counts[key] });
        break;
      }
    }
  }
  return out;
}

export function adminStatValue(stats: AdminStats | undefined, key?: AdminStatKey): number | undefined {
  if (!stats || !key) return undefined;
  return stats[key];
}

/** True when this page needs a table/function the database does not have yet. */
export function adminItemNeedsDb(item: AdminNavItem): boolean {
  return adminDbGapForPath(stripQuery(item.to)) !== null;
}
