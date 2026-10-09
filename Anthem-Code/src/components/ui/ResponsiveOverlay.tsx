import type { ReactNode } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: ReactNode;
  /** Screen-reader title when visual title lives in children. */
  accessibleTitle?: string;
  headerRight?: ReactNode;
  children: ReactNode;
  /** Desktop dialog max width class. */
  desktopClassName?: string;
  /** Mobile sheet height class. */
  sheetClassName?: string;
  /** Extra classes on the scrollable body. */
  bodyClassName?: string;
  /** Hide the default close affordance styling tweaks. */
  showGrabHandle?: boolean;
  /** Block outside click + Escape (onboarding / blocking flows). */
  preventDismiss?: boolean;
  /** Hide the built-in X close control. */
  hideCloseButton?: boolean;
  /** Paint above another overlay (nested picker / second popup). */
  stacked?: boolean;
  /** Paper + ink surface (hire / collab request). Stays light in dark mode. */
  tone?: "default" | "paper";
};

/**
 * Mobile → bottom sheet (~88dvh). Desktop → centered dialog.
 * Matches NotificationsDialog pattern without copying it per feature.
 */
export function ResponsiveOverlay({
  open,
  onOpenChange,
  title,
  accessibleTitle,
  headerRight,
  children,
  desktopClassName,
  sheetClassName,
  bodyClassName,
  showGrabHandle = true,
  preventDismiss = false,
  hideCloseButton = false,
  stacked = false,
  tone = "default",
}: Props) {
  const isMobile = useIsMobile();
  const srTitle = accessibleTitle?.trim() || undefined;
  const stackOverlayClass = stacked ? "z-[70]" : undefined;
  const stackContentClass = stacked ? "z-[71]" : undefined;
  const paper = tone === "paper";
  const overlayClassName = cn(paper && "bg-[#2f2e2c]/40", stackOverlayClass);
  const paperSurface = paper
    ? "paper-popup border-[#e4e1db] bg-[#f5f5f5] text-[#2f2e2c] shadow-[0_28px_80px_-36px_rgba(47,46,44,0.55)] [&>button]:text-[#2f2e2c]"
    : undefined;
  const blockDismiss = preventDismiss
    ? {
        onPointerDownOutside: (e: Event) => e.preventDefault(),
        onInteractOutside: (e: Event) => e.preventDefault(),
        onEscapeKeyDown: (e: KeyboardEvent) => e.preventDefault(),
      }
    : {};

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          overlayClassName={overlayClassName}
          className={cn(
            "flex flex-col gap-0 p-0 h-[min(88dvh,720px)] rounded-t-[1.35rem]",
            "border-x-0 border-b-0 border-t border-border/50",
            "shadow-[0_-8px_40px_rgba(0,0,0,0.12)]",
            hideCloseButton && "[&>button]:hidden",
            stackContentClass,
            sheetClassName,
            paper && "rounded-t-[1.75rem] border-0",
            paperSurface,
          )}
          aria-describedby={undefined}
          {...blockDismiss}
        >
          {showGrabHandle ? (
            <div className="shrink-0 flex flex-col items-center pt-2.5 pb-1">
              <span className="h-1 w-11 rounded-full bg-muted-foreground/25" aria-hidden />
            </div>
          ) : null}
          {(title || headerRight) && (
            <SheetHeader className="shrink-0 px-4 pb-3 border-b border-border/40 space-y-0">
              <div className="flex items-center justify-between gap-2 pr-8">
                {title ? (
                  <SheetTitle className="text-base font-semibold tracking-tight text-left">
                    {title}
                  </SheetTitle>
                ) : (
                  <span />
                )}
                {headerRight}
              </div>
            </SheetHeader>
          )}
          {!title && srTitle ? <SheetTitle className="sr-only">{srTitle}</SheetTitle> : null}
          <div
            className={cn(
              "flex flex-col flex-1 min-h-0 overflow-y-auto overscroll-contain",
              "px-4 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))]",
              bodyClassName,
            )}
          >
            {children}
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        overlayClassName={overlayClassName}
        className={cn(
          "flex flex-col gap-0 p-0 w-[calc(100%-2rem)] max-w-2xl",
          "max-h-[min(85vh,680px)] overflow-hidden rounded-2xl border-border/60 shadow-2xl",
          hideCloseButton && "[&>button]:hidden",
          stackContentClass,
          desktopClassName,
          paper && "rounded-[1.75rem] sm:rounded-[1.75rem]",
          paperSurface,
        )}
        aria-describedby={undefined}
        {...blockDismiss}
      >
        {(title || headerRight) && (
          <DialogHeader className="shrink-0 px-6 pt-6 pb-4 border-b border-border/40">
            <div className="flex items-center justify-between gap-2 pr-8">
              {title ? (
                <DialogTitle className="text-lg font-medium text-left">{title}</DialogTitle>
              ) : (
                <span />
              )}
              {headerRight}
            </div>
          </DialogHeader>
        )}
        <div
          className={cn(
            "flex flex-col flex-1 min-h-0 overflow-y-auto px-6 pt-4 pb-6",
            bodyClassName,
          )}
        >
          {children}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ResponsiveOverlay;
