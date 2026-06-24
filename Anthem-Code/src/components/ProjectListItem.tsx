import BriefcaseIcon from "./icons/BriefcaseIcon";
import { Heart, Eye, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { Project } from "@/data/projectTypes";
import { useProjectLike } from "@/hooks/useProjectInteractions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ProjectListItemProps {
  project: Project;
  onHireClick?: (projectId: string) => void;
  onCollabClick?: (projectId: string) => void;
}

const ProjectListItem = ({ project, onHireClick, onCollabClick }: ProjectListItemProps) => {
  const navigate = useNavigate();
  const isDbProject = /^[0-9a-f]{8}-/.test(project.id);
  const { likes, isLiked, toggle: toggleLike } = useProjectLike(isDbProject ? project.id : undefined);

  const stop = (fn: () => void) => (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    fn();
  };

  return (
    <div
      onClick={() => navigate(`/project/${project.id}`)}
      className="group flex items-center gap-3 sm:gap-4 p-2 sm:p-3 rounded-xl glass-panel hover:bg-accent/40 transition cursor-pointer"
    >
      <div className="relative shrink-0 w-20 h-20 sm:w-28 sm:h-28 rounded-lg overflow-hidden bg-muted">
        <img src={project.image} alt={project.title} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-sm sm:text-base text-foreground truncate">{project.title}</h3>
          <Badge variant="secondary" className="hidden sm:inline-flex shrink-0 text-xs">{project.category}</Badge>
        </div>

        <button
          onClick={stop(() => project.ownerId && navigate(`/u/${project.ownerId}`))}
          className="flex items-center gap-2 mt-1 text-xs sm:text-sm text-muted-foreground hover:text-foreground transition"
        >
          {project.ownerAvatar ? (
            <img src={project.ownerAvatar} alt={project.owner} className="w-5 h-5 rounded-full object-cover" />
          ) : (
            <div className="w-5 h-5 rounded-full bg-gradient-brand" />
          )}
          <span className="truncate">{project.owner}</span>
        </button>

        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
          <button onClick={stop(toggleLike)} className={cn("flex items-center gap-1 hover:text-foreground transition", isLiked && "text-primary")}>
            <Heart className={cn("w-3.5 h-3.5", isLiked && "fill-primary")} />
            <span>{likes}</span>
          </button>
          <span className="flex items-center gap-1">
            <Eye className="w-3.5 h-3.5" />
            {project.views}
          </span>
        </div>
      </div>

      <div className="hidden sm:flex flex-col gap-1.5 shrink-0">
        <Button
          size="sm"
          onClick={stop(() => onHireClick?.(project.id))}
          className="rounded-full bg-gradient-brand text-white hover:opacity-90 h-8 text-xs"
        >
          <BriefcaseIcon className="w-3.5 h-3.5 mr-1" /> จ้าง
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={stop(() => onCollabClick?.(project.id))}
          className="rounded-full h-8 text-xs"
        >
          <Users className="w-3.5 h-3.5 mr-1" /> Collab
        </Button>
      </div>
    </div>
  );
};

export default ProjectListItem;
