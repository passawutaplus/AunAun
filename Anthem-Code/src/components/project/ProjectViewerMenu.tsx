import { useState } from "react";
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
import { hideProjectId } from "@/lib/hiddenProjects";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Props = {
  projectId: string;
  ownerId: string;
  ownerName: string;
  onHidden?: () => void;
  onBlocked?: () => void;
  className?: string;
};

export function ProjectViewerMenu({
  projectId,
  ownerId,
  ownerName,
  onHidden,
  onBlocked,
  className,
}: Props) {
  const { user } = useAuth();
  const openSignup = useAuthDialog((s) => s.openSignup);
  const blockMut = useBlockUser();
  const { data: blockedSet } = useUserBlocks(user?.id);
  const [reportOpen, setReportOpen] = useState(false);
  const alreadyBlocked = !!blockedSet?.has(ownerId);
  const name = ownerName.trim() || "ผู้ใช้นี้";

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
            aria-label="ตัวเลือกผลงาน"
            className={cn(
              "rounded-md p-2 min-h-11 min-w-11 text-muted-foreground/50 hover:bg-muted/30 hover:text-foreground transition-colors",
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
              hideProjectId(projectId);
              toast.success("ซ่อนผลงานนี้แล้ว");
              onHidden?.();
            }}
          >
            <EyeOff className="h-4 w-4 shrink-0" aria-hidden />
            ซ่อนผลงานนี้
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="cursor-pointer items-start gap-2 py-2.5"
            disabled={alreadyBlocked || blockMut.isPending}
            onClick={() => {
              if (!requireUser()) return;
              void blockMut
                .mutateAsync(ownerId)
                .then(() => onBlocked?.())
                .catch((err) => {
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
            รายงาน
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ReportDialog
        targetType="project"
        targetId={projectId}
        targetOwnerId={ownerId}
        open={reportOpen}
        onOpenChange={setReportOpen}
        hideTrigger
      />
    </>
  );
}
