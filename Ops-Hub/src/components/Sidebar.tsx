import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Inbox,
  Columns3,
  ListTodo,
  Activity,
  Map,
  Repeat,
  Briefcase,
  LogOut,
} from "lucide-react";
import { useHubAuth } from "@/auth/AuthProvider";
import { useHubView } from "@/contexts/HubViewContext";
import { ViewSwitcher } from "@/components/ViewSwitcher";
import { useWorkItems } from "@/hooks/useWorkItems";
import { inboxItems } from "@/lib/work-items";
import { NAV_LABELS } from "@/lib/labels-th";

const NAV = [
  { to: "/", icon: LayoutDashboard, label: NAV_LABELS.overview, end: true, hint: "ดูตัวเลขและรายการด่วน" },
  { to: "/inbox", icon: Inbox, label: NAV_LABELS.inbox, badge: true, hint: "งานใหม่ที่ต้องจัดการ" },
  { to: "/board", icon: Columns3, label: NAV_LABELS.board, hint: "ลากการ์ดเปลี่ยนสถานะ" },
  { to: "/issues", icon: ListTodo, label: NAV_LABELS.issues, hint: "รายการทั้งหมดพร้อมค้นหา" },
  { to: "/work", icon: Briefcase, label: NAV_LABELS.work, hint: "งานภายในทีม" },
  { to: "/cycles", icon: Repeat, label: NAV_LABELS.cycles, hint: "รอบงาน / Sprint" },
  { to: "/roadmap", icon: Map, label: NAV_LABELS.roadmap, hint: "แผนงานตามไตรมาส" },
  { to: "/activity", icon: Activity, label: NAV_LABELS.activity, hint: "เหตุการณ์ล่าสุดในระบบ" },
];

export function Sidebar() {
  const { user, signOut } = useHubAuth();
  const { view, setView } = useHubView();
  const { data } = useWorkItems();
  const inboxCount = inboxItems(data ?? []).length;

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

      <nav className="flex-1 space-y-0.5 p-2">
        {NAV.map(({ to, icon: Icon, label, end, badge, hint }) => (
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
            {badge && inboxCount > 0 ? (
              <span className="rounded-full bg-brand px-1.5 py-0.5 text-[10px] font-bold text-white">
                {inboxCount}
              </span>
            ) : null}
          </NavLink>
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
