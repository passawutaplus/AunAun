import * as React from "react";
import { useAuth } from "@/auth/AuthProvider";
import { Button } from "@/components/ui/button";
import { Sparkles, X, PanelRightOpen } from "lucide-react";
import { useAssistant } from "@/context/AssistantContext";
import { AssistantChatPanel, AssistantCreditBar } from "@/components/assistant/AssistantChatPanel";
import { getPresetConfig } from "@/lib/aiAssistantPresets";

export function FloatingChat({
  inline = false,
  skipClickRef,
}: {
  inline?: boolean;
  skipClickRef?: React.MutableRefObject<boolean>;
} = {}) {
  const { user } = useAuth();
  const { view, preset, openMini, openSidebar, close } = useAssistant();
  const open = view === "mini";
  const presetConfig = getPresetConfig(preset);

  if (!user) return null;

  return (
    <>
      {view === "closed" && (
        <button
          onClick={() => {
            if (skipClickRef?.current) {
              skipClickRef.current = false;
              return;
            }
            openMini();
          }}
          aria-label="เปิด So1o Assistant"
          className={
            inline
              ? "h-12 w-12 rounded-full bg-gradient-primary text-primary-foreground shadow-elevated hover:scale-105 active:scale-95 transition-transform flex items-center justify-center group"
              : "fixed bottom-24 right-6 z-50 h-12 w-12 rounded-full bg-gradient-primary text-primary-foreground shadow-elevated hover:scale-105 active:scale-95 transition-transform flex items-center justify-center group"
          }
        >
          <Sparkles className="h-5 w-5 relative" />
        </button>
      )}

      {open && (
        <div className="fixed bottom-4 right-4 z-50 w-[92vw] sm:w-96 h-[70vh] sm:h-[560px] flex flex-col rounded-2xl border border-border bg-card shadow-elevated animate-fade-in">
          <div className="flex items-center justify-between p-3 border-b border-border bg-gradient-to-r from-primary/10 to-transparent rounded-t-2xl shrink-0">
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                {presetConfig.label}
              </div>
              <AssistantCreditBar compact />
            </div>
            <div className="flex items-center gap-1 shrink-0 ml-2">
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0"
                title="เปิดแถบข้างขวา"
                onClick={() => openSidebar()}
              >
                <PanelRightOpen className="h-3.5 w-3.5" />
              </Button>
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={close}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <AssistantChatPanel preset={preset} compact active={open} onCloseLimitCta={close} />
        </div>
      )}
    </>
  );
}
