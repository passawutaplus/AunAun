import { Outlet, useLocation, NavLink } from "react-router-dom";
import { Menu } from "lucide-react";
import { useState } from "react";
import AdminGuard from "./AdminGuard";
import AdminLaunchGate from "./AdminLaunchGate";
import AdminSidebar from "./AdminSidebar";
import AdminAlertBanner from "./AdminAlertBanner";
import AdminQueueHints from "./AdminQueueHints";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export default function AdminLayout() {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);

  return (
    <AdminGuard>
      <div className="admin-theme min-h-screen bg-admin-bg text-admin-fg">
        <div className="flex">
          <AdminSidebar />
          <div className="flex-1 min-w-0">
            <header className="sticky top-0 z-20 bg-admin-bg/85 backdrop-blur-md border-b border-admin-border">
              <div className="flex items-center justify-between px-4 md:px-8 h-14">
                <div className="flex items-center gap-2">
                  <Sheet open={open} onOpenChange={setOpen}>
                    <SheetTrigger asChild>
                      <button className="md:hidden p-2 -ml-2 text-admin-fg" aria-label="menu">
                        <Menu className="w-5 h-5" />
                      </button>
                    </SheetTrigger>
                    <SheetContent side="left" className="p-0 w-64 bg-admin-surface border-admin-border">
                      <div onClick={() => setOpen(false)}>
                        <AdminSidebar />
                      </div>
                    </SheetContent>
                  </Sheet>
                  <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-admin-muted">
                    {pathname.replace("/admin", "admin") || "admin"}
                  </p>
                </div>
                <NavLink to="/" className="text-xs font-mono uppercase tracking-wider text-admin-muted hover:text-admin-accent">
                  exit
                </NavLink>
              </div>
            </header>
            <main className="px-4 md:px-8 py-6 md:py-8 max-w-[1400px]">
              <AdminAlertBanner />
              <AdminQueueHints />
              <AdminLaunchGate>
                <Outlet />
              </AdminLaunchGate>
            </main>
          </div>
        </div>
      </div>
    </AdminGuard>
  );
}
