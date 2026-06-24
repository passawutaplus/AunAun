import * as React from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  Building2,
  Kanban,
  LayoutDashboard,
  ListTodo,
  MessageSquare,
  Activity,
  Settings,
  PenTool,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NotificationBell } from "@/components/NotificationBell";
import type { InhouseOrg, InhouseWorkspace, InhouseWorkspaceView } from "@/lib/inhouse/types";
import { inhouseOrgSettingsPath, inhouseWorkspacePath, isInhouseAdmin } from "@/lib/inhouseAccess";
import { useInhouseWorkspaces } from "@/hooks/inhouse/useInhouseWorkspace";
import { useMyInhouseMembership } from "@/hooks/inhouse/useInhouseOrg";
import logoUrl from "@/assets/solo-freelancer-logo.webp";

const NAV_ITEMS: {
  view: InhouseWorkspaceView;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
}[] = [
  { view: "overview", label: "Overview", icon: LayoutDashboard },
  { view: "kanban", label: "Kanban", icon: Kanban },
  { view: "todos", label: "To Do", icon: ListTodo },
  { view: "chat", label: "Chat", icon: MessageSquare },
  { view: "canvas", label: "Canvas", icon: PenTool },
  { view: "monitor", label: "Monitor", icon: Activity, adminOnly: true },
  { view: "settings", label: "Settings", icon: Settings, adminOnly: true },
];

interface InhouseLayoutProps {
  org: InhouseOrg;
  workspace: InhouseWorkspace;
  view: InhouseWorkspaceView;
  children: React.ReactNode;
}

export function InhouseLayout({ org, workspace, view, children }: InhouseLayoutProps) {
  const navigate = useNavigate();
  const membership = useMyInhouseMembership(org.id);
  const { data: workspaces = [] } = useInhouseWorkspaces(org.id);
  const isAdmin = isInhouseAdmin(membership?.role);

  const visibleNav = NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
          <Link to="/dashboard" className="shrink-0">
            <img src={logoUrl} alt="So1o" className="h-8 w-auto" />
          </Link>
          <Button variant="ghost" size="icon" className="shrink-0" asChild>
            <Link to="/inhouse">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>

          <div className="flex min-w-0 flex-1 items-center gap-2">
            <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="truncate text-sm font-medium">{org.name}</span>
            <span className="text-muted-foreground">/</span>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="max-w-[200px] gap-1 truncate">
                  {workspace.name}
                  <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {workspaces.map((ws) => (
                  <DropdownMenuItem
                    key={ws.id}
                    onClick={() => navigate({ to: inhouseWorkspacePath(org.slug, ws.slug, view) })}
                  >
                    {ws.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <NotificationBell />
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl gap-0 px-4 py-6 lg:gap-6">
        <aside className="hidden w-48 shrink-0 lg:block">
          <nav className="sticky top-20 space-y-0.5">
            {visibleNav.map((item) => {
              const Icon = item.icon;
              const href =
                item.view === "settings"
                  ? inhouseOrgSettingsPath(org.slug)
                  : inhouseWorkspacePath(org.slug, workspace.slug, item.view);
              const active = item.view === "settings" ? view === "settings" : view === item.view;
              return (
                <Link
                  key={item.view}
                  to={href}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
                    active
                      ? "bg-primary/10 font-medium text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        <main className="min-w-0 flex-1 pb-24">
          <div className="mb-4 flex gap-1 overflow-x-auto pb-1 lg:hidden">
            {visibleNav.map((item) => {
              const Icon = item.icon;
              const href =
                item.view === "settings"
                  ? inhouseOrgSettingsPath(org.slug)
                  : inhouseWorkspacePath(org.slug, workspace.slug, item.view);
              const active = item.view === "settings" ? view === "settings" : view === item.view;
              return (
                <Link
                  key={item.view}
                  to={href}
                  className={cn(
                    "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {item.label}
                </Link>
              );
            })}
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
