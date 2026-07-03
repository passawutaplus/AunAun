import { useState } from "react";

import {
  CommunityPostPreviewContent,
  type CommunityPostPreviewProps,
} from "@/components/community/CommunityPostPreviewContent";

import {
  CommunityPreviewModeTabs,
  type CommunityPreviewMode,
} from "@/components/community/CommunityPreviewModeTabs";

import { CommunityPostFeedPreview } from "@/components/community/CommunityPostFeedPreview";
import { CommunityPostFeedPreviewCard } from "@/components/community/CommunityPostFeedPreviewCard";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { cn } from "@/lib/utils";

type Props = CommunityPostPreviewProps & {
  defaultMode?: CommunityPreviewMode;
  showModeTabs?: boolean;
  fitContainer?: boolean;
  className?: string;
};

export function CommunityPostPreviewView({
  defaultMode = "pc",
  showModeTabs = true,
  fitContainer = false,
  className,
  ...preview
}: Props) {
  const [mode, setMode] = useState<CommunityPreviewMode>(defaultMode);
  const contentLayout = fitContainer ? "fitted" : "default";
  const hasMedia = preview.mediaItems.length > 0;
  const { user } = useAuth();
  const { data: profile } = useProfile(user?.id);

  const feedCard = (
    <CommunityPostFeedPreviewCard
      title={preview.title}
      body={preview.body}
      tags={preview.tags}
      mediaItems={preview.mediaItems}
      mediaAspect={preview.mediaAspect}
      displayName={profile?.display_name ?? "ผู้ใช้"}
      username={profile?.username}
      avatarUrl={profile?.avatar_url}
      className="w-full"
    />
  );

  const detailContent = (
    <CommunityPostPreviewContent
      {...preview}
      layout={contentLayout}
      className={cn(
        mode === "mobile" && fitContainer && "h-full rounded-none border-0 shadow-none",
        mode === "pc" && fitContainer && "h-full",
      )}
    />
  );

  const body = (
    <>
      {mode === "feed" ? (
        <CommunityPostFeedPreview
          title={preview.title}
          body={preview.body}
          tags={preview.tags}
          mediaItems={preview.mediaItems}
          mediaAspect={preview.mediaAspect}
          fit={fitContainer}
        />
      ) : !hasMedia ? (
        mode === "mobile" ? (
          <div
            className={cn(
              "mx-auto w-full max-w-[340px] overflow-hidden bg-background",
              fitContainer
                ? "h-full min-h-0 rounded-[1.75rem] border-[6px] border-foreground/10 shadow-lg flex flex-col"
                : "rounded-[1.75rem] border-[6px] border-foreground/10 shadow-lg",
            )}
          >
            <div className={cn("p-2", fitContainer && "flex-1 min-h-0 overflow-y-auto")}>
              {feedCard}
            </div>
          </div>
        ) : (
          <div className={cn(fitContainer && "h-full min-h-0 overflow-y-auto")}>
            <div className="max-w-sm mx-auto w-full p-1">{feedCard}</div>
          </div>
        )
      ) : mode === "mobile" ? (
        <div
          className={cn(
            "mx-auto w-full max-w-[340px] overflow-hidden bg-background",
            fitContainer
              ? "h-full min-h-0 rounded-[1.75rem] border-[6px] border-foreground/10 shadow-lg"
              : "rounded-[1.75rem] border-[6px] border-foreground/10 shadow-lg",
          )}
        >
          {detailContent}
        </div>
      ) : (
        detailContent
      )}
    </>
  );

  return (
    <div
      className={cn(
        fitContainer ? "flex flex-col flex-1 min-h-0 gap-3" : "space-y-3",
        className,
      )}
    >
      {showModeTabs && (
        <CommunityPreviewModeTabs value={mode} onChange={setMode} className="w-full flex shrink-0" />
      )}

      {fitContainer ? <div className="flex-1 min-h-0 overflow-hidden">{body}</div> : body}
    </div>
  );
}
