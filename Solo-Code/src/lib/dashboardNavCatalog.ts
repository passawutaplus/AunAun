import type { LucideIcon } from "lucide-react";
import {
  Kanban,
  Mic,
  Lightbulb,
  FileText,
  Workflow,
  Coins,
  Calculator,
  CreditCard,
  CalendarDays,
  ListTodo,
  MessageSquare,
  Users,
  Truck,
  FolderOpen,
  Scale,
  Settings,
  LayoutDashboard,
  Home,
  IdCard,
  FlaskConical,
} from "lucide-react";
import type { DashSection } from "@/components/dashboard/layout/DashboardSidebar";

export type DashboardShortcutRef = {
  section: DashSection;
  sub?: string;
};

export type DashboardShortcutOption = DashboardShortcutRef & {
  id: string;
  label: string;
  group: string;
  icon: LucideIcon;
  /** When set, navigates to this route instead of dashboard tab */
  href?: string;
};

export const DASHBOARD_SHORTCUT_MAX = 4;

export function shortcutId(ref: DashboardShortcutRef): string {
  return ref.sub ? `${ref.section}:${ref.sub}` : ref.section;
}

export function parseShortcutId(id: string): DashboardShortcutRef | null {
  const option = DASHBOARD_SHORTCUT_OPTIONS.find((o) => o.id === id);
  if (option) return { section: option.section, sub: option.sub };
  const [section, sub] = id.split(":");
  if (!section) return null;
  const validSections: DashSection[] = [
    "home",
    "overview",
    "finance",
    "planner",
    "mydata",
    "settings",
  ];
  if (!validSections.includes(section as DashSection)) return null;
  return { section: section as DashSection, sub: sub || undefined };
}

export const DASHBOARD_SHORTCUT_OPTIONS: DashboardShortcutOption[] = [
  {
    id: "finance:pipeline",
    label: "Pipeline",
    group: "งานลูกค้า",
    section: "finance",
    sub: "pipeline",
    icon: Kanban,
  },
  {
    id: "planner:meetings",
    label: "Meeting",
    group: "งานลูกค้า",
    section: "planner",
    sub: "meetings",
    icon: Mic,
  },
  {
    id: "planner:briefs",
    label: "Smart Brief",
    group: "งานลูกค้า",
    section: "planner",
    sub: "briefs",
    icon: Lightbulb,
  },
  {
    id: "labs",
    label: "Creative Labs",
    group: "งานลูกค้า",
    section: "home",
    icon: FlaskConical,
    href: "/labs",
  },
  {
    id: "finance:quotations",
    label: "ใบเสนอราคา",
    group: "งานลูกค้า",
    section: "finance",
    sub: "quotations",
    icon: FileText,
  },
  {
    id: "finance:jobs",
    label: "Job Tracker",
    group: "งานลูกค้า",
    section: "finance",
    sub: "jobs",
    icon: Workflow,
  },
  {
    id: "finance:income",
    label: "รายได้",
    group: "การเงิน",
    section: "finance",
    sub: "income",
    icon: Coins,
  },
  {
    id: "finance:tax",
    label: "ภาษี",
    group: "การเงิน",
    section: "finance",
    sub: "tax",
    icon: Calculator,
  },
  {
    id: "finance:subs",
    label: "Subscription",
    group: "การเงิน",
    section: "finance",
    sub: "subs",
    icon: CreditCard,
  },
  {
    id: "planner:content",
    label: "ปฏิทินคอนเทนต์",
    group: "การวางแผน",
    section: "planner",
    sub: "content",
    icon: CalendarDays,
  },
  {
    id: "planner:projects",
    label: "To Do List",
    group: "การวางแผน",
    section: "planner",
    sub: "projects",
    icon: ListTodo,
  },
  {
    id: "planner:feedback",
    label: "Feedback ลูกค้า",
    group: "การวางแผน",
    section: "planner",
    sub: "feedback",
    icon: MessageSquare,
  },
  {
    id: "mydata:portfolio",
    label: "Portfolio",
    group: "ข้อมูล",
    section: "mydata",
    sub: "portfolio",
    icon: IdCard,
  },
  {
    id: "mydata:clients",
    label: "ลูกค้า",
    group: "ข้อมูล",
    section: "mydata",
    sub: "clients",
    icon: Users,
  },
  {
    id: "mydata:suppliers",
    label: "Suppliers",
    group: "ข้อมูล",
    section: "mydata",
    sub: "suppliers",
    icon: Truck,
  },
  {
    id: "mydata:assets",
    label: "Assets",
    group: "ข้อมูล",
    section: "mydata",
    sub: "assets",
    icon: FolderOpen,
  },
  {
    id: "mydata:legal",
    label: "Legal Desk",
    group: "ข้อมูล",
    section: "mydata",
    sub: "legal",
    icon: Scale,
  },
  { id: "home", label: "Home", group: "อื่นๆ", section: "home", icon: Home },
  {
    id: "overview",
    label: "Dashboard",
    group: "อื่นๆ",
    section: "overview",
    icon: LayoutDashboard,
  },
  { id: "settings", label: "ตั้งค่า", group: "อื่นๆ", section: "settings", icon: Settings },
];

export function getShortcutOption(id: string): DashboardShortcutOption | undefined {
  return DASHBOARD_SHORTCUT_OPTIONS.find((o) => o.id === id);
}

export function normalizeShortcutIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((x): x is string => typeof x === "string")
    .filter((id) => getShortcutOption(id))
    .slice(0, DASHBOARD_SHORTCUT_MAX);
}

export const DASHBOARD_SHORTCUT_GROUPS = [
  ...new Set(DASHBOARD_SHORTCUT_OPTIONS.map((o) => o.group)),
];
