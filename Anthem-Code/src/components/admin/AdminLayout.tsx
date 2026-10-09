import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { ChevronRight, LogOut, Menu, Search } from "lucide-react";
import AdminGuard from "./AdminGuard";
import AdminLaunchGate from "./AdminLaunchGate";
import AdminSidebar from "./AdminSidebar";
import AdminAlertBanner from "./AdminAlertBanner";
import AdminCommandMenu from "./AdminCommandMenu";
import AdminDbGapNotice from "./AdminDbGapNotice";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ADMIN_TONE } from "@/lib/admin/adminTone";
import { adminPageMeta } from "@/lib/admin/adminNavigation";
import { cn } from "@/lib/utils";

function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  return el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName);
}

export default function AdminLayout() {
  const { pathname } = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const meta = adminPageMeta(pathname);

  // Ctrl/⌘+K anywhere; "/" when not typing.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((o) => !o);
      } else if (e.key === "/" && !e.ctrlKey && !e.metaKey && !e.altKey && !isTypingTarget(e.target)) {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const openSearch = () => {
    setDrawerOpen(false);
    setSearchOpen(true);
  };

  return (
    <AdminGuard>
      <div className="admin-theme min-h-screen bg-admin-bg text-admin-fg">
        <div className="flex">
          <AdminSidebar onOpenSearch={openSearch} />
          <div className="min-w-0 flex-1">
            <header className="sticky top-0 z-20 border-b border-admin-border bg-admin-bg/85 backdrop-blur-md">
              <div className="flex h-14 items-center justify-between gap-3 px-4 md:px-8">
                <div className="flex min-w-0 items-center gap-2">
                  <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
                    <SheetTrigger asChild>
                      <button type="button" className="-ml-2 rounded-md p-2 text-admin-fg hover:bg-admin-hover md:hidden" aria-label="เปิดเมนู">
                        <Menu className="h-5 w-5" />
                      </button>
                    </SheetTrigger>
                    <SheetContent side="left" className="admin-theme w-72 border-admin-border bg-admin-surface p-0 sm:max-w-xs">
                      <SheetTitle className="sr-only">เมนูหลังบ้าน</SheetTitle>
                      <AdminSidebar variant="drawer" onNavigate={() => setDrawerOpen(false)} onOpenSearch={openSearch} />
                    </SheetContent>
                  </Sheet>

                  <nav aria-label="ตำแหน่งปัจจุบัน" className="flex min-w-0 items-center gap-1.5 text-sm">
                    {meta ? (
                      <>
                        <span className={cn("hidden h-6 w-6 shrink-0 items-center justify-center rounded sm:flex", ADMIN_TONE[meta.group.tone].chip)}>
                          <meta.group.icon className="h-3.5 w-3.5" />
                        </span>
                        {meta.item.end ? null : (
                          <>
                            <span className="hidden text-admin-muted sm:inline">{meta.group.title}</span>
                            <ChevronRight className="hidden h-3.5 w-3.5 shrink-0 text-admin-muted sm:block" aria-hidden />
                          </>
                        )}
                        <span className="truncate font-medium text-admin-fg">{meta.item.label}</span>
                      </>
                    ) : (
                      <span className="truncate font-mono text-[11px] uppercase tracking-[0.18em] text-admin-muted">
                        {pathname.replace("/admin", "admin") || "admin"}
                      </span>
                    )}
                  </nav>
                </div>

                <div className="flex shrink-0 items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setSearchOpen(true)}
                    className="flex items-center gap-2 rounded-md border border-admin-border px-2.5 py-1.5 text-xs text-admin-muted transition-colors hover:border-admin-fg/40 hover:text-admin-fg"
                    aria-label="ค้นหาเมนู"
                  >
                    <Search className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">ค้นหา</span>
                    <kbd className="hidden rounded border border-admin-border px-1 font-mono text-[10px] md:inline">Ctrl K</kbd>
                  </button>
                  <NavLink
                    to="/"
                    className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs text-admin-muted transition-colors hover:bg-admin-hover hover:text-admin-fg"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">ออกไปหน้าเว็บ</span>
                  </NavLink>
                </div>
              </div>
            </header>

            <main className="max-w-[1400px] px-4 py-6 md:px-8 md:py-8">
              <AdminAlertBanner />
              <AdminDbGapNotice pathname={pathname} />
              <AdminLaunchGate>
                <Outlet />
              </AdminLaunchGate>
            </main>
          </div>
        </div>
        <AdminCommandMenu open={searchOpen} onOpenChange={setSearchOpen} />
      </div>
    </AdminGuard>
  );
}
