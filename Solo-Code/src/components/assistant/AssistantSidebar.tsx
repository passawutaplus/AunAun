import * as React from "react";
import { Link } from "@tanstack/react-router";
import { Sparkles, X, Minimize2, BarChart3, PenLine, Scale, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useAssistant, type AssistantPreset } from "@/context/AssistantContext";
import { ASSISTANT_PRESETS, getPresetConfig } from "@/lib/aiAssistantPresets";
import { AssistantChatPanel, AssistantCreditBar } from "./AssistantChatPanel";
import { useAuth } from "@/auth/AuthProvider";
import { useIsMobile } from "@/hooks/use-mobile";
import { useResizableSidebar, SIDEBAR_MIN_WIDTH } from "@/hooks/useResizableSidebar";
import { cn } from "@/lib/utils";

const PRESET_ICONS: Record<AssistantPreset, typeof Sparkles> = {
  mentor: Sparkles,
  business: BarChart3,
  copy: PenLine,
  legal: Scale,
};

function PresetPicker({
  preset,
  onSelect,
}: {
  preset: AssistantPreset;
  onSelect: (p: AssistantPreset) => void;
}) {
  return (
    <div className="flex gap-1 p-2 border-b border-border overflow-x-auto shrink-0">
      {ASSISTANT_PRESETS.map((p) => {
        const Icon = PRESET_ICONS[p.id];
        const active = preset === p.id;
        return (
          <button
            key={p.id}
            type="button"
            onClick={() => onSelect(p.id)}
            className={cn(
              "flex items-center gap-1.5 shrink-0 rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition-colors",
              active
                ? "bg-primary/15 text-primary border border-primary/30"
                : "text-muted-foreground hover:bg-muted hover:text-foreground border border-transparent",
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {p.shortLabel}
          </button>
        );
      })}
    </div>
  );
}

function SidebarInner({
  active,
  onCloseLimitCta,
}: {
  active: boolean;
  onCloseLimitCta?: () => void;
}) {
  const { preset, setPreset } = useAssistant();

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <PresetPicker preset={preset} onSelect={setPreset} />
      <AssistantChatPanel preset={preset} active={active} onCloseLimitCta={onCloseLimitCta} />
    </div>
  );
}

function SidebarChrome({
  children,
  onClose,
  onCollapse,
}: {
  children: React.ReactNode;
  onClose: () => void;
  onCollapse: () => void;
}) {
  const { preset } = useAssistant();
  const presetConfig = getPresetConfig(preset);

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center justify-between p-3 border-b border-border bg-gradient-to-r from-primary/10 to-transparent shrink-0">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            {presetConfig.label}
          </div>
          <AssistantCreditBar />
        </div>
        <div className="flex items-center gap-1 shrink-0 ml-2">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0"
            title="ย่อเป็น mini chat"
            onClick={onCollapse}
          >
            <Minimize2 className="h-3.5 w-3.5" />
          </Button>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
      {children}
      <div className="px-3 py-2 border-t border-border shrink-0">
        <Link
          to="/creative-partner"
          onClick={onClose}
          className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary transition-colors"
        >
          <ExternalLink className="h-3 w-3" />
          เปิดแบบเต็มหน้า
        </Link>
      </div>
    </div>
  );
}

export function AssistantSidebar() {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const { view, close, collapseToMini, sidebarWidth, setSidebarWidth } = useAssistant();
  const open = view === "sidebar";
  const { width, onResizePointerDown, onResizePointerMove, onResizePointerUp } =
    useResizableSidebar(close, sidebarWidth, setSidebarWidth);

  if (!user) return null;

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={(o) => !o && close()}>
        <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col gap-0">
          <SidebarChrome onClose={close} onCollapse={collapseToMini}>
            <SidebarInner active={open} onCloseLimitCta={close} />
          </SidebarChrome>
        </SheetContent>
      </Sheet>
    );
  }

  if (!open) return null;

  return (
    <aside
      className="fixed inset-y-0 right-0 z-[70] border-l border-border bg-card shadow-elevated flex flex-col animate-fade-in"
      style={{ width: Math.max(SIDEBAR_MIN_WIDTH, width) }}
      aria-label="So1o Assistant sidebar"
    >
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="ลากปรับความกว้าง · ลากไปขวาสุดเพื่อปิด"
        title="ลากปรับความกว้าง · ลากไปขวาสุดเพื่อปิด"
        className="absolute left-0 top-0 bottom-0 w-1.5 cursor-ew-resize hover:bg-primary/20 active:bg-primary/30 z-10 touch-none"
        onPointerDown={onResizePointerDown}
        onPointerMove={onResizePointerMove}
        onPointerUp={onResizePointerUp}
        onPointerCancel={onResizePointerUp}
      />
      <SidebarChrome onClose={close} onCollapse={collapseToMini}>
        <SidebarInner active={open} onCloseLimitCta={close} />
      </SidebarChrome>
    </aside>
  );
}
