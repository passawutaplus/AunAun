import { ImagePlus, Sparkles } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";

export type PortfolioEditorMode = "manual" | "ai";

interface PortfolioEditorModeToggleProps {
  mode: PortfolioEditorMode;
  onModeChange: (mode: PortfolioEditorMode) => void;
}

export function PortfolioEditorModeToggle({ mode, onModeChange }: PortfolioEditorModeToggleProps) {
  return (
    <div className="max-w-6xl mx-auto px-4 py-3 border-b border-border/60 bg-muted/20">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
        <ToggleGroup
          type="single"
          value={mode}
          onValueChange={(v) => {
            if (v === "manual") onModeChange(v);
          }}
          className="inline-flex rounded-full border border-border bg-background p-1 w-full sm:w-auto"
        >
          <ToggleGroupItem
            value="manual"
            className={cn(
              "rounded-full px-4 py-2 text-sm gap-2 data-[state=on]:bg-muted data-[state=on]:text-foreground flex-1 sm:flex-none",
            )}
          >
            <ImagePlus className="w-4 h-4 shrink-0" />
            ลงธรรมดา
          </ToggleGroupItem>
          <ToggleGroupItem
            value="ai"
            disabled
            aria-disabled
            className={cn(
              "rounded-full px-4 py-2 text-sm gap-2 flex-1 sm:flex-none opacity-60 cursor-not-allowed",
            )}
          >
            <Sparkles className="w-4 h-4 shrink-0" />
            AI ช่วยลงผลงาน
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
              Coming Soon
            </span>
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
    </div>
  );
}
