import * as React from "react";
import { FileText, Lightbulb, Loader2, Plus } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { queuePipelineQuotation, queueSmartBriefQuickCapture } from "@/lib/pipelineNewDeal";

type Props = {
  variant?: "sidebar" | "header" | "header-icon";
  collapsed?: boolean;
  onNavigate: (section: string, sub?: string) => void;
  /** เมื่ออยู่หน้า Pipeline แล้ว — สร้างใบเสนอราคาทันที */
  onCreateQuotation?: () => void | Promise<void>;
  creating?: boolean;
};

const SIDEBAR_TRIGGER_CLASS =
  "flex items-center justify-center rounded-lg bg-white/15 backdrop-blur-md border border-white/25 text-white shadow-soft hover:bg-white/20 active:scale-[0.98] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50";

const SIDEBAR_TRIGGER_COLLAPSED_CLASS =
  "flex items-center justify-center rounded-full bg-white/15 backdrop-blur-md border border-white/25 text-white shadow-soft hover:bg-white/20 active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50";

const SIDEBAR_LABEL_CLASS = "text-xs font-semibold text-white";

export function PipelineNewDealButton({
  variant = "sidebar",
  collapsed = false,
  onNavigate,
  onCreateQuotation,
  creating = false,
}: Props) {
  const [open, setOpen] = React.useState(false);

  const goBrief = () => {
    queueSmartBriefQuickCapture();
    onNavigate("planner", "briefs");
    setOpen(false);
  };

  const goQuotation = () => {
    if (onCreateQuotation) {
      void onCreateQuotation();
    } else {
      queuePipelineQuotation();
      onNavigate("finance", "pipeline");
    }
    setOpen(false);
  };

  if (variant === "header-icon") {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            size="icon"
            className="h-8 w-8 shrink-0 rounded-full text-white"
            style={{ background: "#FF5F05" }}
            disabled={creating}
            aria-label="New Deal"
            title="New Deal"
          >
            {creating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" strokeWidth={2.5} />
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-72 p-2">
          <DealOptions onBrief={goBrief} onQuotation={goQuotation} />
        </PopoverContent>
      </Popover>
    );
  }

  if (variant === "header") {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            size="sm"
            className="gap-1.5 text-white shrink-0 rounded-full px-3.5"
            style={{ background: "#FF5F05" }}
            disabled={creating}
          >
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            New Deal
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-72 p-2">
          <DealOptions onBrief={goBrief} onQuotation={goQuotation} />
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          title="New Deal"
          disabled={creating}
          className={cn(
            collapsed ? SIDEBAR_TRIGGER_COLLAPSED_CLASS : SIDEBAR_TRIGGER_CLASS,
            collapsed ? "h-9 w-9 mx-auto" : "w-full px-3 py-2.5",
            creating && "opacity-70 pointer-events-none",
          )}
        >
          {creating ? (
            <Loader2 className="h-4 w-4 animate-spin text-white" />
          ) : collapsed ? (
            <Plus className="h-4 w-4 text-white" strokeWidth={2.5} />
          ) : (
            <span className={SIDEBAR_LABEL_CLASS}>+ New Deal</span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        side={collapsed ? "right" : "top"}
        align="center"
        sideOffset={8}
        className={cn(
          "p-2",
          collapsed ? "w-72" : "w-[calc(var(--sidebar-width)-1rem)] max-w-[15rem]",
        )}
      >
        <DealOptions onBrief={goBrief} onQuotation={goQuotation} />
      </PopoverContent>
    </Popover>
  );
}

function DealOptions({ onBrief, onQuotation }: { onBrief: () => void; onQuotation: () => void }) {
  return (
    <div className="space-y-1.5">
      <p className="px-1 pb-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        Start new deal
      </p>
      <button
        type="button"
        onClick={onBrief}
        className="w-full rounded-lg border border-border bg-card p-2.5 text-left hover:border-[#FF5F05]/40 hover:bg-[#FF5F05]/5 transition-colors"
      >
        <div className="flex items-start gap-2">
          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#FF5F05]/10 text-[#FF5F05]">
            <Lightbulb className="h-3.5 w-3.5" />
          </span>
          <span className="min-w-0">
            <span className="block text-xs font-semibold text-foreground">Smart Brief</span>
            <span className="block text-[10px] text-muted-foreground leading-snug mt-0.5">
              Align the brief with your client — share a link to fill in or confirm before quoting.
            </span>
          </span>
        </div>
      </button>
      <button
        type="button"
        onClick={onQuotation}
        className="w-full rounded-lg border border-border bg-card p-2.5 text-left hover:border-[#FF5F05]/40 hover:bg-[#FF5F05]/5 transition-colors"
      >
        <div className="flex items-start gap-2">
          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted text-foreground">
            <FileText className="h-3.5 w-3.5" />
          </span>
          <span className="min-w-0">
            <span className="block text-xs font-semibold text-foreground">Quotation now</span>
            <span className="block text-[10px] text-muted-foreground leading-snug mt-0.5">
              Shortcut when the scope is settled — skip the brief or add it later.
            </span>
          </span>
        </div>
      </button>
    </div>
  );
}
