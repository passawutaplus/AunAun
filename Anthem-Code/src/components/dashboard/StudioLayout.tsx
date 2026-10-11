import { Component, useState, type ErrorInfo, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "react-router-dom";
import { Menu } from "lucide-react";
import StudioSidebar from "@/components/dashboard/StudioSidebar";
import { BackButton } from "@/components/ui/BackButton";
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

/** Keeps the My Studio hero/nav if a child page throws. */
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

/** Shared My Studio shell: grouped sidebar on desktop, sheet menu on mobile. */
export default function StudioLayout({
  children,
  backTo = "/portfolio",
  backLabel = "กลับโปรไฟล์",
  className,
  padForBottomNav = true,
  showFooter = true,
}: Props) {
  const { pathname } = useLocation();
  const item = matchStudioItem(pathname);
  const [menuOpen, setMenuOpen] = useState(false);

  const overlay = (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-40 lg:hidden">
        <div className="pointer-events-auto flex items-center justify-between gap-3 px-4 pb-3 pt-[max(1.25rem,env(safe-area-inset-top))]">
          <BackButton to={backTo} label={backLabel} />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-full bg-background/90 shadow-sm"
            onClick={() => setMenuOpen(true)}
          >
            <Menu className="h-4 w-4" />
            เมนู
          </Button>
        </div>
    </div>
  );

  return (
    <div className={cn("min-h-screen bg-app-ambient", padForBottomNav && MOBILE_PAGE_BOTTOM_CLASS, className)}>
      {typeof document !== "undefined" ? createPortal(overlay, document.body) : overlay}

      <div className="studio-hero">
        <div className="relative mx-auto max-w-[100rem] px-4 pb-8 pt-[max(4.75rem,calc(env(safe-area-inset-top)+3.5rem))] lg:px-8 lg:pb-10 lg:pt-8">
          <div className="hidden lg:block">
            <BackButton to={backTo} label={backLabel} />
          </div>
          <p className="mt-4 text-xs font-medium text-muted-foreground">My Studio</p>
          {item ? (
            <div className="mt-1">
              <h1 className="text-5xl font-light tracking-tight text-foreground sm:text-6xl lg:text-7xl">
                {item.heroTitle}
              </h1>
              <p className="mt-2 max-w-xl text-sm text-muted-foreground sm:text-base">{item.hint}</p>
            </div>
          ) : (
            <h1 className="mt-1 text-5xl font-light tracking-tight text-foreground sm:text-6xl lg:text-7xl">
              My Studio
            </h1>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-[100rem] px-4 py-6 pb-6 lg:flex lg:items-start lg:gap-6 lg:px-8 lg:pb-10">
        <aside className="sticky top-20 hidden w-52 shrink-0 lg:block xl:w-56">
          <StudioSidebar />
        </aside>
        <div className="min-w-0 flex-1 space-y-6">
          <StudioBodyErrorBoundary key={pathname}>{children}</StudioBodyErrorBoundary>
        </div>
      </div>

      {showFooter ? (
        <>
          <div className="h-14 lg:h-6" aria-hidden="true" />
          <Footer className="mt-0" />
        </>
      ) : null}

      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="left" className="w-[min(20rem,90vw)] p-0">
          <SheetHeader className="border-b border-border/70 px-4 py-4 text-left">
            <SheetTitle>My Studio</SheetTitle>
            <SheetDescription className="sr-only">เลือกหมวดที่ต้องการจัดการ</SheetDescription>
          </SheetHeader>
          <div className="p-3">
            <StudioSidebar variant="plain" onNavigate={() => setMenuOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
