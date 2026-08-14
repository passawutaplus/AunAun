import { Sparkles } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  AI_USE_LEVEL_META,
  parseAiUseLevel,
  type AiUseLevel,
} from "@/lib/aiDisclosure";

type Props = {
  assisted?: boolean;
  note?: string | null;
  level?: AiUseLevel | null;
  className?: string;
  size?: "sm" | "md";
  /** overlay = on cover image; inline = next to license / category chip */
  tone?: "overlay" | "inline";
  /** false when nested inside another button (e.g. license row). */
  interactive?: boolean;
};

const AiDisclosureBadge = ({
  assisted,
  note,
  level,
  className,
  size = "sm",
  tone = "overlay",
  interactive = true,
}: Props) => {
  const resolved = level ?? parseAiUseLevel(note, assisted ?? Boolean(level));
  if (!resolved) return null;
  const meta = AI_USE_LEVEL_META[resolved];
  const strong = resolved === "full";

  const badge = (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full font-medium",
        tone === "inline"
          ? strong
            ? "border border-primary/40 bg-primary/10 text-primary"
            : "border border-border bg-muted/50 text-foreground"
          : strong
            ? "bg-primary/90 text-primary-foreground shadow-sm"
            : "bg-black/55 text-white backdrop-blur-sm shadow-sm",
        size === "sm" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-xs",
        className,
      )}
    >
      <Sparkles className={cn(size === "sm" ? "h-2.5 w-2.5" : "h-3 w-3")} aria-hidden />
      {meta.badgeLabel}
    </span>
  );

  const trigger = interactive ? (
    <button
      type="button"
      className="pointer-events-auto inline-flex rounded-full"
      aria-label={`ใช้ AI ระดับ${meta.shortLabel} — ${meta.hint}`}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      {badge}
    </button>
  ) : (
    <span
      tabIndex={0}
      className="inline-flex rounded-full outline-none"
      aria-label={`ใช้ AI ระดับ${meta.shortLabel} — ${meta.hint}`}
    >
      {badge}
    </span>
  );

  return (
    <Tooltip delayDuration={200}>
      <TooltipTrigger asChild>{trigger}</TooltipTrigger>
      <TooltipContent side="top" className="max-w-[220px] space-y-0.5 text-xs">
        <p className="font-medium">ใช้ AI · {meta.shortLabel}</p>
        <p className="text-muted-foreground">{meta.hint}</p>
      </TooltipContent>
    </Tooltip>
  );
};

export default AiDisclosureBadge;
