import * as React from "react";
import { useAssistant } from "@/context/AssistantContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

/** Shifts main app content left when the assistant sidebar is open (desktop). */
export function AssistantPushLayout({ children }: { children: React.ReactNode }) {
  const { view, sidebarWidth } = useAssistant();
  const isMobile = useIsMobile();
  const push = view === "sidebar" && !isMobile ? sidebarWidth : 0;

  React.useEffect(() => {
    document.documentElement.style.setProperty("--assistant-push", `${push}px`);
    return () => {
      document.documentElement.style.removeProperty("--assistant-push");
    };
  }, [push]);

  return (
    <div
      className={cn(
        "min-h-screen transition-[margin-right] duration-150 ease-out",
        push > 0 && "max-w-[calc(100vw-var(--assistant-push,0px))]",
      )}
      style={{ marginRight: push }}
    >
      {children}
    </div>
  );
}
