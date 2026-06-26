import {
  CommunityPostPreviewContent,
  type CommunityPostPreviewProps,
} from "@/components/community/CommunityPostPreviewContent";
import { cn } from "@/lib/utils";

export function CommunityPostPreviewPanel({
  body,
  tags,
  tools,
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
      <div className="rounded-2xl border border-border/60 bg-muted/20 p-5">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-4">
          ตัวอย่างโพสต์
        </p>
        <CommunityPostPreviewContent
          body={body}
          tags={tags}
          tools={tools}
          mediaItems={mediaItems}
        />
      </div>
    </aside>
  );
}
