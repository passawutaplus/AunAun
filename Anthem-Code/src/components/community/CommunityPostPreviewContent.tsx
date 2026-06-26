import { Play } from "lucide-react";
import ToolIcon from "@/components/ToolIcon";
import { CommunityMediaCarousel } from "@/components/community/CommunityMediaCarousel";
import { CommunityQaBadge } from "@/components/community/CommunityQaBadge";
import { communityDisplayTags, hasCommunityQaBadge } from "@/lib/communityQaTag";
import type { PortfolioMediaItem } from "@/lib/portfolioMedia";
import { cn } from "@/lib/utils";

export type CommunityPostPreviewProps = {
  title?: string;
  body: string;
  tags: string[];
  tools: string[];
  mediaItems: PortfolioMediaItem[];
  className?: string;
};

export function CommunityPostPreviewContent({
  title = "",
  body,
  tags,
  tools,
  mediaItems,
  className,
}: CommunityPostPreviewProps) {
  const displayTags = communityDisplayTags(tags);
  const showQa = hasCommunityQaBadge(tags);

  return (
    <div className={cn("space-y-4", className)}>
      {mediaItems.length > 0 && (
        <CommunityMediaCarousel items={mediaItems} className="-mx-1 rounded-xl overflow-hidden" />
      )}
      {(showQa || title.trim()) && (
        <div className="space-y-2">
          {showQa && <CommunityQaBadge />}
          {title.trim() && (
            <p className="text-base font-semibold leading-snug">{title.trim()}</p>
          )}
        </div>
      )}
      <p className="text-sm whitespace-pre-wrap leading-relaxed">
        {body.trim() || <span className="text-muted-foreground">ยังไม่มีแคปชั่น</span>}
      </p>
      {tools.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tools.map((t) => (
            <span
              key={t}
              className="inline-flex items-center gap-1 text-xs rounded-full bg-muted px-2 py-1"
            >
              <ToolIcon name={t} size="xs" />
              {t}
            </span>
          ))}
        </div>
      )}
      {displayTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {displayTags.map((t) => (
            <span key={t} className="text-xs text-primary">
              #{t}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
