import ToolIcon from "@/components/ToolIcon";
import { communityDisplayTags } from "@/lib/communityQaTag";
import { cn } from "@/lib/utils";

type Props = {
  tags: string[];
  tools: string[];
  className?: string;
  compact?: boolean;
};

/** Hashtags + tool chips shown inline with caption (tags above tools). */
export function CommunityCaptionMetaInline({ tags, tools, className, compact }: Props) {
  const displayTags = communityDisplayTags(tags);
  if (!displayTags.length && !tools.length) return null;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {displayTags.length > 0 && (
        <div className="flex flex-wrap gap-x-2 gap-y-1">
          {displayTags.map((t) => (
            <span key={t} className={cn("text-primary", compact ? "text-xs" : "text-sm")}>
              #{t}
            </span>
          ))}
        </div>
      )}
      {tools.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tools.map((t) => (
            <span
              key={t}
              className={cn(
                "inline-flex items-center gap-1 rounded-full bg-muted text-foreground",
                compact ? "text-xs px-2 py-0.5" : "text-xs px-2.5 py-1",
              )}
            >
              <ToolIcon name={t} size="xs" />
              {t}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
