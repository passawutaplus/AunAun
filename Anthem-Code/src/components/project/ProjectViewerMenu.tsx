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
import { BlockConfirmDialog } from "@/components/report/BlockConfirmDialog";
import { useAuth } from "@/hooks/useAuth";
import { useAuthDialog } from "@/stores/authDialogStore";
import { useUserBlocks } from "@/hooks/useCommunityPostInteractions";
import { hideProjectId } from "@/lib/hiddenProjects";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useProjectT } from "@/lib/i18n/project";

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
  const { t } = useProjectT();
  const openSignup = useAuthDialog((s) => s.openSignup);
  const { data: blockedSet } = useUserBlocks(user?.id);
  const [reportOpen, setReportOpen] = useState(false);
  const [blockOpen, setBlockOpen] = useState(false);
  const alreadyBlocked = !!blockedSet?.has(ownerId);
  const name = ownerName.trim() || t("thisUser");

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
            aria-label={t("optionsAria")}
            className={cn(
              "rounded-md p-2 min-h-11 min-w-11 text-muted-foreground hover:bg-muted/30 hover:text-foreground transition-colors",
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
              toast.success(t("hidden"));
              onHidden?.();
            }}
          >
            <EyeOff className="h-4 w-4 shrink-0" aria-hidden />
            {t("hideWork")}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="cursor-pointer items-start gap-2 py-2.5"
            disabled={alreadyBlocked}
            onClick={() => {
              if (!requireUser()) return;
              setBlockOpen(true);
            }}
          >
            <UserX className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span className="flex min-w-0 flex-col gap-0.5 text-left">
              <span>{alreadyBlocked ? t("blocked", { name }) : t("block", { name })}</span>
              <span className="text-xs font-normal text-muted-foreground whitespace-normal">
                {t("blockHint")}
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
            {t("report")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <BlockConfirmDialog
        open={blockOpen}
        onOpenChange={setBlockOpen}
        userId={ownerId}
        name={ownerName}
        onBlocked={onBlocked}
      />
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
