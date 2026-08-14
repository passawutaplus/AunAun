import { NavLink, Outlet } from "react-router-dom";
import { MOBILE_PAGE_BOTTOM_CLASS } from "@/lib/mobileLayout";
import { cn } from "@/lib/utils";

const navClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    "whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
    isActive
      ? "bg-foreground text-background"
      : "text-muted-foreground hover:bg-accent hover:text-foreground",
  );

export function HelpShell() {
  return (
    <main className={cn("min-h-screen bg-app-ambient", MOBILE_PAGE_BOTTOM_CLASS)}>
      {/* Mobile-only section tabs — desktop uses DesktopTopNav site chrome */}
      <div className="sticky top-0 z-30 border-b border-border/40 bg-background/40 backdrop-blur-xl supports-[backdrop-filter]:bg-background/30 lg:hidden">
        <div className="mx-auto flex max-w-5xl items-center gap-2 overflow-x-auto px-4 py-2.5 sm:px-6 scrollbar-none">
          <NavLink to="/help" end className={navClass}>
            Help
          </NavLink>
          <NavLink to="/learn" className={navClass}>
            Learn more
          </NavLink>
        </div>
      </div>
      <Outlet />
    </main>
  );
}
