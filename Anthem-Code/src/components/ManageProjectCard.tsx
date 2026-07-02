import {
  ArrowDown,
  ArrowUp,
  Eye,
  Mail,
  Pencil,
  Pin,
  PinOff,
  Trash2,
} from "lucide-react";
import { PlusOneControl } from "@/components/brand/PlusOneControl";
import type { Project } from "@/data/projectTypes";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { timeAgoTH } from "@/lib/format";

interface ManageProjectCardProps {
  project: Project;
  onDelete?: (id: string) => void;
  editable?: boolean;
  isPinned?: boolean;
  hireCount?: number;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  onPin?: () => void;
  onUnpin?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  orderBusy?: boolean;
}

const ManageProjectCard = ({
  project,
  onDelete,
  editable,
  isPinned,
  hireCount = 0,
  canMoveUp,
  canMoveDown,
  onPin,
  onUnpin,
  onMoveUp,
  onMoveDown,
  orderBusy,
}: ManageProjectCardProps) => {
  const navigate = useNavigate();
  const dateLabel =
    project.publishedDate && !Number.isNaN(Date.parse(project.publishedDate))
      ? timeAgoTH(project.publishedDate)
      : project.publishedDate;

  return (
    <div className="rounded-xl overflow-hidden glass-panel">
      <div className="relative">
        <img
          src={project.image}
          alt={project.title}
          className="w-full h-48 object-cover"
          loading="lazy"
        />
        <div className="absolute top-3 left-3 flex gap-2 flex-wrap">
          {isPinned && (
            <Badge className="bg-amber-500 text-white text-xs border-0">
              <Pin className="w-3 h-3 mr-0.5" /> ปักหมุด
            </Badge>
          )}
          {project.status === "Published" && (
            <Badge className="bg-success text-success-foreground text-xs">
              ⊕ Published
            </Badge>
          )}
          {project.status === "Draft" && (
            <Badge variant="outline" className="bg-card/80 text-muted-foreground text-xs">
              Draft
            </Badge>
          )}
          {project.status === "Private" && (
            <Badge variant="outline" className="bg-card/80 text-muted-foreground text-xs">
              Private
            </Badge>
          )}
          <Badge className="bg-primary text-primary-foreground text-xs">
            {project.category}
          </Badge>
        </div>
      </div>

      <div className="p-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-semibold text-foreground truncate">{project.title}</h3>
          <div className="flex items-center gap-0.5 shrink-0">
            {editable && onMoveUp && (
              <button
                onClick={onMoveUp}
                disabled={!canMoveUp || orderBusy}
                className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30"
                aria-label="เลื่อนขึ้น"
              >
                <ArrowUp className="w-4 h-4" />
              </button>
            )}
            {editable && onMoveDown && (
              <button
                onClick={onMoveDown}
                disabled={!canMoveDown || orderBusy}
                className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30"
                aria-label="เลื่อนลง"
              >
                <ArrowDown className="w-4 h-4" />
              </button>
            )}
            {editable && (onPin || onUnpin) && (
              <button
                onClick={isPinned ? onUnpin : onPin}
                disabled={orderBusy}
                className="p-1.5 rounded-lg hover:bg-amber-500/10 text-muted-foreground hover:text-amber-600 transition-colors"
                aria-label={isPinned ? "ยกเลิกปักหมุด" : "ปักหมุด"}
              >
                {isPinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
              </button>
            )}
            {editable && (
              <button
                onClick={() => navigate(`/portfolio/${project.id}/edit`)}
                className="p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                aria-label="แก้ไข"
              >
                <Pencil className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => onDelete?.(project.id)}
              className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
              aria-label="ลบ"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between mt-3 gap-2">
          <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1">
              <Eye className="w-3.5 h-3.5" />
              {project.views.toLocaleString()}
            </span>
            <PlusOneControl active={false} count={project.likes} showCount ariaLabel="+1" />
            {hireCount > 0 && (
              <span className="flex items-center gap-1 text-[hsl(var(--chat-hire))]">
                <Mail className="w-3.5 h-3.5" />
                {hireCount} คำขอจ้าง
              </span>
            )}
          </div>
          <span className="text-xs text-muted-foreground shrink-0">{dateLabel}</span>
        </div>
      </div>
    </div>
  );
};

export default ManageProjectCard;
