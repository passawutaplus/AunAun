import { CommunityFeedPreviewToolbar } from "@/components/community/CommunityFeedPreviewToolbar";
import {
  CommunityPostFeedPreviewCard,
  CommunityPostFeedSkeletonCard,
} from "@/components/community/CommunityPostFeedPreviewCard";
import type { CommunityPostPreviewProps } from "@/components/community/CommunityPostPreviewContent";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { cn } from "@/lib/utils";

export function CommunityPostFeedPreview({
  title = "",
  body,
  tags,
  mediaItems,
  mediaAspect,
  fit = false,
}: Pick<CommunityPostPreviewProps, "title" | "body" | "tags" | "mediaItems" | "mediaAspect"> & {
  fit?: boolean;
}) {
  const { user } = useAuth();
  const { data: profile } = useProfile(user?.id);
  const displayName = profile?.display_name ?? "ผู้ใช้";

  const leftColumn = (
    <>
      <CommunityPostFeedPreviewCard
        title={title}
        body={body}
        tags={tags}
        mediaItems={mediaItems}
        mediaAspect={mediaAspect}
        displayName={displayName}
        username={profile?.username}
        avatarUrl={profile?.avatar_url}
        highlighted
      />
      {!fit && <CommunityPostFeedSkeletonCard />}
    </>
  );

  const rightColumn = (fit ? [0] : [0, 1, 2]).map((i) => (
    <CommunityPostFeedSkeletonCard key={i} />
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
