import * as React from "react";
import { Link } from "@tanstack/react-router";
import { ChevronDown } from "lucide-react";
import {
  LayoutDashboard,
  Users,
  Wallet,
  History,
  ArrowLeft,
  ShieldCheck,
  RefreshCw,
  Database,
  Rocket,
  BarChart3,
  Megaphone,
  MessageSquare,
  Ticket,
  LineChart,
  BookOpen,
  Smartphone,
  Bot,
  Image as ImageIcon,
  Link2,
  Receipt,
  Banknote,
  Cpu,
  HeartPulse,
  ExternalLink,
  Map,
} from "lucide-react";
import { OPS_HUB_URL } from "@/lib/productLinks";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import logoUrl from "@/assets/solo-freelancer-logo.webp";
import { Button } from "@/components/ui/button";

export type AdminSection =
  | "overview"
  | "activity_feed"
  | "early_access"
  | "users"
  | "chat"
  | "tickets"
  | "announcements"
  | "banners"
  | "articles"
  | "business"
  | "subscriptions"
  | "payments"
  | "feature_usage"
  | "activity"
  | "device"
  | "ai_usage"
  | "ai_center"
  | "health"
  | "usage"
  | "supabase"
  | "dev_tasks"
  | "ecosystem_ops";

export const ADMIN_SECTION_IDS: AdminSection[] = [
  "overview",
  "activity_feed",
  "users",
  "tickets",
  "chat",
  "early_access",
  "feature_usage",
  "activity",
  "device",
  "ai_usage",
  "ecosystem_ops",
  "business",
  "subscriptions",
  "payments",
  "announcements",
  "banners",
  "articles",
  "ai_center",
  "health",
  "usage",
  "supabase",
  "dev_tasks",
];

export function isAdminSection(value: string | undefined): value is AdminSection {
  return !!value && ADMIN_SECTION_IDS.includes(value as AdminSection);
}

interface SectionItem {
  id: AdminSection;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  sub: string;
  badge?: number;
}

const GROUPS: { label: string; items: SectionItem[] }[] = [
  {
    label: "ภาพรวม",
    items: [
      { id: "overview", label: "ภาพรวม", icon: LayoutDashboard, sub: "Overview" },
      { id: "dev_tasks", label: "แผนพัฒนา", icon: Map, sub: "Ops tracking → tasks" },
      { id: "activity_feed", label: "ไทม์ไลน์", icon: History, sub: "Activity Feed" },
    ],
  },
  {
    label: "ผู้ใช้ & Support",
    items: [
      { id: "users", label: "สมาชิก", icon: Users, sub: "Users & Growth" },
      { id: "tickets", label: "ตั๋ว & ฟีดแบ็ก", icon: Ticket, sub: "Feedback & Tickets" },
      { id: "chat", label: "แชท", icon: MessageSquare, sub: "User Chat" },
      { id: "early_access", label: "Early Access", icon: Rocket, sub: "Tester program" },
    ],
  },
  {
    label: "วิเคราะห์การใช้งาน",
    items: [
      { id: "feature_usage", label: "ฟีเจอร์ยอดนิยม", icon: BarChart3, sub: "Feature Usage" },
      { id: "activity", label: "รูปแบบการใช้", icon: LineChart, sub: "Activity Stats" },
      { id: "device", label: "อุปกรณ์", icon: Smartphone, sub: "Device Analytics" },
      { id: "ai_usage", label: "AI Monitor", icon: Bot, sub: "Usage & Gemini cost" },
      { id: "ecosystem_ops", label: "Ecosystem Ops", icon: Link2, sub: "Drill + Meeting" },
    ],
  },
  {
    label: "ธุรกิจ",
    items: [
      { id: "business", label: "KPI", icon: Wallet, sub: "Business KPIs" },
      { id: "subscriptions", label: "Subscriptions", icon: Receipt, sub: "Subs + Top Apps" },
      { id: "payments", label: "Payments", icon: Banknote, sub: "Stripe events" },
    ],
  },
  {
    label: "คอนเทนต์",
    items: [
      { id: "announcements", label: "ประกาศ", icon: Megaphone, sub: "Announcements" },
      { id: "banners", label: "แบนเนอร์", icon: ImageIcon, sub: "Login + Dashboard" },
      { id: "articles", label: "บทความ", icon: BookOpen, sub: "Blog & SEO" },
    ],
  },
  {
    label: "ระบบ",
    items: [
      { id: "ai_center", label: "AI Center", icon: Cpu, sub: "Control + Price + HQ" },
      { id: "health", label: "สุขภาพระบบ", icon: HeartPulse, sub: "System Health" },
      { id: "usage", label: "Storage & Quota", icon: Database, sub: "Disk usage" },
      { id: "supabase", label: "Supabase", icon: Link2, sub: "Connected project" },
    ],
  },
];

function groupForSection(section: AdminSection): string | undefined {
  return GROUPS.find((g) => g.items.some((s) => s.id === section))?.label;
}

export function AdminSidebar({
  active,
  setActive,
  onRefresh,
  refreshing,
  ticketBadge = 0,
}: {
  active: AdminSection;
  setActive: (s: AdminSection) => void;
  onRefresh: () => void;
  refreshing: boolean;
  ticketBadge?: number;
}) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const [openGroups, setOpenGroups] = React.useState<Record<string, boolean>>(() => {
    const activeGroup = groupForSection(active);
    return Object.fromEntries(
      GROUPS.map((g) => [g.label, g.label === activeGroup || g.label === "ภาพรวม"]),
    );
  });

  React.useEffect(() => {
    const label = groupForSection(active);
    if (label) {
      setOpenGroups((s) => ({ ...s, [label]: true }));
    }
  }, [active]);

  const toggleGroup = (label: string) => setOpenGroups((s) => ({ ...s, [label]: !s[label] }));

  return (
    <Sidebar collapsible="icon" className="border-r border-border">
      <SidebarHeader className="border-b border-border">
        <div className="flex items-center gap-2.5 px-1 py-1.5">
          <img
            src={logoUrl}
            alt="logo"
            className="h-9 w-9 rounded-xl object-cover shadow-soft ring-1 ring-border shrink-0"
          />
          {!collapsed && (
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-primary shrink-0" />
                <span className="text-sm font-semibold tracking-tight truncate">
                  Mission Control
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5 truncate">Solo founder mode</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        {GROUPS.map((g) => {
          const isOpen = collapsed || openGroups[g.label];
          return (
            <SidebarGroup key={g.label}>
              {!collapsed && (
                <button
                  type="button"
                  onClick={() => toggleGroup(g.label)}
                  className="w-full flex items-center justify-between px-2 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-medium hover:text-foreground transition-colors"
                >
                  <span>{g.label}</span>
                  <ChevronDown
                    className={`h-3 w-3 transition-transform ${isOpen ? "" : "-rotate-90"}`}
                  />
                </button>
              )}
              {isOpen && (
                <SidebarGroupContent>
                  <SidebarMenu>
                    {g.items.map((s) => {
                      const Icon = s.icon;
                      const isActive = active === s.id;
                      const badge = s.id === "tickets" ? ticketBadge : s.badge;
                      return (
                        <SidebarMenuItem key={s.id}>
                          <SidebarMenuButton
                            isActive={isActive}
                            onClick={() => setActive(s.id)}
                            tooltip={s.label}
                            className="gap-2"
                          >
                            <Icon className="h-4 w-4 shrink-0" />
                            {!collapsed && (
                              <div className="flex flex-col items-start min-w-0 flex-1">
                                <span className="text-xs font-medium truncate flex items-center gap-1.5 w-full">
                                  {s.label}
                                  {badge != null && badge > 0 && (
                                    <span className="ml-auto inline-flex min-w-4 h-4 px-1 rounded-full bg-[#FF5F05] text-white text-[9px] font-bold items-center justify-center">
                                      {badge > 99 ? "99+" : badge}
                                    </span>
                                  )}
                                </span>
                                <span className="text-[9px] text-muted-foreground truncate">
                                  {s.sub}
                                </span>
                              </div>
                            )}
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
              )}
            </SidebarGroup>
          );
        })}
        <SidebarGroup>
          <SidebarGroupLabel>ทางลัด</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="กลับหน้าฟีด">
                  <Link to="/" className="gap-2">
                    <ArrowLeft className="h-4 w-4 shrink-0" />
                    {!collapsed && <span className="text-xs">หน้าฟีด</span>}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="ไป Dashboard ผู้ใช้">
                  <Link to="/dashboard" className="gap-2">
                    <LayoutDashboard className="h-4 w-4 shrink-0" />
                    {!collapsed && <span className="text-xs">My Desk</span>}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Ops Hub — monitor รวม So1o + Pixel100">
                  <a href={OPS_HUB_URL} target="_blank" rel="noopener noreferrer" className="gap-2">
                    <ExternalLink className="h-4 w-4 shrink-0" />
                    {!collapsed && <span className="text-xs">Ops Hub</span>}
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-border">
        <Button
          size="sm"
          variant="ghost"
          onClick={onRefresh}
          disabled={refreshing}
          className="w-full justify-start gap-2 h-9"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
          {!collapsed && <span className="text-xs">รีเฟรชข้อมูล</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
