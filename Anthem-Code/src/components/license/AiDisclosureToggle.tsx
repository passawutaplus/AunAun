import { Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { Switch } from "@/components/ui/switch";
import { AI_DISCLOSURE_HINT } from "@/lib/legalProjectPrompts";
import {
  AI_USE_LEVELS,
  AI_USE_LEVEL_META,
  type AiUseLevel,
} from "@/lib/aiDisclosure";
import { COMMUNITY_GUIDELINES_PATH } from "@/data/communityModerationPolicy";
import { cn } from "@/lib/utils";

interface Props {
  enabled: boolean;
  onEnabledChange: (v: boolean) => void;
  level: AiUseLevel;
  onLevelChange: (v: AiUseLevel) => void;
}

const AiDisclosureToggle = ({ enabled, onEnabledChange, level, onLevelChange }: Props) => (
  <div className="relative z-10 space-y-2 border-t border-border/60 !mt-5 pt-5">
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0 flex flex-1 items-start gap-2">
        <Sparkles className="w-4 h-4 text-primary shrink-0 mt-0.5" aria-hidden />
        <div className="min-w-0">
          <label htmlFor="ai-assisted-disclosure" className="cursor-pointer">
            <span className="text-sm text-foreground leading-snug">ใช้ AI ช่วยทำผลงานนี้</span>
            <span className="block text-xs text-muted-foreground font-normal mt-0.5 leading-snug">
              {AI_DISCLOSURE_HINT}
            </span>
          </label>
          <Link
            to={`${COMMUNITY_GUIDELINES_PATH}#ai`}
            className="inline-block text-xs text-primary hover:underline mt-0.5"
          >
            อ่านกติกา
          </Link>
        </div>
      </div>
      <Switch
        id="ai-assisted-disclosure"
        checked={enabled}
        onCheckedChange={(v) => {
          onEnabledChange(v);
          if (v) onLevelChange(level || "assist");
        }}
        className="shrink-0"
      />
    </div>
    {enabled ? (
      <div className="space-y-1.5">
        <div
          role="radiogroup"
          aria-label="ระดับการใช้ AI"
          className="grid grid-cols-3 gap-1 rounded-xl border border-border bg-muted/30 p-1"
        >
          {AI_USE_LEVELS.map((id) => {
            const meta = AI_USE_LEVEL_META[id];
            const selected = level === id;
            return (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => onLevelChange(id)}
                className={cn(
                  "rounded-lg px-1 py-1.5 text-[11px] sm:text-xs leading-tight transition-all",
                  selected
                    ? "bg-background text-foreground font-medium ring-1 ring-primary shadow-[0_0_10px_hsl(var(--primary)/0.4)]"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {meta.shortLabel}
              </button>
            );
          })}
        </div>
        <p className="text-[11px] text-muted-foreground leading-snug">
          {AI_USE_LEVEL_META[level].hint}
        </p>
      </div>
    ) : null}
  </div>
);

export default AiDisclosureToggle;
