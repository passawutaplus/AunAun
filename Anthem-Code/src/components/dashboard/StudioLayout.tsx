import { Component, useState, type ErrorInfo, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { Menu } from "lucide-react";
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

/** Warm paper → soft brand-orange wash, ink-dark in dark mode. */
const STUDIO_SIDEBAR_BG =
  "bg-[radial-gradient(120%_60%_at_0%_100%,rgba(243,154,74,0.35),transparent_70%),linear-gradient(to_bottom,#fbf8f4,#f9ede1_55%,#f4cfae)] dark:bg-[radial-gradient(120%_60%_at_0%_100%,rgba(243,154,74,0.22),transparent_70%),linear-gradient(to_bottom,#1f1e1c,#26211c_55%,#3d2717)]";

const COLLAPSE_KEY = "samecor:studio-sidebar-collapsed";

function readCollapsed() {
  try {
    return localStorage.getItem(COLLAPSE_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * My Studio back-office shell: full-height sidebar on the left (collapsible to icons), a slim top bar with the
 * page title and account actions, no site header/footer. Phones get the same sidebar in a sheet.
 */
export default function StudioLayout({
  children,
  className,
  padForBottomNav = true,
  showFooter = false,
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
    <div className={cn("min-h-screen bg-background", padForBottomNav && MOBILE_PAGE_BOTTOM_CLASS, className)}>
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 hidden border-r border-border/60 transition-[width] duration-200 lg:block",
          STUDIO_SIDEBAR_BG,
          collapsed ? "w-16" : "w-60",
        )}
      >
        <StudioSidebar collapsed={collapsed} onToggleCollapsed={toggleCollapsed} />
      </aside>

      <div className={cn("transition-[padding] duration-200", collapsed ? "lg:pl-16" : "lg:pl-60")}>
        <header className="sticky top-0 z-20 bg-background/85 backdrop-blur-xl lg:static lg:bg-transparent lg:backdrop-blur-0">
          <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4 pt-[env(safe-area-inset-top)] lg:px-8">
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
            <div className="hidden flex-1 lg:block" />
            <HeaderAccountActions />
          </div>
        </header>

        <main className="mx-auto max-w-6xl space-y-6 px-4 py-6 lg:px-8 lg:py-8">
          <div>
            <h1 className="text-4xl font-light tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              {item?.displayTitle ?? "My Studio"}
            </h1>
            {item?.hint ? <p className="mt-2 text-sm text-muted-foreground">{item.hint}</p> : null}
          </div>
          <StudioBodyErrorBoundary key={pathname}>{children}</StudioBodyErrorBoundary>
        </main>

        {showFooter ? <Footer className="mt-0" /> : null}
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
