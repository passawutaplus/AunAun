import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CommunityTagLink } from "@/components/community/CommunityTagLink";

type Props = {
  tag: string;
  onClear: () => void;
};

export function CommunityTagFeedBanner({ tag, onClear }: Props) {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-primary/25 bg-primary/5 px-3 py-2">
      <span className="text-xs text-muted-foreground">ฟีดแท็ก</span>
      <CommunityTagLink tag={tag} className="text-sm font-medium" />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="ml-auto h-7 rounded-full px-2 text-xs text-muted-foreground"
        onClick={onClear}
      >
        <X className="w-3.5 h-3.5 mr-1" />
        ล้างแท็ก
      </Button>
    </div>
  );
}
