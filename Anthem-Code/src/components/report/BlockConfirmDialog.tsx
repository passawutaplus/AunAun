import { useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useBlockUser } from "@/hooks/useCommunityPostInteractions";
import { COMMON, useT } from "@/lib/i18n";
import { REPORT } from "@/lib/i18n/report";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  /** Shown in the question; falls back to "this user". */
  name?: string;
  onBlocked?: () => void;
};

/** Blocking hides two people from each other, so it asks first instead of acting on one tap. */
export function BlockConfirmDialog({ open, onOpenChange, userId, name, onBlocked }: Props) {
  const t = useT(REPORT);
  const tc = useT(COMMON);
  const block = useBlockUser();
  const [busy, setBusy] = useState(false);
  const label = name?.trim() || t("thisUser");

  const confirm = async () => {
    setBusy(true);
    try {
      await block.mutateAsync(userId);
      onOpenChange(false);
      onBlocked?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("blockFailed"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <AlertDialogContent className="rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("blockConfirmTitle", { name: label })}</AlertDialogTitle>
          <AlertDialogDescription className="leading-relaxed">{t("blockConfirmBody")}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>{tc("cancel")}</AlertDialogCancel>
          <AlertDialogAction
            disabled={busy}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={(e) => {
              e.preventDefault();
              void confirm();
            }}
          >
            {busy ? t("blocking") : t("blockConfirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
