import * as React from "react";
import { useRouterState } from "@tanstack/react-router";
import { FloatingChat } from "@/components/FloatingChat";
import { useAssistant } from "@/context/AssistantContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { DASH_MOBILE_NAV_SPACER_PX } from "@/lib/layoutConstants";

const MARGIN = 12;

function useModalOpen() {
  const [open, setOpen] = React.useState(false);
  React.useEffect(() => {
    if (typeof document === "undefined") return;
    const body = document.body;
    const check = () => {
      const scrollLocked = body.hasAttribute("data-scroll-locked");
      const dialogOpen = !!document.querySelector('[role="dialog"][data-state="open"]');
      setOpen(scrollLocked || dialogOpen);
    };
    check();
    const obs = new MutationObserver(check);
    obs.observe(body, { attributes: true, attributeFilter: ["data-scroll-locked", "data-state"] });
    obs.observe(document.documentElement, {
      attributes: true,
      subtree: true,
      attributeFilter: ["data-state"],
    });
    return () => obs.disconnect();
  }, []);
  return open;
}

/** AI chat FAB — pinned to bottom-right (above mobile dashboard nav when applicable). */
export function DraggableFabDock() {
  const modalOpen = useModalOpen();
  const { view, sidebarWidth } = useAssistant();
  const isMobile = useIsMobile();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isDashboard = pathname.startsWith("/dashboard");

  const rightOffset = view === "sidebar" && !isMobile ? sidebarWidth + MARGIN : MARGIN;
  const bottomOffset = isMobile && isDashboard ? DASH_MOBILE_NAV_SPACER_PX + MARGIN : 24;

  return (
    <div
      aria-hidden={modalOpen ? true : undefined}
      className="fixed z-[60] touch-none select-none"
      style={{
        right: rightOffset,
        bottom: `calc(${bottomOffset}px + env(safe-area-inset-bottom, 0px))`,
        transition:
          "right 0.25s cubic-bezier(0.2, 0.9, 0.3, 1), opacity 0.2s ease, transform 0.25s ease",
        opacity: modalOpen ? 0 : 1,
        transform: modalOpen ? "scale(0.85)" : "scale(1)",
        pointerEvents: modalOpen ? "none" : "auto",
      }}
    >
      <FloatingChat inline />
    </div>
  );
}
