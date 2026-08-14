import { Sparkles } from "lucide-react";
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
  /** overlay = on cover image; inline = next to license chip */
  tone?: "overlay" | "inline";
};

const AiDisclosureBadge = ({
  assisted,
  note,
  level,
  className,
  size = "sm",
  tone = "overlay",
}: Props) => {
  const resolved = level ?? parseAiUseLevel(note, assisted ?? Boolean(level));
  if (!resolved) return null;
  const meta = AI_USE_LEVEL_META[resolved];
  const strong = resolved === "full";

  return (
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
};

export default AiDisclosureBadge;
