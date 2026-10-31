import { Component, useState, type ErrorInfo, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, Plus } from "lucide-react";
import StudioSearch from "@/components/dashboard/StudioSearch";
import StudioSidebar from "@/components/dashboard/StudioSidebar";
import { HeaderAccountActions } from "@/components/HeaderAccountActions";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { matchStudioItem } from "@/lib/studioNav";
import { MOBILE_PAGE_BOTTOM_CLASS } from "@/lib/mobileLayout";
import { cn } from "@/lib/utils";
import Footer from "@/components/Footer";

type Props = {
  children: ReactNode;
  backTo?: string;
  backLabel?: string;
  className?: string;
  padForBottomNav?: boolean;
  showFooter?: boolean;
  /** Shown beside the page title, e.g. the tour "?" button. */
  titleAccessory?: ReactNode;
};

/** Keeps the My Studio shell if a child page throws. */
class StudioBodyErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[StudioLayout]", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-xl border border-border bg-card px-4 py-8 text-center text-sm text-muted-foreground">
          โหลดส่วนนี้ไม่สำเร็จ กรุณารีเฟรชหน้า
        </div>
      );
    }
    return this.props.children;
  }
}

/** Warm ground behind the sidebar; the content sits on it as one rounded panel (flat, no gradient). */
const STUDIO_SIDEBAR_BG = "bg-[hsl(var(--studio-side))]";
const STUDIO_PANEL_BG = "bg-[hsl(var(--studio-panel))]";

const COLLAPSE_KEY = "samecor:studio-sidebar-collapsed";

function readCollapsed() {
  try {
    return localStorage.getItem(COLLAPSE_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * My Studio back-office shell: full-height sidebar on the left (collapsible to icons) and the content as one
 * rounded panel with search, the publish button and account actions on top. Phones get the same sidebar in a sheet.
 */
export default function StudioLayout({
  children,
  className,
  padForBottomNav = true,
  showFooter = false,
  titleAccessory,
}: Props) {
  const { pathname } = useLocation();
  const item = matchStudioItem(pathname);
  const [menuOpen, setMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const title = item?.heroTitle ?? "My Studio";

  const toggleCollapsed = () => {
    setCollapsed((c) => {
      try {
        localStorage.setItem(COLLAPSE_KEY, c ? "0" : "1");
      } catch {
        /* storage blocked */
      }
      return !c;
    });
  };

  return (
    <div className={cn("min-h-screen lg:bg-[hsl(var(--studio-side))]", STUDIO_PANEL_BG, padForBottomNav && MOBILE_PAGE_BOTTOM_CLASS, className)}>
      <aside
        data-tour="studio-nav"
        className={cn(
          "fixed inset-y-0 left-0 z-30 hidden transition-[width] duration-200 lg:block",
          STUDIO_SIDEBAR_BG,
          collapsed ? "w-[76px]" : "w-[248px]",
        )}
      >
        <StudioSidebar collapsed={collapsed} onToggleCollapsed={toggleCollapsed} />
      </aside>

      <div className={cn("transition-[padding] duration-200 lg:py-3 lg:pr-3", collapsed ? "lg:pl-[76px]" : "lg:pl-[248px]")}>
        <div className={cn("min-h-screen lg:min-h-[calc(100vh-1.5rem)] lg:rounded-[28px]", STUDIO_PANEL_BG)}>
        <header className={cn("sticky top-0 z-20 lg:static lg:bg-transparent", STUDIO_PANEL_BG)}>
          <div className="mx-auto flex min-h-14 max-w-6xl items-center gap-2 px-4 pt-[env(safe-area-inset-top)] lg:gap-3 lg:px-8 lg:pt-5">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="-ml-2 lg:hidden"
              aria-label="เปิดเมนู My Studio"
              onClick={() => setMenuOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            {/* Phones have no sidebar on screen — keep the Thai page name here */}
            <p className="min-w-0 flex-1 truncate text-sm font-medium text-foreground lg:hidden">{title}</p>
            <StudioSearch className="lg:flex-1" />
            <Link
              to="/portfolio/new"
              className="hidden h-11 shrink-0 items-center justify-center gap-1.5 rounded-full bg-brand px-5 text-sm font-medium text-[#111] transition-transform hover:-translate-y-px lg:flex"
            >
              <Plus className="h-4 w-4" />
              ลงผลงานใหม่
            </Link>
            <HeaderAccountActions />
          </div>
        </header>

        <main className="mx-auto max-w-6xl space-y-6 px-4 py-6 lg:px-8 lg:py-8">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-4xl font-light tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                {item?.displayTitle ?? "My Studio"}
              </h1>
              {titleAccessory}
            </div>
            {item?.hint ? <p className="mt-2 text-sm text-muted-foreground">{item.hint}</p> : null}
          </div>
          <StudioBodyErrorBoundary key={pathname}>{children}</StudioBodyErrorBoundary>
        </main>

        {showFooter ? <Footer className="mt-0" /> : null}
        </div>
      </div>

      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="left" className={cn("w-[min(18rem,86vw)] p-0", STUDIO_SIDEBAR_BG)}>
          <SheetHeader className="sr-only">
            <SheetTitle>My Studio</SheetTitle>
            <SheetDescription>เลือกหมวดที่ต้องการจัดการ</SheetDescription>
          </SheetHeader>
          <StudioSidebar onNavigate={() => setMenuOpen(false)} />
        </SheetContent>
      </Sheet>
    </div>
  );
}
