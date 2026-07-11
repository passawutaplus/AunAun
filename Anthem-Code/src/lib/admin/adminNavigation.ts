import type { ComponentType } from "react";
import BriefcaseIcon from "@/components/icons/BriefcaseIcon";
import {
  Activity,
  BarChart3,
  Bell,
  Bookmark,
  Bot,
  Building2,
  ClipboardList,
  Eye,
  FileText,
  Flag,
  FolderKanban,
  Gift,
  HandshakeIcon,
  HardDrive,
  Heart,
  HeartHandshake,
  LayoutDashboard,
  Map,
  Megaphone,
  MessageCircle,
  MessageSquare,
  MessageSquareHeart,
  ScrollText,
  Search,
  Shield,
  ShieldCheck,
  Sparkles,
  FileCheck,
  UserPlus,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { AdminStats } from "@/hooks/admin/useAdminData";
import { isAplus1LaunchMinimal } from "@/lib/aplus1Launch";

/** Admin routes hidden while VITE_APLUS1_LAUNCH_MINIMAL=true (prefix match). */
export const ADMIN_LAUNCH_HIDDEN_ADMIN_PATHS = [
  "/admin/marketing",
  "/admin/analytics",
  "/admin/dev-tasks",
  "/admin/studios",
  "/admin/collections",
  "/admin/inspire",
  "/admin/community",
  "/admin/jobs",
  "/admin/applications",
  "/admin/hiring",
  "/admin/collabs",
  "/admin/contracts",
  "/admin/wallet",
  "/admin/gifts",
  "/admin/ads",
  "/admin/kyc",
  "/admin/aml",
  "/admin/ai",
  "/admin/storage",
  "/admin/audit",
] as const;

export function isAdminLaunchHiddenPath(pathname: string): boolean {
  if (!isAplus1LaunchMinimal()) return false;
  if (pathname === "/admin" || pathname === "/admin/") return false;
  return ADMIN_LAUNCH_HIDDEN_ADMIN_PATHS.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function filterNavSectionsForLaunch(sections: AdminNavSection[]): AdminNavSection[] {
  if (!isAplus1LaunchMinimal()) return sections;
  return sections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => !isAdminLaunchHiddenPath(item.to)),
    }))
    .filter((s) => s.items.length > 0);
}

/** Sidebar + overview — respects launch minimal trim. */
export function adminNavSectionsForBuild(): AdminNavSection[] {
  return filterNavSectionsForLaunch(ADMIN_NAV_SECTIONS);
}

export type AdminBadgeKey = "reports" | "cashouts" | "kyc" | "aml";

export type AdminStatKey = keyof AdminStats;

type IconComponent = LucideIcon | ComponentType<{ className?: string }>;

export type AdminNavItem = {
  to: string;
  label: string;
  hint: string;
  icon: IconComponent;
  end?: boolean;
  badgeKey?: AdminBadgeKey;
  statKey?: AdminStatKey;
  statLabel?: string;
  accent?: boolean;
  delta?: string;
};

export type AdminNavSection = {
  id: string;
  title: string;
  description: string;
  items: AdminNavItem[];
};

/** Single source of truth — sidebar + overview ใช้ชุดเดียวกัน */
export const ADMIN_NAV_SECTIONS: AdminNavSection[] = [
  {
    id: "command",
    title: "ศูนย์บัญชาการ",
    description: "ภาพรวม วิเคราะห์ growth และแผนพัฒนาแพลตฟอร์ม",
    items: [
      {
        to: "/admin",
        label: "ภาพรวม",
        hint: "Dashboard สด + คิวที่ต้องดูแล",
        icon: LayoutDashboard,
        end: true,
      },
      {
        to: "/admin/marketing",
        label: "Marketing",
        hint: "Growth intelligence เฉพาะ Aplus1",
        icon: Megaphone,
      },
      {
        to: "/admin/analytics",
        label: "Analytics",
        hint: "แนวโน้มและ conversion",
        icon: BarChart3,
      },
      {
        to: "/admin/seo",
        label: "SEO",
        hint: "Sitemap, meta, indexing checklist",
        icon: Search,
      },
      {
        to: "/admin/activity",
        label: "กิจกรรมทั้งเว็บ",
        hint: "เหตุการณ์ล่าสุดแบบเรียลไทม์",
        icon: Activity,
      },
      {
        to: "/admin/dev-tasks",
        label: "แผนพัฒนา",
        hint: "Backlog และงานที่กำลังทำ",
        icon: Map,
      },
    ],
  },
  {
    id: "people",
    title: "ผู้ใช้ & สตูดิโอ",
    description: "บัญชีครีเอทีฟ สตูดิโอ และการเติบโตของผู้ใช้",
    items: [
      {
        to: "/admin/users",
        label: "ผู้ใช้",
        hint: "โปรไฟล์และบัญชีทั้งหมด",
        icon: Users,
        statKey: "totalUsers",
        statLabel: "ผู้ใช้ทั้งหมด",
      },
      {
        to: "/admin/users",
        label: "สมัครใหม่ 24 ชม.",
        hint: "ผู้ใช้ที่เพิ่งเข้าระบบ",
        icon: UserPlus,
        statKey: "newUsers24h",
        statLabel: "ใหม่ 24 ชม.",
        delta: "live",
      },
      {
        to: "/admin/studios",
        label: "สตูดิโอ",
        hint: "ทีมและ workspace ครีเอทีฟ",
        icon: Building2,
        statKey: "totalStudios",
        statLabel: "สตูดิโอ",
      },
    ],
  },
  {
    id: "content",
    title: "ผลงาน & ชุมชน",
    description: "พอร์ตโฟลิโอ ฟีด Inspire โพสต์ชุมชน และปฏิสัมพันธ์",
    items: [
      {
        to: "/admin/projects",
        label: "ผลงาน",
        hint: "โปรเจกต์ที่เผยแพร่แล้ว",
        icon: FolderKanban,
        statKey: "publishedProjects",
        statLabel: "เผยแพร่",
      },
      {
        to: "/admin/collections",
        label: "คอลเลกชัน",
        hint: "เคอร์เรชันที่ผู้ใช้สร้าง",
        icon: Bookmark,
        statKey: "totalCollections",
        statLabel: "คอลเลกชัน",
      },
      {
        to: "/admin/inspire",
        label: "Inspire",
        hint: "บอร์ดแรงบันดาลใจ",
        icon: Sparkles,
      },
      {
        to: "/admin/community",
        label: "โพสต์ชุมชน",
        hint: "ฟีด Q&A และโพสต์สาธารณะ",
        icon: MessageSquare,
      },
      {
        to: "/admin/comments",
        label: "คอมเมนต์",
        hint: "ความคิดเห็นบนผลงาน 24 ชม.",
        icon: MessageCircle,
        statKey: "comments24h",
        statLabel: "คอมเมนต์ 24 ชม.",
      },
      {
        to: "/admin/projects",
        label: "ยอด +1 (24 ชม.)",
        hint: "การกดชอบผลงาน",
        icon: Heart,
        statKey: "likes24h",
        statLabel: "+1 / 24 ชม.",
      },
      {
        to: "/admin/projects",
        label: "ยอดวิว (24 ชม.)",
        hint: "การเข้าชมผลงาน",
        icon: Eye,
        statKey: "views24h",
        statLabel: "วิว / 24 ชม.",
      },
    ],
  },
  {
    id: "marketplace",
    title: "งาน & ความร่วมมือ",
    description: "ประกาศจ้าง ใบสมัคร คำขอจ้าง คอลแลป และสัญญา",
    items: [
      {
        to: "/admin/jobs",
        label: "ประกาศงาน",
        hint: "งานที่เปิดรับสมัคร",
        icon: BriefcaseIcon,
        statKey: "openJobs",
        statLabel: "งานเปิด",
      },
      {
        to: "/admin/applications",
        label: "ใบสมัครงาน",
        hint: "คิวสมัครจาก creator",
        icon: ClipboardList,
      },
      {
        to: "/admin/hiring",
        label: "คำขอจ้าง",
        hint: "ลูกค้าติดต่อจ้างโดยตรง",
        icon: HandshakeIcon,
        statKey: "pendingHiring",
        statLabel: "รอดำเนินการ",
        accent: true,
      },
      {
        to: "/admin/collabs",
        label: "คอลแลป",
        hint: "คำขอร่วมงานระหว่างครีเอทีฟ",
        icon: HeartHandshake,
        statKey: "pendingCollabs",
        statLabel: "รอดำเนินการ",
        accent: true,
      },
      {
        to: "/admin/contracts",
        label: "สัญญา",
        hint: "ข้อตกลงและเอกสารจ้างงาน",
        icon: FileText,
      },
    ],
  },
  {
    id: "money",
    title: "การเงิน & โปรโมต",
    description: "กระเป๋า ถอนเงิน ของขวัญ และแคมเปญโฆษณา",
    items: [
      {
        to: "/admin/wallet",
        label: "กระเป๋า & Ledger",
        hint: "ยอดคงเหลือและรายการเงิน",
        icon: Wallet,
        badgeKey: "cashouts",
        statKey: "pendingCashouts",
        statLabel: "ถอนรออนุมัติ",
        accent: true,
      },
      {
        to: "/admin/gifts",
        label: "ของขวัญ",
        hint: "การสนับสนุน creator",
        icon: Gift,
        statKey: "gifts24h",
        statLabel: "ของขวัญ 24 ชม.",
      },
      {
        to: "/admin/ads",
        label: "โฆษณา",
        hint: "แคมเปญและพื้นที่โปรโมต",
        icon: Megaphone,
      },
    ],
  },
  {
    id: "comms",
    title: "การสื่อสาร",
    description: "แชตและการแจ้งเตือนในแพลตฟอร์ม",
    items: [
      {
        to: "/admin/chats",
        label: "แชต",
        hint: "ข้อความระหว่างผู้ใช้ 24 ชม.",
        icon: MessageSquare,
        statKey: "messages24h",
        statLabel: "ข้อความ 24 ชม.",
      },
      {
        to: "/admin/chats",
        label: "ติดตามใหม่",
        hint: "การ follow 24 ชม.",
        icon: UserPlus,
        statKey: "follows24h",
        statLabel: "follow / 24 ชม.",
      },
      {
        to: "/admin/notifications",
        label: "แจ้งเตือน",
        hint: "ระบบแจ้งเตือนและ push",
        icon: Bell,
      },
    ],
  },
  {
    id: "trust",
    title: "ความน่าเชื่อถือ & ความปลอดภัย",
    description: "รายงาน moderation KYC/AML และเสียงจากผู้ใช้",
    items: [
      {
        to: "/admin/compliance",
        label: "Compliance",
        hint: "PDPA consent คิวลิขสิทธิ์",
        icon: FileCheck,
        accent: true,
      },
      {
        to: "/admin/reports",
        label: "รายงานเนื้อหา",
        hint: "รายงานที่เปิดอยู่",
        icon: Flag,
        badgeKey: "reports",
        statKey: "openReports",
        statLabel: "รายงานเปิด",
        accent: true,
      },
      {
        to: "/admin/moderation",
        label: "Moderation",
        hint: "มาตรการและสถานะผู้ใช้",
        icon: Shield,
      },
      {
        to: "/admin/kyc",
        label: "ยืนยันตัวตน (KYC)",
        hint: "คิวตรวจสอบตัวตน",
        icon: ShieldCheck,
        badgeKey: "kyc",
        statKey: "pendingKyc",
        statLabel: "KYC รอ",
        accent: true,
      },
      {
        to: "/admin/aml",
        label: "AML / ฟอกเงิน",
        hint: "ธงความเสี่ยงทางการเงิน",
        icon: Shield,
        badgeKey: "aml",
        statKey: "openAmlFlags",
        statLabel: "AML เปิด",
        accent: true,
      },
      {
        to: "/admin/feedback",
        label: "ฟีดแบ็กผู้ใช้",
        hint: "ข้อเสนอแนะจากแอป",
        icon: MessageSquareHeart,
        statKey: "openFeedback",
        statLabel: "ฟีดแบ็กใหม่",
      },
    ],
  },
  {
    id: "ops",
    title: "ระบบ & เทคนิค",
    description: "AI, storage, audit log และสุขภาพระบบ",
    items: [
      {
        to: "/admin/ai",
        label: "AI Monitor",
        hint: "การใช้งานและค่าใช้จ่าย AI",
        icon: Bot,
      },
      {
        to: "/admin/storage",
        label: "พื้นที่เก็บไฟล์",
        hint: "Storage และ asset",
        icon: HardDrive,
      },
      {
        to: "/admin/audit",
        label: "บันทึกการใช้งาน",
        hint: "Admin audit trail",
        icon: ScrollText,
      },
      {
        to: "/admin/system",
        label: "สุขภาพระบบ",
        hint: "สถานะบริการและ env",
        icon: Activity,
      },
    ],
  },
];

export function adminStatValue(stats: AdminStats | undefined, key?: AdminStatKey): number | undefined {
  if (!stats || !key) return undefined;
  return stats[key];
}

export function adminPendingQueue(stats: AdminStats | undefined): Array<{ to: string; label: string; count: number }> {
  if (!stats) return [];
  const launch = isAplus1LaunchMinimal();
  const rows: Array<{ to: string; label: string; count: number }> = [];
  if (!launch && stats.pendingHiring > 0) {
    rows.push({ to: "/admin/hiring", label: "คำขอจ้าง", count: stats.pendingHiring });
  }
  if (!launch && stats.pendingCollabs > 0) {
    rows.push({ to: "/admin/collabs", label: "คอลแลป", count: stats.pendingCollabs });
  }
  if (stats.openReports > 0) rows.push({ to: "/admin/reports", label: "รายงานเนื้อหา", count: stats.openReports });
  if (!launch && stats.pendingCashouts > 0) {
    rows.push({ to: "/admin/wallet", label: "ถอนเงิน", count: stats.pendingCashouts });
  }
  if (!launch && stats.pendingKyc > 0) rows.push({ to: "/admin/kyc", label: "KYC", count: stats.pendingKyc });
  if (!launch && stats.openAmlFlags > 0) rows.push({ to: "/admin/aml", label: "AML", count: stats.openAmlFlags });
  if (stats.openFeedback > 0) rows.push({ to: "/admin/feedback", label: "ฟีดแบ็ก", count: stats.openFeedback });
  return rows;
}

const SIDEBAR_PATHS_ORDERED: { sectionId: string; to: string }[] = [
  { sectionId: "command", to: "/admin" },
  { sectionId: "command", to: "/admin/marketing" },
  { sectionId: "command", to: "/admin/analytics" },
  { sectionId: "command", to: "/admin/activity" },
  { sectionId: "command", to: "/admin/dev-tasks" },
  { sectionId: "people", to: "/admin/users" },
  { sectionId: "people", to: "/admin/studios" },
  { sectionId: "content", to: "/admin/projects" },
  { sectionId: "content", to: "/admin/collections" },
  { sectionId: "content", to: "/admin/inspire" },
  { sectionId: "content", to: "/admin/community" },
  { sectionId: "content", to: "/admin/comments" },
  { sectionId: "marketplace", to: "/admin/jobs" },
  { sectionId: "marketplace", to: "/admin/applications" },
  { sectionId: "marketplace", to: "/admin/hiring" },
  { sectionId: "marketplace", to: "/admin/collabs" },
  { sectionId: "marketplace", to: "/admin/contracts" },
  { sectionId: "money", to: "/admin/wallet" },
  { sectionId: "money", to: "/admin/gifts" },
  { sectionId: "money", to: "/admin/ads" },
  { sectionId: "comms", to: "/admin/chats" },
  { sectionId: "comms", to: "/admin/notifications" },
  { sectionId: "trust", to: "/admin/compliance" },
  { sectionId: "trust", to: "/admin/reports" },
  { sectionId: "trust", to: "/admin/moderation" },
  { sectionId: "trust", to: "/admin/kyc" },
  { sectionId: "trust", to: "/admin/aml" },
  { sectionId: "trust", to: "/admin/feedback" },
  { sectionId: "ops", to: "/admin/ai" },
  { sectionId: "ops", to: "/admin/storage" },
  { sectionId: "ops", to: "/admin/audit" },
  { sectionId: "ops", to: "/admin/system" },
];

export function adminSidebarSections(): AdminNavSection[] {
  const sections = adminNavSectionsForBuild();
  return sections
    .map((section) => {
      const paths = SIDEBAR_PATHS_ORDERED.filter((p) => p.sectionId === section.id).map((p) => p.to);
      const items = paths
        .map((to) => section.items.find((item) => item.to === to))
        .filter((item): item is AdminNavItem => !!item);
      return { ...section, items };
    })
    .filter((s) => s.items.length > 0);
}
