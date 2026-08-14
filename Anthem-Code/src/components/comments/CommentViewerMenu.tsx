import { useState, useSyncExternalStore } from "react";
import { EyeOff, Flag, MoreHorizontal, UserX } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import ReportDialog from "@/components/report/ReportDialog";
import { useAuth } from "@/hooks/useAuth";
import { useAuthDialog } from "@/stores/authDialogStore";
import { useBlockUser, useUserBlocks } from "@/hooks/useCommunityPostInteractions";
import { hideCommentId } from "@/lib/hiddenComments";
import type { ReportTargetType } from "@/hooks/useReports";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Props = {
  commentId: string;
  authorId: string;
  authorName: string;
  reportType: Extract<ReportTargetType, "comment" | "community_comment">;
  className?: string;
};

export function CommentViewerMenu({ commentId, authorId, authorName, reportType, className }: Props) {
  const { user } = useAuth();
  const openSignup = useAuthDialog((s) => s.openSignup);
  const blockMut = useBlockUser();
  const { data: blockedSet } = useUserBlocks(user?.id);
  const [reportOpen, setReportOpen] = useState(false);
  const alreadyBlocked = !!blockedSet?.has(authorId);
  const name = authorName.trim() || "ผู้ใช้นี้";

  const requireUser = () => {
    if (user) return true;
    openSignup();
    return false;
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="ตัวเลือกความคิดเห็น"
            className={cn(
              "rounded-full p-1 text-muted-foreground hover:bg-muted/60 hover:text-foreground",
              className,
            )}
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="rounded-xl w-64 p-1">
          <DropdownMenuItem
            className="cursor-pointer gap-2 py-2.5"
            onClick={() => {
              hideCommentId(commentId);
              toast.success("ซ่อนความคิดเห็นแล้ว");
            }}
          >
            <EyeOff className="h-4 w-4 shrink-0" aria-hidden />
            ซ่อนความคิดเห็น
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="cursor-pointer items-start gap-2 py-2.5"
            disabled={alreadyBlocked || blockMut.isPending}
            onClick={() => {
              if (!requireUser()) return;
              void blockMut.mutateAsync(authorId).catch((err) => {
                toast.error(err instanceof Error ? err.message : "บล็อกไม่สำเร็จ");
              });
            }}
          >
            <UserX className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span className="flex min-w-0 flex-col gap-0.5 text-left">
              <span>{alreadyBlocked ? `บล็อก ${name} แล้ว` : `บล็อก ${name}`}</span>
              <span className="text-xs font-normal text-muted-foreground whitespace-normal">
                คุณจะไม่สามารถมองเห็นหรือติดต่อกันได้
              </span>
            </span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="cursor-pointer gap-2 py-2.5"
            onClick={() => {
              if (!requireUser()) return;
              setReportOpen(true);
            }}
          >
            <Flag className="h-4 w-4 shrink-0" aria-hidden />
            รายงานความคิดเห็น
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ReportDialog
        targetType={reportType}
        targetId={commentId}
        targetOwnerId={authorId}
        open={reportOpen}
        onOpenChange={setReportOpen}
        hideTrigger
      />
    </>
  );
}
