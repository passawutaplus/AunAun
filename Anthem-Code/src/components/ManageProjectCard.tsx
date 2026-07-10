import {
  ArrowDown,
  ArrowUp,
  BarChart3,
  Eye,
  Handshake,
  Mail,
  Pencil,
  Pin,
  PinOff,
  Trash2,
} from "lucide-react";
import { PlusOneControl } from "@/components/brand/PlusOneControl";
import type { Project } from "@/data/projectTypes";
import type { ProjectManageStats } from "@/hooks/usePortfolioProjectStats";
import { EMPTY_PROJECT_STATS } from "@/hooks/usePortfolioProjectStats";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { timeAgoTH } from "@/lib/format";

interface ManageProjectCardProps {
  project: Project;
  onDelete?: (id: string) => void;
  editable?: boolean;
  isPinned?: boolean;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  onPin?: () => void;
  onUnpin?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  orderBusy?: boolean;
  stats?: ProjectManageStats;
  onShowStats?: () => void;
}

const ManageProjectCard = ({
  project,
  onDelete,
  editable,
  isPinned,
  canMoveUp,
  canMoveDown,
  onPin,
  onUnpin,
  onMoveUp,
  onMoveDown,
  orderBusy,
  stats = EMPTY_PROJECT_STATS,
  onShowStats,
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
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-foreground text-sm line-clamp-2 leading-snug min-w-0">
              {project.title}
            </h3>
            <div className="flex items-center gap-2 shrink-0 text-xs text-muted-foreground pt-0.5">
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
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-1">{dateLabel}</p>
        </div>

        {(stats.hireCount > 0 || stats.collabCount > 0) && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
            {stats.hireCount > 0 && (
              <span className="inline-flex items-center gap-1 text-[hsl(var(--chat-hire))]">
                <Mail className="w-3.5 h-3.5" />
                จ้าง {stats.hireCount}
              </span>
            )}
            {stats.collabCount > 0 && (
              <span className="inline-flex items-center gap-1 text-primary">
                <Handshake className="w-3.5 h-3.5" />
                คอลแลป {stats.collabCount}
              </span>
            )}
          </div>
        )}

        {onShowStats && project.status === "Published" && (
          <button
            type="button"
            onClick={onShowStats}
            className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-border/80 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
          >
            <BarChart3 className="w-3.5 h-3.5" />
            ดูสถิติผลงาน
            {(stats.views7d > 0 || stats.hireCount > 0 || stats.collabCount > 0) && (
              <span className="text-[10px] text-primary">
                · 7 วัน {stats.views7d}
                {stats.hireCount + stats.collabCount > 0
                  ? ` · โอกาส ${stats.hireCount + stats.collabCount}`
                  : ""}
              </span>
            )}
          </button>
        )}

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
