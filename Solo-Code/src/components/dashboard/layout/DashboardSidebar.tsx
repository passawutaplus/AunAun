import * as React from "react";
import {
  LayoutDashboard,
  Home,
  Lightbulb,
  FileText,
  Workflow,
  CalendarDays,
  ListTodo,
  MessageSquare,
  Calculator,
  Coins,
  CreditCard,
  Users,
  Truck,
  FolderOpen,
  Settings,
  ChevronRight,
  Briefcase,
  Wallet,
  Database,
  Kanban,
  Scale,
  Mic,
  IdCard,
  FlaskConical,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import logoUrl from "@/assets/solo-freelancer-logo.webp";
import { PipelineNewDealButton } from "./PipelineNewDealButton";
import { AccountIdentityBadge } from "@/components/dashboard/AccountIdentityBadge";
import { SupportSidebarButton } from "./SupportSidebarButton";
import { SupportFab } from "@/components/support/SupportFab";
import { SidebarUpgradeBadge } from "./SidebarUpgradeBadge";
import { SidebarCreditAiStrip } from "./SidebarCreditAiStrip";
import { InhouseSidebarNav } from "@/components/inhouse/InhouseSidebarNav";

export type DashSection = "home" | "overview" | "finance" | "planner" | "mydata" | "settings";

interface DashboardSidebarProps {
  active: DashSection;
  activeSub?: string;
  setActive: (s: DashSection, sub?: string) => void;
}

interface NavLeaf {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  section: DashSection;
  sub?: string;
}

interface NavGroup {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  items: NavLeaf[];
}

const GROUPS: NavGroup[] = [
  {
    label: "Client Work",
    icon: Briefcase,
    items: [
      { label: "Pipeline", icon: Kanban, section: "finance", sub: "pipeline" },
      { label: "Meeting", icon: Mic, section: "planner", sub: "meetings" },
      { label: "Smart Brief", icon: Lightbulb, section: "planner", sub: "briefs" },
      { label: "Quotation", icon: FileText, section: "finance", sub: "quotations" },
      { label: "Job Tracker", icon: Workflow, section: "finance", sub: "jobs" },
    ],
  },
  {
    label: "Finance",
    icon: Wallet,
    items: [
      { label: "Income", icon: Coins, section: "finance", sub: "income" },
      { label: "Tax", icon: Calculator, section: "finance", sub: "tax" },
      { label: "Subscription", icon: CreditCard, section: "finance", sub: "subs" },
    ],
  },
  {
    label: "Planning",
    icon: CalendarDays,
    items: [
      { label: "Content", icon: CalendarDays, section: "planner", sub: "content" },
      { label: "To Do List", icon: ListTodo, section: "planner", sub: "projects" },
      { label: "Feedback", icon: MessageSquare, section: "planner", sub: "feedback" },
    ],
  },
  {
    label: "Data",
    icon: Database,
    items: [
      { label: "Portfolio", icon: IdCard, section: "mydata", sub: "portfolio" },
      { label: "Clients", icon: Users, section: "mydata", sub: "clients" },
      { label: "Suppliers", icon: Truck, section: "mydata", sub: "suppliers" },
      { label: "Assets", icon: FolderOpen, section: "mydata", sub: "assets" },
      { label: "Legal Desk", icon: Scale, section: "mydata", sub: "legal" },
    ],
  },
];

const MENU_BTN =
  "gap-2.5 text-white hover:bg-white/15 hover:text-white data-[active=true]:bg-white/25 data-[active=true]:text-white";

const SUB_BTN =
  "text-white/90 hover:bg-white/15 hover:text-white data-[active=true]:bg-white/20 data-[active=true]:text-white border-white/20";

const SIDEBAR_STYLE = {
  "--sidebar-background": "transparent",
  "--sidebar-foreground": "#ffffff",
  "--sidebar-accent": "rgba(255,255,255,0.20)",
  "--sidebar-accent-foreground": "#ffffff",
  "--sidebar-border": "rgba(255,255,255,0.18)",
  "--sidebar-ring": "rgba(255,255,255,0.4)",
} as React.CSSProperties;

function groupHasActiveItem(group: NavGroup, active: DashSection, activeSub?: string): boolean {
  return group.items.some(
    (leaf) => active === leaf.section && (leaf.sub ? activeSub === leaf.sub : true),
  );
}

function NavCollapsibleGroup({
  group,
  collapsed,
  active,
  activeSub,
  setActive,
}: {
  group: NavGroup;
  collapsed: boolean;
  active: DashSection;
  activeSub?: string;
  setActive: (s: DashSection, sub?: string) => void;
}) {
  const hasActiveChild = groupHasActiveItem(group, active, activeSub);
  const [open, setOpen] = React.useState(hasActiveChild);
  const GroupIcon = group.icon;

  React.useEffect(() => {
    if (hasActiveChild) setOpen(true);
  }, [hasActiveChild]);

  const isLeafActive = (leaf: NavLeaf) =>
    active === leaf.section && (leaf.sub ? activeSub === leaf.sub : true);

  if (collapsed) {
    const target = group.items.find((leaf) => isLeafActive(leaf)) ?? group.items[0];
    return (
      <SidebarMenuItem>
        <SidebarMenuButton
          isActive={hasActiveChild}
          onClick={() => setActive(target.section, target.sub)}
          tooltip={group.label}
          className={MENU_BTN}
        >
          <GroupIcon className="h-4 w-4 shrink-0" />
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="group/collapsible">
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton
            isActive={hasActiveChild}
            className={cn(MENU_BTN, "w-full")}
            tooltip={group.label}
          >
            <GroupIcon className="h-4 w-4 shrink-0" />
            <span className="text-xs font-medium truncate flex-1 text-left">{group.label}</span>
            <ChevronRight
              className={cn(
                "h-3.5 w-3.5 shrink-0 text-white/70 transition-transform duration-200",
                "group-data-[state=open]/collapsible:rotate-90",
              )}
            />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub className="border-white/20 mx-0 translate-x-0 px-1">
            {group.items.map((leaf) => {
              const Icon = leaf.icon;
              const activeLeaf = isLeafActive(leaf);
              return (
                <SidebarMenuSubItem key={leaf.label}>
                  <SidebarMenuSubButton asChild size="sm" isActive={activeLeaf} className={SUB_BTN}>
                    <button
                      type="button"
                      onClick={() => setActive(leaf.section, leaf.sub)}
                      className="w-full"
                    >
                      <Icon className="h-3.5 w-3.5 shrink-0 opacity-80" />
                      <span>{leaf.label}</span>
                    </button>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              );
            })}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
}

export function DashboardSidebar({ active, activeSub, setActive }: DashboardSidebarProps) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const [supportOpen, setSupportOpen] = React.useState(false);

  React.useEffect(() => {
    document.body.classList.add("dash-sidebar-gradient");
    return () => document.body.classList.remove("dash-sidebar-gradient");
  }, []);

  return (
    <Sidebar collapsible="icon" className="border-r-0" style={SIDEBAR_STYLE}>
      <SidebarHeader className="border-b border-white/15">
        <div className="flex items-center gap-2.5 px-1 py-1.5">
          <div className="shrink-0 rounded-xl bg-white p-1 shadow-soft">
            <img src={logoUrl} alt="So1o" className="h-7 w-7 rounded-md object-cover" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="text-sm font-semibold tracking-tight truncate text-white">
                So<span className="text-white">1</span>o Freelancer
              </div>
              <p className="text-[10px] text-white/80 mt-0.5 truncate">My Desk</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="gap-0.5">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarCreditAiStrip
                collapsed={collapsed}
                onOpenSettings={() => setActive("settings")}
              />
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={active === "home"}
                  onClick={() => setActive("home")}
                  tooltip="Home"
                  className={cn(MENU_BTN, "font-semibold")}
                >
                  <Home className="h-4 w-4 shrink-0" />
                  {!collapsed && <span className="text-xs">Home</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={active === "overview"}
                  onClick={() => setActive("overview")}
                  tooltip="Dashboard"
                  className={cn(MENU_BTN, "font-semibold")}
                >
                  <LayoutDashboard className="h-4 w-4 shrink-0" />
                  {!collapsed && <span className="text-xs">Dashboard</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Creative Labs" className={cn(MENU_BTN, "font-semibold")}>
                  <Link to="/labs">
                    <FlaskConical className="h-4 w-4 shrink-0" />
                    {!collapsed && <span className="text-xs">Creative Labs</span>}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {GROUPS.map((group, idx) => (
                <React.Fragment key={group.label}>
                  <NavCollapsibleGroup
                    group={group}
                    collapsed={collapsed}
                    active={active}
                    activeSub={activeSub}
                    setActive={setActive}
                  />
                  {idx === 0 && <InhouseSidebarNav collapsed={collapsed} />}
                </React.Fragment>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-white/15 p-2 gap-1.5 overflow-hidden min-w-0">
        <PipelineNewDealButton
          variant="sidebar"
          collapsed={collapsed}
          onNavigate={(tab, sub) => setActive(tab as DashSection, sub)}
        />

        <SidebarMenu
          className={cn("min-w-0 grid gap-1.5", collapsed ? "grid-cols-1" : "grid-cols-2")}
        >
          <SidebarMenuItem className="min-w-0">
            <SidebarMenuButton
              isActive={active === "settings"}
              onClick={() => setActive("settings")}
              tooltip="Settings"
              className={cn(MENU_BTN, "w-full justify-center")}
            >
              <Settings className="h-4 w-4 shrink-0" />
              {!collapsed && <span className="text-xs font-medium truncate">Settings</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem className="min-w-0">
            <SupportSidebarButton collapsed={collapsed} onOpen={() => setSupportOpen(true)} />
          </SidebarMenuItem>
        </SidebarMenu>

        <AccountIdentityBadge collapsed={collapsed} />
        <SidebarUpgradeBadge collapsed={collapsed} />
      </SidebarFooter>

      <SupportFab hiddenTrigger forceOpen={supportOpen} onClose={() => setSupportOpen(false)} />
    </Sidebar>
  );
}
