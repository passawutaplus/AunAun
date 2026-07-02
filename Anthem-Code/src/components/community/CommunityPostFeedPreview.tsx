import { Play } from "lucide-react";
import { PlusOneMark } from "@/components/brand/PlusOneMark";
import UserAvatar from "@/components/UserAvatar";
import { CommunityQaBadge } from "@/components/community/CommunityQaBadge";
import { CommunityFeedPreviewToolbar } from "@/components/community/CommunityFeedPreviewToolbar";
import { CommunityTextCover } from "@/components/community/CommunityTextCover";
import { postHeadline } from "@/lib/classifyCommunityPost";
import { communityCoverUrl, splitCommunityMedia } from "@/lib/communityMedia";
import { hasCommunityQaBadge } from "@/lib/communityQaTag";
import type { CommunityPostPreviewProps } from "@/components/community/CommunityPostPreviewContent";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { communityMediaAspectTailwind } from "@/lib/communityMediaAspect";
import { DEFAULT_COMMUNITY_MEDIA_ASPECT } from "@/lib/communityMediaAspect";
import { cn } from "@/lib/utils";

const SKELETON_HEIGHTS = ["h-36", "h-44", "h-32", "h-40", "h-36", "h-48"] as const;

function FeedSkeletonCard({ aspectClass }: { aspectClass: string }) {
  return (
    <article className="space-y-2">
      <div className={cn("w-full rounded-xl bg-muted/70 animate-pulse", aspectClass)} />
      <div className="h-3 w-[80%] rounded bg-muted/60 animate-pulse" />
      <div className="flex items-center gap-2">
        <div className="w-5 h-5 rounded-full bg-muted/60 animate-pulse shrink-0" />
        <div className="h-2.5 flex-1 rounded bg-muted/50 animate-pulse" />
      </div>
    </article>
  );
}

export function CommunityPostFeedPreview({
  title = "",
  body,
  tags,
  mediaItems,
  mediaAspect = DEFAULT_COMMUNITY_MEDIA_ASPECT,
  textCoverTheme,
  fit = false,
}: Pick<CommunityPostPreviewProps, "title" | "body" | "tags" | "mediaItems" | "mediaAspect" | "textCoverTheme"> & {
  fit?: boolean;
}) {
  const aspectTw = communityMediaAspectTailwind(mediaAspect);
  const { user } = useAuth();
  const { data: profile } = useProfile(user?.id);
  const { gallery_urls, video_urls } = splitCommunityMedia(mediaItems);
  const cover = communityCoverUrl(gallery_urls, video_urls);
  const hasVideo = video_urls.length > 0;
  const showQa = hasCommunityQaBadge(tags);
  const headline = postHeadline(title, body) || "โพสต์ชุมชน";
  const displayName = profile?.display_name ?? "ผู้ใช้";

  const leftColumn = (
    <>
      <article className="ring-2 ring-primary/40 ring-offset-2 ring-offset-background rounded-xl">
        <div className="relative overflow-hidden rounded-xl bg-muted/50">
          {cover ? (
            <img src={cover} alt="" className={cn("w-full object-cover", aspectTw)} />
          ) : (
            <CommunityTextCover
              seed={`preview:${headline}`}
              themeId={textCoverTheme}
              title={title}
              body={body}
              tags={tags}
              aspectClass={aspectTw}
              compact
            />
          )}
          {hasVideo && (
            <span className="absolute top-2 right-2 inline-flex rounded-full bg-black/50 p-1.5 text-white">
              <Play className="w-3.5 h-3.5 fill-current" />
            </span>
          )}
          {showQa && (
            <span className="absolute top-2 left-2">
              <CommunityQaBadge className="bg-background/90 backdrop-blur-sm scale-90 origin-top-left" />
            </span>
          )}
        </div>
        <h3 className="mt-2 text-[13px] font-medium leading-snug text-foreground line-clamp-2 thai-body">
          {headline}
        </h3>
        <div className="mt-1.5 flex items-center gap-2 min-w-0">
          <UserAvatar
            src={profile?.avatar_url}
            name={displayName}
            className="w-5 h-5 shrink-0"
          />
          <span className="flex-1 min-w-0 text-[11px] text-muted-foreground truncate">{displayName}</span>
          <span className="inline-flex items-center text-[11px] text-muted-foreground">
            <PlusOneMark className="text-[11px] text-muted-foreground" />
          </span>
        </div>
      </article>
      {SKELETON_HEIGHTS.slice(0, fit ? 1 : 3).map((_, i) => (
        <FeedSkeletonCard key={`l-${i}`} aspectClass={aspectTw} />
      ))}
    </>
  );

  const rightColumn = (fit ? SKELETON_HEIGHTS.slice(3, 4) : SKELETON_HEIGHTS.slice(3)).map((_, i) => (
    <FeedSkeletonCard key={`r-${i}`} aspectClass={aspectTw} />
  ));

  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-background overflow-hidden",
        fit && "h-full flex flex-col min-h-0",
      )}
    >
      <CommunityFeedPreviewToolbar />

      <div className={cn("p-3 grid grid-cols-2 gap-3", fit && "flex-1 min-h-0 overflow-hidden")}>
        <div className={cn("space-y-3", fit && "min-h-0 overflow-hidden")}>{leftColumn}</div>
        <div className={cn("space-y-3", fit && "min-h-0 overflow-hidden")}>{rightColumn}</div>
      </div>
    </div>
  );
}
