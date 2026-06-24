import BriefcaseIcon from "../icons/BriefcaseIcon";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard, Users, Building2, FolderKanban,
  HandshakeIcon, HeartHandshake, MessageSquare, MessageCircle,
  Bookmark, Bell, HardDrive, ScrollText, Activity, Gift, Megaphone, Sparkles,
  Flag, MessageSquareHeart, Shield, ShieldCheck, FileText, Wallet, BarChart3, ClipboardList, Bot, Map,
} from "lucide-react";
import { useAdminRealtime } from "@/hooks/admin/useAdminRealtime";
import { useAdminAlertCounts } from "@/hooks/admin/useAdminAlerts";
import { OPS_HUB_URL } from "@/lib/productLinks";

type Item = {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  end?: boolean;
  badgeKey?: "reports" | "cashouts" | "kyc" | "aml";
};

const sections: { title: string; items: Item[] }[] = [
  {
    title: "ภาพรวม",
    items: [
      { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
      { to: "/admin/dev-tasks", label: "แผนพัฒนา", icon: Map },
      { to: "/admin/activity", label: "กิจกรรมทั้งเว็บ", icon: Activity },
      { to: "/admin/analytics", label: "Analytics", icon: BarChart3 },
    ],
  },
  {
    title: "ผู้ใช้ & ชุมชน",
    items: [
      { to: "/admin/users", label: "ผู้ใช้", icon: Users },
      { to: "/admin/studios", label: "สตูดิโอ", icon: Building2 },
    ],
  },
  {
    title: "คอนเทนต์",
    items: [
      { to: "/admin/projects", label: "ผลงาน", icon: FolderKanban },
      { to: "/admin/collections", label: "คอลเลกชัน", icon: Bookmark },
      { to: "/admin/comments", label: "คอมเมนต์", icon: MessageCircle },
      { to: "/admin/inspire", label: "Inspire", icon: Sparkles },
    ],
  },
  {
    title: "ตลาดงาน",
    items: [
      { to: "/admin/jobs", label: "ประกาศงาน", icon: BriefcaseIcon },
      { to: "/admin/applications", label: "ใบสมัครงาน", icon: ClipboardList },
      { to: "/admin/hiring", label: "คำขอจ้าง", icon: HandshakeIcon },
      { to: "/admin/collabs", label: "คอลแลป", icon: HeartHandshake },
      { to: "/admin/contracts", label: "สัญญา", icon: FileText },
    ],
  },
  {
    title: "การเงิน & โฆษณา",
    items: [
      { to: "/admin/wallet", label: "กระเป๋า & Ledger", icon: Wallet, badgeKey: "cashouts" },
      { to: "/admin/gifts", label: "ของขวัญ", icon: Gift },
      { to: "/admin/ads", label: "โฆษณา", icon: Megaphone },
    ],
  },
  {
    title: "การสื่อสาร",
    items: [
      { to: "/admin/chats", label: "แชต", icon: MessageSquare },
      { to: "/admin/notifications", label: "แจ้งเตือน", icon: Bell },
    ],
  },
  {
    title: "ความปลอดภัย & เสียงผู้ใช้",
    items: [
      { to: "/admin/aml", label: "AML / ฟอกเงิน", icon: Shield, badgeKey: "aml" },
      { to: "/admin/kyc", label: "ยืนยันตัวตน (KYC)", icon: ShieldCheck, badgeKey: "kyc" },
      { to: "/admin/reports", label: "รายงานเนื้อหา", icon: Flag, badgeKey: "reports" },
      { to: "/admin/moderation", label: "Moderation", icon: Shield },
      { to: "/admin/community", label: "โพสต์ชุมชน", icon: MessageSquare },
      { to: "/admin/feedback", label: "ฟีดแบ็กผู้ใช้", icon: MessageSquareHeart },
    ],
  },
  {
    title: "ระบบ",
    items: [
      { to: "/admin/ai", label: "AI Monitor", icon: Bot },
      { to: "/admin/storage", label: "พื้นที่เก็บไฟล์", icon: HardDrive },
      { to: "/admin/audit", label: "บันทึกการใช้งาน", icon: ScrollText },
      { to: "/admin/system", label: "สุขภาพระบบ", icon: Activity },
    ],
  },
];

function NavBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="ml-auto min-w-[1.25rem] h-5 px-1 rounded-full bg-admin-accent text-admin-bg text-[10px] font-mono flex items-center justify-center">
      {count > 99 ? "99+" : count}
    </span>
  );
}

export default function AdminSidebar() {
  useAdminRealtime();
  const { data: alerts } = useAdminAlertCounts();

  const badgeCount = (key?: Item["badgeKey"]) => {
    if (!key || !alerts) return 0;
    if (key === "reports") return alerts.openReports;
    if (key === "cashouts") return alerts.pendingCashouts;
    if (key === "kyc") return alerts.pendingKyc;
    if (key === "aml") return alerts.openAml;
    return 0;
  };

  return (
    <aside className="hidden md:flex flex-col w-60 shrink-0 border-r border-admin-border bg-admin-surface min-h-screen sticky top-0">
      <div className="px-5 py-6 border-b border-admin-border">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-sm bg-admin-fg flex items-center justify-center">
            <div className="w-3 h-3 rounded-full bg-admin-accent" />
          </div>
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-admin-muted">Admin</p>
            <p className="font-medium text-sm text-admin-fg">Control Center</p>
          </div>
        </div>
      </div>
      <nav className="flex-1 px-2 py-3 overflow-y-auto">
        {sections.map((sec, i) => (
          <div key={sec.title} className={i > 0 ? "mt-4" : ""}>
            <p className="px-3 pb-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-admin-muted/70">
              {sec.title}
            </p>
            <div className="space-y-0.5">
              {sec.items.map((it) => (
                <NavLink
                  key={it.to}
                  to={it.to}
                  end={it.end}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 rounded-sm text-sm transition-colors ${
                      isActive
                        ? "bg-admin-fg text-admin-bg"
                        : "text-admin-muted hover:bg-admin-hover hover:text-admin-fg"
                    }`
                  }
                >
                  <it.icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{it.label}</span>
                  <NavBadge count={badgeCount(it.badgeKey)} />
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>
      <div className="px-4 py-3 border-t border-admin-border space-y-2">
        <a
          href={OPS_HUB_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="block text-xs font-mono uppercase tracking-wider text-admin-accent hover:underline"
        >
          Ops Hub ↗
        </a>
        <NavLink to="/" className="block text-xs font-mono uppercase tracking-wider text-admin-muted hover:text-admin-accent">
          ← กลับสู่เว็บไซต์
        </NavLink>
      </div>
    </aside>
  );
}
