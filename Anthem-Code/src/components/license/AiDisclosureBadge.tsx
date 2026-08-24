import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AiIcon } from "@/components/icons/NoAiIcon";
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
  const iconSize = size === "sm" ? "h-5 w-5" : "h-6 w-6";

  const badge = (
    <span
      className={cn(
        "inline-flex items-center justify-center",
        tone === "overlay"
          ? "text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)]"
          : strong
            ? "text-primary"
            : "text-foreground",
        className,
      )}
    >
      <AiIcon className={iconSize} />
    </span>
  );

  const trigger = interactive ? (
    <button
      type="button"
      className="pointer-events-auto inline-flex rounded-md"
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
      className="inline-flex rounded-md outline-none"
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
