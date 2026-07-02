import { Link, useNavigate } from "react-router-dom";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useDeleteProject } from "@/hooks/useProjects";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Props = {
  projectId: string;
  projectTitle: string;
  className?: string;
  triggerClassName?: string;
};

export function ProjectOwnerMenu({ projectId, projectTitle, className, triggerClassName }: Props) {
  const navigate = useNavigate();
  const deleteProject = useDeleteProject();

  const handleDelete = async () => {
    const label = projectTitle.trim() || "ผลงานนี้";
    if (!window.confirm(`ลบผลงาน "${label}" ถาวร?`)) return;
    try {
      await deleteProject.mutateAsync(projectId);
      toast.success("ลบผลงานแล้ว");
      navigate("/portfolio/manage", { replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "ลบไม่สำเร็จ");
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="ตัวเลือกผลงาน"
          className={
            triggerClassName ??
            cn(
              "rounded-full p-1.5 text-muted-foreground hover:bg-muted/60 hover:text-foreground",
              className,
            )
          }
        >
          <MoreHorizontal className="w-5 h-5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="rounded-xl w-48">
        <DropdownMenuItem asChild className="gap-2 cursor-pointer">
          <Link to={`/portfolio/${projectId}/edit`}>
            <Pencil className="w-4 h-4" /> แก้ไขผลงาน
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          className="gap-2 text-destructive focus:text-destructive cursor-pointer"
          onClick={() => void handleDelete()}
          disabled={deleteProject.isPending}
        >
          <Trash2 className="w-4 h-4" /> ลบผลงาน
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
