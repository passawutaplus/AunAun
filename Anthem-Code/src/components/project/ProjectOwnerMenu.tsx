import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DeleteConfirmDialog } from "@/components/ui/DeleteConfirmDialog";
import { useDeleteProject } from "@/hooks/useProjects";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useProjectT } from "@/lib/i18n/project";

type Props = {
  projectId: string;
  projectTitle: string;
  className?: string;
  triggerClassName?: string;
  /** "buttons": visible แก้ไขผลงาน button + icon-only delete instead of the ⋯ menu. */
  variant?: "menu" | "buttons";
};

export function ProjectOwnerMenu({ projectId, projectTitle, className, triggerClassName, variant = "menu" }: Props) {
  const navigate = useNavigate();
  const { t } = useProjectT();
  const deleteProject = useDeleteProject();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const label = projectTitle.trim() || t("thisWork");

  const handleConfirmDelete = async () => {
    try {
      await deleteProject.mutateAsync(projectId);
      toast.success(t("deleted"));
      setDeleteOpen(false);
      navigate("/portfolio", { replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("deleteFailed"));
    }
  };

  const confirm = (
    <DeleteConfirmDialog
      open={deleteOpen}
      onOpenChange={setDeleteOpen}
      title={t("deleteTitle")}
      description={t("deleteDesc", { title: label })}
      onConfirm={handleConfirmDelete}
      loading={deleteProject.isPending}
    />
  );

  if (variant === "buttons") {
    return (
      <div className={cn("flex shrink-0 items-center gap-1.5", className)}>
        <Button asChild size="sm" variant="outline" className="h-8 rounded-full">
          <Link to={`/portfolio/${projectId}/edit`}>
            <Pencil className="mr-1.5 h-3.5 w-3.5" aria-hidden /> {t("editWork")}
          </Link>
        </Button>
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="h-8 w-8 rounded-full text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={() => setDeleteOpen(true)}
          disabled={deleteProject.isPending}
          aria-label={t("deleteWork")}
          title={t("deleteWork")}
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden />
        </Button>
        {confirm}
      </div>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={t("optionsAria")}
            className={
              triggerClassName ??
              cn(
                "inline-flex items-center justify-center rounded-md p-2 min-h-11 min-w-11 text-muted-foreground hover:bg-muted/30 hover:text-foreground transition-colors",
                className,
              )
            }
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="rounded-xl w-48">
          <DropdownMenuItem asChild className="gap-2 cursor-pointer">
            <Link to={`/portfolio/${projectId}/edit`}>
              <Pencil className="w-4 h-4" /> {t("editWork")}
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem
            className="gap-2 text-destructive focus:text-destructive cursor-pointer"
            onClick={() => setDeleteOpen(true)}
            disabled={deleteProject.isPending}
          >
            <Trash2 className="w-4 h-4" /> {t("deleteWork")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={t("deleteTitle")}
        description={t("deleteDesc", { title: label })}
        onConfirm={handleConfirmDelete}
        loading={deleteProject.isPending}
      />
    </>
  );
}
