import { NavLink } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Inbox,
  Columns3,
  ListTodo,
  Activity,
  Map,
  Repeat,
  Briefcase,
  ClipboardList,
  HeartPulse,
  LogOut,
  Link2,
  Users,
  Radar,
} from "lucide-react";
import { useHubAuth } from "@/auth/AuthProvider";
import { useHubView } from "@/contexts/HubViewContext";
import { ViewSwitcher } from "@/components/ViewSwitcher";
import { useWorkItems } from "@/hooks/useWorkItems";
import { ecosystemAlertItems, inboxItems } from "@/lib/work-items";
import { NAV_LABELS } from "@/lib/labels-th";

type NavItem = {
  to: string;
  icon: LucideIcon;
  label: string;
  end?: boolean;
  hint: string;
};

type NavSection = {
  title: string;
  items: NavItem[];
};

const NAV_SECTIONS: NavSection[] = [
  {
    title: "ภาพรวม & สุขภาพ",
    items: [
      { to: "/", icon: LayoutDashboard, label: NAV_LABELS.overview, end: true, hint: "ดูตัวเลขและรายการด่วน" },
      { to: "/monitor", icon: HeartPulse, label: NAV_LABELS.monitor, hint: "สุขภาพเว็บ + Supabase/Vercel usage" },
      { to: "/tracking", icon: ClipboardList, label: NAV_LABELS.tracking, hint: "สรุปฟีเจอร์ทุกเว็บ % ความพร้อม" },
    ],
  },
  {
    title: "Ecosystem",
    items: [
      { to: "/connections", icon: Link2, label: NAV_LABELS.connections, hint: "Flywheel So1o ↔ Pixel100" },
      { to: "/users", icon: Users, label: NAV_LABELS.users, hint: "ค้นหาบัญชีข้ามแอป" },
      { to: "/radar", icon: Radar, label: NAV_LABELS.radar, hint: "เทรนด์และ roadmap deferred" },
    ],
  },
  {
    title: "PM ทีม",
    items: [
      { to: "/inbox", icon: Inbox, label: NAV_LABELS.inbox, hint: "งานใหม่ที่ต้องจัดการ" },
      { to: "/board", icon: Columns3, label: NAV_LABELS.board, hint: "ลากการ์ดเปลี่ยนสถานะ" },
      { to: "/issues", icon: ListTodo, label: NAV_LABELS.issues, hint: "รายการทั้งหมดพร้อมค้นหา" },
      { to: "/work", icon: Briefcase, label: NAV_LABELS.work, hint: "งานภายในทีม" },
      { to: "/cycles", icon: Repeat, label: NAV_LABELS.cycles, hint: "รอบงาน / Sprint" },
      { to: "/roadmap", icon: Map, label: NAV_LABELS.roadmap, hint: "แผนงานตามไตรมาส" },
      { to: "/activity", icon: Activity, label: NAV_LABELS.activity, hint: "เหตุการณ์ล่าสุดในระบบ" },
    ],
  },
];

function NavBadge({ count, variant }: { count: number; variant: "brand" | "eco" }) {
  if (count <= 0) return null;
  const color = variant === "eco" ? "bg-an1hem" : "bg-brand";
  return (
    <span className={`rounded-full ${color} px-1.5 py-0.5 text-[10px] font-bold text-white`}>{count}</span>
  );
}

export function Sidebar() {
  const { user, signOut } = useHubAuth();
  const { view, setView } = useHubView();
  const { data } = useWorkItems();
  const items = data?.items ?? [];
  const triage = inboxItems(items);
  const ecoAlerts = ecosystemAlertItems(items);
  const ecoCount = ecoAlerts.length;
  const regularInboxCount = triage.length - ecoCount;

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-border bg-white">
      <div className="border-b border-border px-4 py-4">
        <div className="flex items-center gap-2">
          <div className="flex -space-x-1">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-brand text-[10px] font-bold text-white">
              S1
            </span>
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-an1hem text-[10px] font-bold text-white">
              a1
            </span>
          </div>
          <div>
            <p className="text-sm font-semibold leading-tight">Ops Hub</p>
            <p className="text-[10px] text-muted">ศูนย์ควบคุมทีมดูแล</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-4 overflow-y-auto p-2">
        {NAV_SECTIONS.map((section) => (
          <div key={section.title}>
            <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-wide text-muted">
              {section.title}
            </p>
            <div className="space-y-0.5">
              {section.items.map(({ to, icon: Icon, label, end, hint }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  title={hint}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
                      isActive ? "bg-brand-soft text-brand" : "text-muted hover:bg-surface hover:text-ink"
                    }`
                  }
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="flex-1">{label}</span>
                  {to === "/inbox" ? (
                    <span className="flex items-center gap-1">
                      <NavBadge count={regularInboxCount} variant="brand" />
                      <NavBadge count={ecoCount} variant="eco" />
                    </span>
                  ) : null}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="space-y-3 border-t border-border p-3">
        <div>
          <p className="mb-1 text-[10px] font-medium text-muted">แสดงข้อมูลจาก</p>
          <ViewSwitcher value={view} onChange={setView} compact />
        </div>
        <div className="truncate text-[10px] text-muted">{user?.email}</div>
        <button
          type="button"
          onClick={() => signOut()}
          className="flex w-full items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-surface"
        >
          <LogOut className="h-3.5 w-3.5" /> ออกจากระบบ
        </button>
      </div>
    </aside>
  );
}
