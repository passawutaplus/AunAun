import { Bookmark, MessageCircle, MoreHorizontal, Play, Share2 } from "lucide-react";
import { PlusOneControl } from "@/components/brand/PlusOneControl";
import UserAvatar from "@/components/UserAvatar";
import { CommunityPostGridCarousel } from "@/components/community/CommunityPostGridCarousel";
import { CommunityQaBadge } from "@/components/community/CommunityQaBadge";
import { CommunityTagLink } from "@/components/community/CommunityTagLink";
import { postHeadline, titlesMatch } from "@/lib/classifyCommunityPost";
import { communityDisplayTags, hasCommunityQaBadge } from "@/lib/communityQaTag";
import { splitCommunityMedia } from "@/lib/communityMedia";
import type { CommunityMediaAspect } from "@/lib/communityMediaAspect";
import {
  communityMediaAspectTailwind,
  DEFAULT_COMMUNITY_MEDIA_ASPECT,
} from "@/lib/communityMediaAspect";
import type { PortfolioMediaItem } from "@/lib/portfolioMedia";
import { cn } from "@/lib/utils";

export const COMMUNITY_FEED_PREVIEW_CARD_SHELL =
  "rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden flex flex-col";

type Props = {
  title?: string;
  body: string;
  tags: string[];
  mediaItems: PortfolioMediaItem[];
  mediaAspect?: CommunityMediaAspect;
  displayName: string;
  username?: string | null;
  avatarUrl?: string | null;
  highlighted?: boolean;
  className?: string;
};

function StaticActionBar() {
  return (
    <div
      className="flex items-center justify-between gap-2 border-t border-border/50 mt-auto px-1 py-1.5 pointer-events-none opacity-70 shrink-0"
      aria-hidden
    >
      <div className="flex items-center gap-1">
        <PlusOneControl
          active={false}
          showCount={false}
          ariaLabel="ถูกใจ"
          className="rounded-full px-2 py-1 text-muted-foreground"
        />
        <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-sm text-muted-foreground">
          <MessageCircle className="w-5 h-5" aria-hidden />
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
  );
}

/** Static Area feed card — mirrors `CommunityPostGridCard` for composer preview. */
export function CommunityPostFeedPreviewCard({
  title = "",
  body,
  tags,
  mediaItems,
  mediaAspect = DEFAULT_COMMUNITY_MEDIA_ASPECT,
  displayName,
  username,
  avatarUrl,
  highlighted = false,
  className,
}: Props) {
  const aspectClass = communityMediaAspectTailwind(mediaAspect);
  const { gallery_urls, video_urls } = splitCommunityMedia(mediaItems);
  const hasMedia = mediaItems.length > 0;
  const hasVideo = video_urls.length > 0;
  const showQa = hasCommunityQaBadge(tags);
  const headline = postHeadline(title, body);
  const displayTags = communityDisplayTags(tags);
  const titleMatchesBody = titlesMatch(title, body);
  const showHeadlineOnText = !titleMatchesBody && !!headline;
  const showCaption = hasMedia && !!headline;

  return (
    <article
      className={cn(
        COMMUNITY_FEED_PREVIEW_CARD_SHELL,
        hasMedia && "group",
        highlighted && "ring-2 ring-primary/40 ring-offset-2 ring-offset-background",
        className,
      )}
    >
      <div className="flex items-center gap-2.5 px-3 pt-3 pb-2">
        <UserAvatar src={avatarUrl} name={displayName} className="w-8 h-8 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-medium truncate leading-tight">{displayName}</p>
          <p className="text-[10px] text-muted-foreground truncate">
            {username ? `@${username}` : "เมื่อเผยแพร่"}
          </p>
        </div>
        <span className="p-1 text-muted-foreground shrink-0" aria-hidden>
          <MoreHorizontal className="w-4 h-4" />
        </span>
      </div>

      {hasMedia ? (
        <div className="relative bg-muted/30">
          <CommunityPostGridCarousel
            galleryUrls={gallery_urls}
            videoUrls={video_urls}
            aspectClass={aspectClass}
          />
          {hasVideo && gallery_urls.length === 0 && video_urls.length === 1 && (
            <span className="absolute top-2 right-2 inline-flex rounded-full bg-black/50 p-1.5 text-white pointer-events-none">
              <Play className="w-3.5 h-3.5 fill-current" />
            </span>
          )}
          {showQa ? (
            <span className="absolute top-2 left-2 z-10">
              <CommunityQaBadge className="bg-background/90 backdrop-blur-sm" />
            </span>
          ) : null}
        </div>
      ) : (
        <div className="px-3 pb-2 space-y-2 min-w-0">
          {showHeadlineOnText ? (
            <h3 className="text-[13px] font-semibold text-foreground line-clamp-2 leading-snug thai-body">
              {headline}
            </h3>
          ) : null}
          {body.trim() ? (
            <p className="text-[12px] text-foreground/90 line-clamp-6 whitespace-pre-wrap thai-body leading-relaxed">
              {body.trim()}
            </p>
          ) : (
            <p className="text-[12px] text-muted-foreground thai-body">ยังไม่มีเนื้อหา</p>
          )}
          {displayTags.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {displayTags.slice(0, 4).map((t) => (
                <CommunityTagLink key={t} tag={t} compact className="text-[10px] text-primary/80" />
              ))}
            </div>
          ) : null}
        </div>
      )}

      {showCaption ? (
        <div className="px-3 pt-2 pb-1">
          <h3 className="text-[13px] font-medium leading-snug text-foreground line-clamp-2 thai-body">
            {headline}
          </h3>
        </div>
      ) : null}

      <StaticActionBar />
    </article>
  );
}

export function CommunityPostFeedSkeletonCard({ className }: { className?: string }) {
  return (
    <article className={cn(COMMUNITY_FEED_PREVIEW_CARD_SHELL, className)}>
      <div className="flex items-center gap-2.5 px-3 pt-3 pb-2">
        <div className="w-8 h-8 rounded-full bg-muted/60 animate-pulse shrink-0" />
        <div className="flex-1 space-y-1.5 min-w-0">
          <div className="h-3 w-[70%] rounded bg-muted/60 animate-pulse" />
          <div className="h-2 w-[45%] rounded bg-muted/50 animate-pulse" />
        </div>
      </div>
      <div className="h-32 bg-muted/50 animate-pulse" />
      <div className="h-9 border-t border-border/50" />
    </article>
  );
}
