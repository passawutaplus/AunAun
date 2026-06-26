import { Bookmark, Heart, MessageCircle, Share2 } from "lucide-react";
import ToolIcon from "@/components/ToolIcon";
import UserAvatar from "@/components/UserAvatar";
import CommunityPostMedia from "@/components/community/CommunityPostMedia";
import { CommunityQaBadge } from "@/components/community/CommunityQaBadge";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { titlesMatch } from "@/lib/classifyCommunityPost";
import { communityDisplayTags, hasCommunityQaBadge } from "@/lib/communityQaTag";
import { splitCommunityMedia } from "@/lib/communityMedia";
import type { MentionedProjectSummary } from "@/lib/communityMentionedProjects";
import type { PortfolioMediaItem } from "@/lib/portfolioMedia";
import { cn } from "@/lib/utils";
import { CommunityMentionedProjectsBar } from "@/components/community/CommunityMentionedProjectsBar";

export type CommunityPostPreviewProps = {
  title?: string;
  body: string;
  tags: string[];
  tools: string[];
  mentionedProjects?: MentionedProjectSummary[];
  mediaItems: PortfolioMediaItem[];
  className?: string;
};

export function CommunityPostPreviewContent({
  title = "",
  body,
  tags,
  tools,
  mentionedProjects = [],
  mediaItems,
  className,
}: CommunityPostPreviewProps) {
  const { user } = useAuth();
  const { data: profile } = useProfile(user?.id);
  const displayTags = communityDisplayTags(tags);
  const showQa = hasCommunityQaBadge(tags);
  const showTitle = !titlesMatch(title, body) && title.trim().length > 0;
  const { gallery_urls, video_urls } = splitCommunityMedia(mediaItems);
  const hasMedia = mediaItems.length > 0;
  const displayName = profile?.display_name ?? "ผู้ใช้";
  const previewTitle = title.trim() || "โพสต์ชุมชน";

  return (
    <article className={cn("rounded-2xl glass-panel overflow-hidden", className)}>
      <div className="flex items-center gap-3 px-4 pt-4 pb-2">
        <UserAvatar
          src={profile?.avatar_url}
          name={displayName}
          className="w-10 h-10 shrink-0"
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{displayName}</p>
          <p className="text-xs text-muted-foreground">ตัวอย่าง · เมื่อเผยแพร่</p>
        </div>
      </div>

      {hasMedia && (
        <CommunityPostMedia
          galleryUrls={gallery_urls}
          videoUrls={video_urls}
          title={previewTitle}
          variant="detail"
        />
      )}

      <div
        className="flex items-center justify-between gap-2 px-4 py-2 border-t border-border/50 pointer-events-none opacity-70"
        aria-hidden
      >
        <div className="flex items-center gap-1">
          <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs text-muted-foreground">
            <Heart className="w-4 h-4" />
          </span>
          <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs text-muted-foreground">
            <MessageCircle className="w-4 h-4" />
            <span className="hidden sm:inline">ตอบ</span>
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span className="inline-flex items-center justify-center rounded-full p-2 text-muted-foreground">
            <Bookmark className="w-4 h-4" />
          </span>
          <span className="inline-flex items-center justify-center rounded-full p-2 text-muted-foreground">
            <Share2 className="w-4 h-4" />
          </span>
        </div>
      </div>

      <CommunityMentionedProjectsBar projects={mentionedProjects} />

      <div className="px-6 pb-6 pt-4 space-y-4">
        {showQa && <CommunityQaBadge />}
        {showTitle && (
          <h1 className="text-2xl font-semibold leading-snug">{title.trim()}</h1>
        )}
        <p className="text-foreground/90 whitespace-pre-wrap leading-relaxed">
          {body.trim() || <span className="text-muted-foreground">ยังไม่มีแคปชั่น</span>}
        </p>
        {tools.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {tools.map((t) => (
              <span
                key={t}
                className="inline-flex items-center gap-1 text-xs rounded-full bg-muted px-2.5 py-1"
              >
                <ToolIcon name={t} size="xs" />
                {t}
              </span>
            ))}
          </div>
        )}
        {displayTags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {displayTags.map((t) => (
              <span key={t} className="text-xs text-primary">
                #{t}
              </span>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}
