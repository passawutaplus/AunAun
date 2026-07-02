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



  const body = (

    <>

      {mode === "feed" ? (

        <CommunityPostFeedPreview

          title={preview.title}

          body={preview.body}

          tags={preview.tags}

          mediaItems={preview.mediaItems}

          mediaAspect={preview.mediaAspect}

          textCoverTheme={preview.textCoverTheme}

          fit={fitContainer}

        />

      ) : mode === "mobile" ? (

        <div

          className={cn(

            "mx-auto w-full max-w-[340px] overflow-hidden bg-background",

            fitContainer

              ? "h-full min-h-0 rounded-[1.75rem] border-[6px] border-foreground/10 shadow-lg"

              : "rounded-[1.75rem] border-[6px] border-foreground/10 shadow-lg",

          )}

        >

          <CommunityPostPreviewContent

            {...preview}

            layout={contentLayout}

            className={cn(fitContainer && "h-full rounded-none border-0 shadow-none")}

          />

        </div>

      ) : (

        <CommunityPostPreviewContent {...preview} layout={contentLayout} className="h-full" />

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

