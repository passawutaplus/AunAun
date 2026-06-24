import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PostPreviewMockup } from "./PostPreviewMockup";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  imageUrl?: string;
  caption?: string;
  authorName?: string;
}

export function PostPreviewDialog({ open, onOpenChange, imageUrl, caption, authorName }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[min(96vw,720px)] max-h-[92vh] overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-sm">พรีวิวเหมือนจริง</DialogTitle>
        </DialogHeader>
        <PostPreviewMockup imageUrl={imageUrl} caption={caption} authorName={authorName} />
      </DialogContent>
    </Dialog>
  );
}
