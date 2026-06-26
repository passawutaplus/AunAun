import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  CommunityPostPreviewView,
} from "@/components/community/CommunityPostPreviewView";
import type { CommunityPostPreviewProps } from "@/components/community/CommunityPostPreviewContent";

type Props = CommunityPostPreviewProps & {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CommunityPostPreviewDialog({
  open,
  onOpenChange,
  title,
  body,
  tags,
  tools,
  mentionedProjects,
  taggedUsers,
  mediaItems,
  mediaAspect,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto p-4 sm:p-5">
        <DialogTitle className="sr-only">Preview</DialogTitle>
        <CommunityPostPreviewView
          title={title}
          body={body}
          tags={tags}
          tools={tools}
          mentionedProjects={mentionedProjects}
          taggedUsers={taggedUsers}
          mediaItems={mediaItems}
          mediaAspect={mediaAspect}
          defaultMode="mobile"
        />
      </DialogContent>
    </Dialog>
  );
}
