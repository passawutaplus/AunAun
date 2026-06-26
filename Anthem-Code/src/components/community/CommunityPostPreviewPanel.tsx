import {
  CommunityPostPreviewContent,
  type CommunityPostPreviewProps,
} from "@/components/community/CommunityPostPreviewContent";
import { cn } from "@/lib/utils";

export function CommunityPostPreviewPanel({
  title,
  body,
  tags,
  tools,
  mentionedProjects,
  mediaItems,
  className,
}: CommunityPostPreviewProps & { className?: string }) {
  return (
    <aside
      className={cn(
        "hidden lg:block sticky top-[57px] self-start max-h-[calc(100vh-57px-6rem)] overflow-y-auto",
        className,
      )}
    >
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3 px-1">
        ตัวอย่างโพสต์
      </p>
      <CommunityPostPreviewContent
        title={title}
        body={body}
        tags={tags}
        tools={tools}
        mentionedProjects={mentionedProjects}
        mediaItems={mediaItems}
      />
    </aside>
  );
}
