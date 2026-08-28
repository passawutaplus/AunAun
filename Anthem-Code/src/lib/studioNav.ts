import {
  Briefcase,
  Handshake,
  LayoutDashboard,
  LayoutGrid,
  MessageSquareQuote,
  WalletCards,
  type LucideIcon,
} from "lucide-react";

export type StudioNavItem = {
  id: string;
  to: string;
  label: string;
  /** Large English title in the studio hero. */
  heroTitle: string;
  hint: string;
  /** Match pathname exactly (no prefix). */
  end: boolean;
};

export type StudioNavGroup = {
  id: string;
  label: string;
  icon: LucideIcon;
  /** When set, the group title itself is the page link. */
  to?: string;
  heroTitle?: string;
  hint?: string;
  end?: boolean;
  items: StudioNavItem[];
};

export const STUDIO_HOME_PATH = "/dashboard";
export const STUDIO_HIRE_PATH = "/dashboard/hire";
export const STUDIO_PROJECTS_PATH = "/dashboard/projects";
export const STUDIO_PACKAGES_PATH = "/dashboard/packages";
export const STUDIO_CATALOGS_PATH = "/dashboard/catalogs";

export const STUDIO_NAV_GROUPS: StudioNavGroup[] = [
  {
    id: "home",
    label: "Dashboard",
    icon: LayoutDashboard,
    to: STUDIO_HOME_PATH,
    heroTitle: "Dashboard",
    hint: "ดูคิววันนี้ สถานะสตูดิโอ และทางลัดไปทำงาน",
    end: true,
    items: [],
  },
  {
    id: "portfolio",
    label: "ผลงาน",
    icon: LayoutGrid,
    items: [
      {
        id: "projects",
        to: STUDIO_PROJECTS_PATH,
        label: "Projects",
        heroTitle: "Projects",
        hint: "ดูภาพรวม จัดสถานะ และเพิ่มผลงานใหม่",
        end: true,
      },
      {
        id: "catalogs",
        to: STUDIO_CATALOGS_PATH,
        label: "Catalogs",
        heroTitle: "Catalogs",
        hint: "จัดกลุ่มผลงานเป็นชุดให้อ่านง่ายบนโปรไฟล์",
        end: true,
      },
      {
        id: "packages",
        to: STUDIO_PACKAGES_PATH,
        label: "Packages",
        heroTitle: "Packages",
        hint: "จัดการแพ็กเกจบริการที่เปิดรับงาน",
        end: true,
      },
    ],
  },
  {
    id: "work",
    label: "จ้างงาน",
    icon: Briefcase,
    to: STUDIO_HIRE_PATH,
    heroTitle: "Hire",
    hint: "ดูคำขอจ้างงาน ลิงก์ผลงาน และสถานะงาน",
    end: true,
    items: [],
  },
  {
    id: "collab",
    label: "คอลแลป",
    icon: Handshake,
    to: "/dashboard/collab",
    heroTitle: "Collab",
    hint: "ดูคำขอคอลแลป ตอบรับ/ปฏิเสธ และลิงก์ผลงานร่วม",
    end: true,
    items: [],
  },
  {
    id: "reviews",
    label: "รีวิว",
    icon: MessageSquareQuote,
    to: "/dashboard/reviews",
    heroTitle: "Reviews",
    hint: "รวมรีวิวจ้างงานและคอลแลป แล้วตอบกลับได้",
    end: true,
    items: [],
  },
  {
    id: "finance",
    label: "การเงิน",
    icon: WalletCards,
    items: [
      {
        id: "transactions",
        to: "/earnings",
        label: "ธุรกรรม",
        heroTitle: "Transactions",
        hint: "ยอดในกระเป๋า ประวัติรายได้ และการถอน",
        end: true,
      },
      {
        id: "withdraw",
        to: "/earnings/withdraw",
        label: "ถอนเงิน",
        heroTitle: "Withdraw",
        hint: "โอนยอดจากกระเป๋าเข้าบัญชีธนาคาร",
        end: true,
      },
      {
        id: "documents",
        to: "/dashboard/documents",
        label: "เอกสาร / ภาษี",
        heroTitle: "Documents",
        hint: "ใบเสร็จ 50 ทวิ และประมาณการภาษีจากรายได้บนแพลตฟอร์ม",
        end: true,
      },
      {
        id: "payout",
        to: "/dashboard/payout",
        label: "บัญชีรับเงิน",
        heroTitle: "Payout",
        hint: "บัญชีธนาคารและความพร้อมรับค่าจ้าง",
        end: true,
      },
    ],
  },
];

function groupAsItem(group: StudioNavGroup): StudioNavItem | null {
  if (!group.to) return null;
  return {
    id: group.id,
    to: group.to,
    label: group.label,
    heroTitle: group.heroTitle ?? group.label,
    hint: group.hint ?? "",
    end: group.end ?? true,
  };
}

export function studioNavItems(): StudioNavItem[] {
  return STUDIO_NAV_GROUPS.flatMap((group) => {
    const self = groupAsItem(group);
    return self ? [self, ...group.items] : group.items;
  });
}

export function matchStudioItem(pathname: string): StudioNavItem | undefined {
  if (pathname === "/earnings/withdraw/pin") {
    return {
      id: "withdraw-pin",
      to: "/earnings/withdraw/pin",
      label: "ถอนเงิน",
      heroTitle: "Withdraw",
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
