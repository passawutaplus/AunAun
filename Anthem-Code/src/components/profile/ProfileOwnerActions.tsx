import { useState } from "react";
import { Eye, MoreHorizontal, Plus, Rocket, Settings, Share2 } from "lucide-react";
import ManageWorkIcon from "@/components/icons/ManageWorkIcon";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import ProfileSharePopover from "@/components/profile/ProfileSharePopover";
import { cn } from "@/lib/utils";

type Props = {
  shareUrl: string;
  shareTitle: string;
  shareMessage: string;
  sharePathLabel: string;
  shareImageUrl?: string;
  onShareInteract?: () => void;
  onPreview?: () => void;
  onPost?: () => void;
  onBecomeCreator?: () => void;
  onStudio?: () => void;
  onSettings?: () => void;
  /** Tighter buttons for the sticky mobile header. */
  compact?: boolean;
  className?: string;
};

export default function ProfileOwnerActions({
  shareUrl,
  shareTitle,
  shareMessage,
  sharePathLabel,
  shareImageUrl,
  onShareInteract,
  onPreview,
  onPost,
  onBecomeCreator,
  onStudio,
  onSettings,
  compact = false,
  className,
}: Props) {
  const [shareOpen, setShareOpen] = useState(false);
  const iconBtn = cn("rounded-full shrink-0", compact && "h-8 w-8");
  const ctaBtn = cn(
    "rounded-full shrink-0",
    compact ? "h-8 px-3.5 text-xs" : "h-10 px-3.5 sm:px-4",
  );

  return (
    <div className={cn("flex items-center gap-1.5 sm:gap-2 shrink-0", className)}>
      {onBecomeCreator ? (
        <Button
          type="button"
          onClick={onBecomeCreator}
          variant="gradient"
          className={ctaBtn}
          aria-label="Become a Creator"
        >
          <Rocket className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
          <span className={cn(compact && "hidden min-[420px]:inline")}>Become a Creator</span>
        </Button>
      ) : onStudio ? (
        <Button
          type="button"
          onClick={onStudio}
          variant="gradient"
          className={ctaBtn}
          aria-label="My Studio"
        >
          <ManageWorkIcon className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
          My Studio
        </Button>
      ) : null}
      {onPost ? (
        <Button
          onClick={onPost}
          size="icon"
          variant="gradient"
          className={iconBtn}
          title="โพสต์ชุมชน"
          aria-label="โพสต์ชุมชน"
        >
          <Plus className="h-4 w-4" />
        </Button>
      ) : null}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className={iconBtn}
            title="เพิ่มเติม"
            aria-label="เพิ่มเติม"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[13rem] rounded-xl p-1.5">
          {onPreview ? (
            <DropdownMenuItem className="cursor-pointer gap-2 rounded-lg" onSelect={onPreview}>
              <Eye className="h-3.5 w-3.5" />
              พรีวิว
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuItem
            className="cursor-pointer gap-2 rounded-lg"
            onSelect={() => {
              window.setTimeout(() => setShareOpen(true), 0);
            }}
          >
            <Share2 className="h-3.5 w-3.5" />
            แชร์
          </DropdownMenuItem>
          {onSettings ? (
            <DropdownMenuItem className="cursor-pointer gap-2 rounded-lg" onSelect={onSettings}>
              <Settings className="h-3.5 w-3.5" />
              ตั้งค่า
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      <ProfileSharePopover
        open={shareOpen}
        onOpenChange={setShareOpen}
        url={shareUrl}
        title={shareTitle}
        message={shareMessage}
        pathLabel={sharePathLabel}
        imageUrl={shareImageUrl}
        onShared={onShareInteract}
      />
    </div>
  );
}
