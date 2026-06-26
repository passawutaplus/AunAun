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
  body,
  tags,
  tools,
  mediaItems,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>ตัวอย่างโพสต์</DialogTitle>
        </DialogHeader>
        <CommunityPostPreviewContent
          body={body}
          tags={tags}
          tools={tools}
          mediaItems={mediaItems}
        />
      </DialogContent>
    </Dialog>
  );
}
