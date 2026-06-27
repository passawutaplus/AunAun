import { Bookmark, Heart, MessageCircle, Share2 } from "lucide-react";
import UserAvatar from "@/components/UserAvatar";
import CommunityPostMedia from "@/components/community/CommunityPostMedia";
import { CommunityQaBadge } from "@/components/community/CommunityQaBadge";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { titlesMatch } from "@/lib/classifyCommunityPost";
import { hasCommunityQaBadge } from "@/lib/communityQaTag";
import { splitCommunityMedia } from "@/lib/communityMedia";
import type { MentionedProjectSummary } from "@/lib/communityMentionedProjects";
import type { TaggedUserSummary } from "@/lib/communityTaggedUsers";
import type { CommunityMediaAspect } from "@/lib/communityMediaAspect";
import { DEFAULT_COMMUNITY_MEDIA_ASPECT } from "@/lib/communityMediaAspect";
import type { PortfolioMediaItem } from "@/lib/portfolioMedia";
import { cn } from "@/lib/utils";
import { CommunityCaptionMetaInline } from "@/components/community/CommunityCaptionMetaInline";
import { CommunityMentionedProjectsBar } from "@/components/community/CommunityMentionedProjectsBar";
import { CommunityTaggedUsersBar } from "@/components/community/CommunityTaggedUsersBar";

export type CommunityPostPreviewProps = {
  title?: string;
  body: string;
  tags: string[];
  tools: string[];
  mentionedProjects?: MentionedProjectSummary[];
  taggedUsers?: TaggedUserSummary[];
  mediaItems: PortfolioMediaItem[];
  mediaAspect?: CommunityMediaAspect;
  className?: string;
  layout?: "default" | "fitted";
  /** @deprecated use mediaAspect — kept for mobile tab override */
  mediaVariant?: "feed" | "detail" | "editor";
};

export function CommunityPostPreviewContent({
  title = "",
  body,
  tags,
  tools,
  mentionedProjects = [],
  taggedUsers = [],
  mediaItems,
  mediaAspect = DEFAULT_COMMUNITY_MEDIA_ASPECT,
  className,
  layout = "default",
}: CommunityPostPreviewProps) {
  const { user } = useAuth();
  const { data: profile } = useProfile(user?.id);
  const showQa = hasCommunityQaBadge(tags);
  const showTitle = !titlesMatch(title, body) && title.trim().length > 0;
  const { gallery_urls, video_urls } = splitCommunityMedia(mediaItems);
  const hasMedia = mediaItems.length > 0;
  const displayName = profile?.display_name ?? "ผู้ใช้";
  const previewTitle = title.trim() || "โพสต์ชุมชน";
  const fitted = layout === "fitted";

  return (
    <article
      className={cn(
        "rounded-2xl glass-panel overflow-hidden",
        fitted && "h-full flex flex-col min-h-0",
        className,
      )}
    >
      <div
        className={cn(
          "flex items-center gap-3 shrink-0",
          fitted ? "px-3 pt-3 pb-1.5" : "px-4 pt-4 pb-2",
        )}
      >
        <UserAvatar
          src={profile?.avatar_url}
          name={displayName}
          className={cn("shrink-0", fitted ? "w-8 h-8" : "w-10 h-10")}
        />
        <div className="flex-1 min-w-0">
          <p className={cn("font-medium truncate", fitted ? "text-xs" : "text-sm")}>{displayName}</p>
          <p className="text-[11px] text-muted-foreground">เมื่อเผยแพร่</p>
        </div>
      </div>

      {hasMedia ? (
        <div className="w-full shrink-0">
          <CommunityPostMedia
            galleryUrls={gallery_urls}
            videoUrls={video_urls}
            title={previewTitle}
            variant="detail"
            mediaAspect={mediaAspect}
          />
        </div>
      ) : (
        fitted && <div className="flex-1 min-h-0" />
      )}

      <div
        className={cn(
          "flex items-center justify-between gap-2 border-t border-border/50 pointer-events-none opacity-70 shrink-0",
          fitted ? "px-3 py-1.5" : "px-4 py-2",
        )}
        aria-hidden
      >
        <div className="flex items-center gap-1">
          <span className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs text-muted-foreground">
            <Heart className={cn(fitted ? "w-3.5 h-3.5" : "w-4 h-4")} />
          </span>
          <span className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs text-muted-foreground">
            <MessageCircle className={cn(fitted ? "w-3.5 h-3.5" : "w-4 h-4")} />
            {!fitted && <span className="hidden sm:inline">ตอบ</span>}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span className="inline-flex items-center justify-center rounded-full p-1.5 text-muted-foreground">
            <Bookmark className={cn(fitted ? "w-3.5 h-3.5" : "w-4 h-4")} />
          </span>
          <span className="inline-flex items-center justify-center rounded-full p-1.5 text-muted-foreground">
            <Share2 className={cn(fitted ? "w-3.5 h-3.5" : "w-4 h-4")} />
          </span>
        </div>
      </div>

      {mentionedProjects.length > 0 && (
        <CommunityMentionedProjectsBar
          projects={mentionedProjects}
          className={cn(fitted && "py-2 px-3 shrink-0")}
        />
      )}

      {taggedUsers.length > 0 && (
        <CommunityTaggedUsersBar
          users={taggedUsers}
          className={cn(fitted && "py-2 px-3 shrink-0")}
        />
      )}

      <div
        className={cn(
          "space-y-2 overflow-hidden shrink-0",
          fitted ? "px-4 pb-3 pt-2" : "px-6 pb-6 pt-4 space-y-4",
        )}
      >
        {showQa && <CommunityQaBadge />}
        {showTitle && (
          <h1
            className={cn(
              "font-semibold leading-snug",
              fitted ? "text-base line-clamp-2" : "text-2xl",
            )}
          >
            {title.trim()}
          </h1>
        )}
        <p
          className={cn(
            "text-foreground leading-relaxed",
            fitted ? "text-sm line-clamp-3 whitespace-pre-wrap" : "text-base whitespace-pre-wrap",
          )}
        >
          {body.trim() || <span className="text-muted-foreground">ยังไม่มีแคปชั่น</span>}
        </p>
        <CommunityCaptionMetaInline
          tags={tags}
          tools={tools}
          compact={fitted}
          className={cn(fitted && "gap-1")}
        />
      </div>
    </article>
  );
}
