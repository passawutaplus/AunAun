import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  CommunityPostPreviewContent,
  type CommunityPostPreviewProps,
} from "@/components/community/CommunityPostPreviewContent";

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
  mediaItems,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto p-4 sm:p-5">
        <DialogHeader className="mb-2">
          <DialogTitle>ตัวอย่างโพสต์</DialogTitle>
        </DialogHeader>
        <CommunityPostPreviewContent
          title={title}
          body={body}
          tags={tags}
          tools={tools}
          mentionedProjects={mentionedProjects}
          mediaItems={mediaItems}
        />
      </DialogContent>
    </Dialog>
  );
}
