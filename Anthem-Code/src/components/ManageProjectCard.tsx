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
    <div className="rounded-xl overflow-hidden glass-panel h-full flex flex-col">
      <div className="relative h-40 bg-muted shrink-0">
        {project.image ? (
          <img
            src={project.image}
            alt={project.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
            ไม่มีรูปปก
          </div>
        )}
        <div className="absolute top-2 left-2 flex gap-1.5 flex-wrap max-w-[calc(100%-1rem)]">
          {isPinned && (
            <Badge className="bg-amber-500 text-white text-[10px] border-0 px-1.5 py-0">
              <Pin className="w-2.5 h-2.5 mr-0.5" /> ปักหมุด
            </Badge>
          )}
          {project.status === "Published" && (
            <Badge className="bg-success text-success-foreground text-[10px] border-0 px-1.5 py-0">
              เผยแพร่
            </Badge>
          )}
          {project.status === "Draft" && (
            <Badge variant="outline" className="bg-card/90 text-muted-foreground text-[10px] px-1.5 py-0">
              แบบร่าง
            </Badge>
          )}
          {project.status === "Private" && (
            <Badge variant="outline" className="bg-card/90 text-muted-foreground text-[10px] px-1.5 py-0">
              ส่วนตัว
            </Badge>
          )}
          <Badge className="bg-primary/90 text-primary-foreground text-[10px] border-0 px-1.5 py-0">
            {project.category}
          </Badge>
        </div>
      </div>

      <div className="p-3 flex flex-col flex-1 gap-2">
        <div className="flex-1 min-h-0">
          <h3 className="font-semibold text-foreground text-sm line-clamp-2 leading-snug">{project.title}</h3>
          <p className="text-xs text-muted-foreground mt-1">{dateLabel}</p>
        </div>

        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
          <span className="inline-flex items-center gap-1">
            <Eye className="w-3.5 h-3.5" />
            {project.views.toLocaleString()}
          </span>
          <PlusOneControl
            active={false}
            count={project.likes}
            showCount
            size="sm"
            className="pointer-events-none text-muted-foreground"
          />
          {hireCount > 0 && (
            <span className="inline-flex items-center gap-1 text-[hsl(var(--chat-hire))]">
              <Mail className="w-3.5 h-3.5" />
              {hireCount}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between gap-1 pt-2 border-t border-border/50">
          <div className="flex items-center gap-0.5">
            {editable && onMoveUp && (
              <button
                type="button"
                onClick={onMoveUp}
                disabled={!canMoveUp || orderBusy}
                className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30"
                aria-label="เลื่อนขึ้น"
              >
                <ArrowUp className="w-3.5 h-3.5" />
              </button>
            )}
            {editable && onMoveDown && (
              <button
                type="button"
                onClick={onMoveDown}
                disabled={!canMoveDown || orderBusy}
                className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30"
                aria-label="เลื่อนลง"
              >
                <ArrowDown className="w-3.5 h-3.5" />
              </button>
            )}
            {editable && (onPin || onUnpin) && (
              <button
                type="button"
                onClick={isPinned ? onUnpin : onPin}
                disabled={orderBusy}
                className="p-1.5 rounded-lg hover:bg-amber-500/10 text-muted-foreground hover:text-amber-600 transition-colors"
                aria-label={isPinned ? "ยกเลิกปักหมุด" : "ปักหมุด"}
              >
                {isPinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
              </button>
            )}
          </div>
          <div className="flex items-center gap-1">
            {project.status === "Published" && (
              <button
                type="button"
                onClick={() => navigate(`/project/${project.id}`)}
                className="px-2 py-1 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              >
                ดู
              </button>
            )}
            {editable && (
              <button
                type="button"
                onClick={() => navigate(`/portfolio/${project.id}/edit`)}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-primary hover:bg-primary/10 transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" />
                แก้ไข
              </button>
            )}
            <button
              type="button"
              onClick={() => onDelete?.(project.id)}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-destructive hover:bg-destructive/10 transition-colors"
              aria-label="ลบ"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManageProjectCard;
