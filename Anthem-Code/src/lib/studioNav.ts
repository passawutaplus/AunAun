import {
  BarChart3,
  Briefcase,
  FileText,
  Handshake,
  Landmark,
  LayoutDashboard,
  Library,
  MessageCircle,
  MessageSquareQuote,
  Package,
  Images,
  Receipt,
  Shapes,
  WalletCards,
  type LucideIcon,
} from "lucide-react";
import { isCommerceEnabled } from "@/lib/aplus1Launch";

/** Live counts shown as a pill next to a menu item. */
export type StudioBadgeKey = "hireNew" | "collabNew" | "chatUnread";

export type StudioNavItem = {
  id: string;
  to: string;
  label: string;
  /** Thai page name (search, SEO, mobile bar). */
  heroTitle: string;
  /** Large English display title at the top of the page. */
  displayTitle?: string;
  hint: string;
  icon?: LucideIcon;
  badge?: StudioBadgeKey;
  /** Match pathname exactly (no prefix). */
  end: boolean;
  /** Part of the money / selling phase — hidden during the free launch. */
  commerce?: boolean;
};

/**
 * A sidebar section. Add future back-office areas (planning, income, tax) as new groups —
 * the sidebar renders whatever is here.
 */
export type StudioNavGroup = {
  id: string;
  /** Small section caption; omit for the first (unlabelled) section. */
  label?: string;
  icon?: LucideIcon;
  commerce?: boolean;
  items: StudioNavItem[];
};

export const STUDIO_HOME_PATH = "/dashboard";
export const STUDIO_HIRE_PATH = "/dashboard/hire";
export const STUDIO_COLLAB_PATH = "/dashboard/collab";
export const STUDIO_PROJECTS_PATH = "/dashboard/projects";
export const STUDIO_PACKAGES_PATH = "/dashboard/packages";
export const STUDIO_OBJECTS_PATH = "/dashboard/objects";
export const STUDIO_CATALOGS_PATH = "/dashboard/catalogs";
export const STUDIO_INSIGHTS_PATH = "/dashboard/insights";

export const STUDIO_NAV_GROUPS: StudioNavGroup[] = [
  {
    id: "main",
    items: [
      {
        id: "home",
        displayTitle: "Overview",
        to: STUDIO_HOME_PATH,
        label: "ภาพรวม",
        heroTitle: "ภาพรวม",
        hint: "เรื่องที่รอคุณวันนี้ และงานที่กำลังทำ",
        icon: LayoutDashboard,
        end: true,
      },
      {
        id: "work",
        displayTitle: "Hire",
        to: STUDIO_HIRE_PATH,
        label: "งานจ้าง",
        heroTitle: "งานจ้าง",
        hint: "คำขอจ้าง สถานะงาน และลิงก์ผลงาน",
        icon: Briefcase,
        badge: "hireNew",
        end: true,
      },
      {
        id: "collab",
        displayTitle: "Collab",
        to: STUDIO_COLLAB_PATH,
        label: "คอลแลป",
        heroTitle: "คอลแลป",
        hint: "คำชวนคอลแลป ตอบรับ และงานร่วม",
        icon: Handshake,
        badge: "collabNew",
        end: true,
      },
      {
        id: "chat",
        displayTitle: "Chat",
        to: "/chat",
        label: "แชท",
        heroTitle: "แชท",
        hint: "",
        icon: MessageCircle,
        badge: "chatUnread",
        end: false,
      },
      {
        id: "reviews",
        displayTitle: "Reviews",
        to: "/dashboard/reviews",
        label: "รีวิว",
        heroTitle: "รีวิว",
        hint: "รีวิวจากงานจ้างและคอลแลป ตอบกลับได้",
        icon: MessageSquareQuote,
        end: true,
        // Reviews come back with paid hiring.
        commerce: true,
      },
    ],
  },
  {
    id: "portfolio",
    label: "ผลงาน",
    items: [
      {
        id: "projects",
        displayTitle: "My Works",
        to: STUDIO_PROJECTS_PATH,
        label: "ผลงานของฉัน",
        heroTitle: "ผลงานของฉัน",
        hint: "จัดสถานะ แก้ไข และเพิ่มผลงานใหม่",
        icon: Images,
        end: true,
      },
      {
        id: "catalogs",
        displayTitle: "Catalogs",
        to: STUDIO_CATALOGS_PATH,
        label: "แคตตาล็อก",
        heroTitle: "แคตตาล็อก",
        hint: "จัดผลงานเป็นชุดให้อ่านง่ายบนโปรไฟล์",
        icon: Library,
        end: true,
      },
      {
        id: "packages",
        displayTitle: "Packages",
        to: STUDIO_PACKAGES_PATH,
        label: "แพ็กเกจ",
        heroTitle: "แพ็กเกจ",
        hint: "แพ็กเกจบริการที่เปิดรับงาน",
        icon: Package,
        end: true,
        commerce: true,
      },
      {
        id: "objects",
        displayTitle: "Objects",
        to: STUDIO_OBJECTS_PATH,
        label: "สินค้า",
        heroTitle: "สินค้า",
        hint: "วัตถุ อาร์ตทอย ภาพพิมพ์ และไฟล์ที่ขาย",
        icon: Shapes,
        end: true,
        commerce: true,
      },
      {
        id: "insights",
        displayTitle: "Insights",
        to: STUDIO_INSIGHTS_PATH,
        label: "สถิติ",
        heroTitle: "สถิติ",
        hint: "ยอดเข้าชม ไลค์ และผู้ติดตาม",
        icon: BarChart3,
        end: true,
      },
    ],
  },
  {
    id: "finance",
    label: "การเงิน",
    icon: WalletCards,
    commerce: true,
    items: [
      {
        id: "transactions",
        displayTitle: "Transactions",
        to: "/earnings",
        label: "ธุรกรรม",
        heroTitle: "ธุรกรรม",
        hint: "ยอดในกระเป๋า ประวัติรายได้ และการถอน",
        icon: Receipt,
        end: true,
      },
      {
        id: "withdraw",
        displayTitle: "Withdraw",
        to: "/earnings/withdraw",
        label: "ถอนเงิน",
        heroTitle: "ถอนเงิน",
        hint: "โอนยอดจากกระเป๋าเข้าบัญชีธนาคาร",
        icon: WalletCards,
        end: true,
      },
      {
        id: "documents",
        displayTitle: "Documents",
        to: "/dashboard/documents",
        label: "เอกสาร / ภาษี",
        heroTitle: "เอกสาร / ภาษี",
        hint: "ใบเสร็จ 50 ทวิ และประมาณการภาษีจากรายได้บนแพลตฟอร์ม",
        icon: FileText,
        end: true,
      },
      {
        id: "payout",
        displayTitle: "Payout",
        to: "/dashboard/payout",
        label: "บัญชีรับเงิน",
        heroTitle: "บัญชีรับเงิน",
        hint: "บัญชีธนาคารและความพร้อมรับค่าจ้าง",
        icon: Landmark,
        end: true,
      },
    ],
  },
];

/** Sidebar groups for this build — selling / money entries drop out while commerce is off. */
export function studioNavGroups(): StudioNavGroup[] {
  if (isCommerceEnabled()) return STUDIO_NAV_GROUPS;
  return STUDIO_NAV_GROUPS.filter((g) => !g.commerce).map((g) => ({ ...g, items: g.items.filter((i) => !i.commerce) }));
}

export function studioNavItems(): StudioNavItem[] {
  return studioNavGroups().flatMap((group) => group.items);
}

export function matchStudioItem(pathname: string): StudioNavItem | undefined {
  if (pathname === "/earnings/withdraw/pin") {
    return {
      id: "withdraw-pin",
      to: "/earnings/withdraw/pin",
      label: "ถอนเงิน",
      heroTitle: "ถอนเงิน",
      displayTitle: "Withdraw",
      hint: "โอนยอดจากกระเป๋าเข้าบัญชีธนาคาร",
      end: true,
    };
  }
  const items = studioNavItems();
  const exact = items.find((item) => item.end && pathname === item.to);
  if (exact) return exact;
  const ranked = [...items].sort((a, b) => b.to.length - a.to.length);
  return ranked.find((item) => !item.end && (pathname === item.to || pathname.startsWith(`${item.to}/`)));
}

export function isStudioPath(pathname: string): boolean {
  return pathname === "/dashboard" || pathname.startsWith("/dashboard/") || pathname.startsWith("/earnings");
}
