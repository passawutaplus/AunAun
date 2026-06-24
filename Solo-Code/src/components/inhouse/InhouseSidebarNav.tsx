import * as React from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  Building2,
  ChevronRight,
  Kanban,
  LayoutDashboard,
  ListTodo,
  MessageSquare,
  Activity,
  Settings,
  PenTool,
  Plus,
} from "lucide-react";
import {
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { useMyInhouseOrgs, useMyInhouseMembership } from "@/hooks/inhouse/useInhouseOrg";
import { useInhouseWorkspaces } from "@/hooks/inhouse/useInhouseWorkspace";
import { useSubscription } from "@/hooks/useSubscription";
import {
  canAccessInhouse,
  canCreateInhouseOrg,
  inhouseOrgSettingsPath,
  inhouseWorkspacePath,
  isInhouseAdmin,
  isInhouseWorkspaceEnabled,
} from "@/lib/inhouseAccess";

const MENU_BTN =
  "gap-2.5 text-white hover:bg-white/15 hover:text-white data-[active=true]:bg-white/25 data-[active=true]:text-white";

const SUB_BTN =
  "text-white/90 hover:bg-white/15 hover:text-white data-[active=true]:bg-white/20 data-[active=true]:text-white border-white/20";

interface OrgNavProps {
  orgId: string;
  orgSlug: string;
  orgName: string;
  collapsed: boolean;
}

function OrgWorkspaceNav({ orgId, orgSlug, orgName, collapsed }: OrgNavProps) {
  const membership = useMyInhouseMembership(orgId);
  const { data: workspaces = [] } = useInhouseWorkspaces(orgId);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isAdmin = isInhouseAdmin(membership?.role);
  const primaryWs = workspaces[0];
  const [open, setOpen] = React.useState(pathname.includes(`/inhouse/${orgSlug}`));

  React.useEffect(() => {
    if (pathname.includes(`/inhouse/${orgSlug}`)) setOpen(true);
  }, [pathname, orgSlug]);

  const wsSlug = primaryWs?.slug;
  const base = wsSlug ? inhouseWorkspacePath(orgSlug, wsSlug) : `/inhouse/${orgSlug}/settings`;

  const links = [
    {
      label: "Overview",
      href: base,
      icon: LayoutDashboard,
      match: (p: string) => p === base || p === `${base}/`,
    },
    ...(wsSlug
      ? [
          {
            label: "Kanban",
            href: inhouseWorkspacePath(orgSlug, wsSlug, "kanban"),
            icon: Kanban,
            match: (p: string) => p.includes("/kanban"),
          },
          {
            label: "To Do",
            href: inhouseWorkspacePath(orgSlug, wsSlug, "todos"),
            icon: ListTodo,
            match: (p: string) => p.includes("/todos"),
          },
          {
            label: "Chat",
            href: inhouseWorkspacePath(orgSlug, wsSlug, "chat"),
            icon: MessageSquare,
            match: (p: string) => p.includes("/chat"),
          },
          {
            label: "Canvas",
            href: inhouseWorkspacePath(orgSlug, wsSlug, "canvas"),
            icon: PenTool,
            match: (p: string) => p.includes("/canvas"),
          },
          ...(isAdmin
            ? [
                {
                  label: "Monitor",
                  href: inhouseWorkspacePath(orgSlug, wsSlug, "monitor"),
                  icon: Activity,
                  match: (p: string) => p.includes("/monitor"),
                },
                {
                  label: "Settings",
                  href: inhouseOrgSettingsPath(orgSlug),
                  icon: Settings,
                  match: (p: string) => p.includes("/settings"),
                },
              ]
            : []),
        ]
      : []),
  ];

  if (collapsed) {
    return (
      <SidebarMenuItem>
        <SidebarMenuButton asChild tooltip={orgName} className={MENU_BTN}>
          <Link to={wsSlug ? base : "/inhouse"}>
            <Building2 className="h-4 w-4 shrink-0" />
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="group/collapsible">
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton className={cn(MENU_BTN, "w-full")} tooltip={orgName}>
            <Building2 className="h-4 w-4 shrink-0" />
            <span className="truncate flex-1 text-left text-xs font-medium">{orgName}</span>
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-white/70 transition-transform group-data-[state=open]/collapsible:rotate-90" />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub className="border-white/20 mx-0 translate-x-0 px-1">
            {links.map((link) => {
              const Icon = link.icon;
              const active = link.match(pathname);
              return (
                <SidebarMenuSubItem key={link.label}>
                  <SidebarMenuSubButton asChild size="sm" isActive={active} className={SUB_BTN}>
                    <Link to={link.href}>
                      <Icon className="h-3.5 w-3.5 shrink-0 opacity-80" />
                      <span>{link.label}</span>
                    </Link>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              );
            })}
            {workspaces.length > 1 && (
              <SidebarMenuSubItem>
                <SidebarMenuSubButton asChild size="sm" className={SUB_BTN}>
                  <Link to="/inhouse">
                    <Plus className="h-3.5 w-3.5 opacity-80" />
                    <span>สลับ workspace</span>
                  </Link>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            )}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );
}

export function InhouseSidebarNav({ collapsed }: { collapsed: boolean }) {
  const { tier } = useSubscription();
  const { data: orgs = [] } = useMyInhouseOrgs();
  if (!isInhouseWorkspaceEnabled()) return null;
  if (
    !canAccessInhouse(tier, []) &&
    orgs.length === 0 &&
    !canCreateInhouseOrg(tier)
  ) {
    return null;
  }

  if (orgs.length === 0 && canCreateInhouseOrg(tier)) {
    return (
      <SidebarMenuItem>
        <SidebarMenuButton asChild tooltip="ตั้งค่า In-House" className={MENU_BTN}>
          <Link to="/inhouse">
            <Building2 className="h-4 w-4 shrink-0" />
            {!collapsed && <span className="text-xs truncate">ตั้งค่า In-House</span>}
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  }

  return (
    <>
      {orgs.map((org) => (
        <OrgWorkspaceNav
          key={org.id}
          orgId={org.id}
          orgSlug={org.slug}
          orgName={org.name}
          collapsed={collapsed}
        />
      ))}
    </>
  );
}
