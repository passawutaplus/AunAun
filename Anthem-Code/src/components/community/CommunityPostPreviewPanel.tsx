import {

  CommunityPostPreviewView,

} from "@/components/community/CommunityPostPreviewView";

import { Orbit } from "lucide-react";
import type { CommunityPostPreviewProps } from "@/components/community/CommunityPostPreviewContent";

import { cn } from "@/lib/utils";



export function CommunityPostPreviewPanel({

  title,

  body,

  tags,

  tools,

  mentionedProjects,

  taggedUsers,

  mediaItems,

  mediaAspect,

  className,

}: CommunityPostPreviewProps & { className?: string }) {

  return (

    <aside

      className={cn(

        "hidden lg:flex lg:flex-col h-full min-h-0 overflow-hidden pb-6",

        className,

      )}

    >

      <div className="pt-1.5 shrink-0" aria-hidden>

        <p className="mb-1.5 flex items-center gap-2 text-base font-semibold invisible">
          <Orbit className="w-4 h-4 shrink-0" />
          Area Post
        </p>

      </div>

      <CommunityPostPreviewView

        title={title}

        body={body}

        tags={tags}

        tools={tools}

        mentionedProjects={mentionedProjects}

        taggedUsers={taggedUsers}

        mediaItems={mediaItems}

        mediaAspect={mediaAspect}

        defaultMode="pc"

        fitContainer

        className="flex-1 min-h-0"

      />

    </aside>

  );

}

