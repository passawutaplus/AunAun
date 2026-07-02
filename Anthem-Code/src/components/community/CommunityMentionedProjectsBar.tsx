import { Link } from "react-router-dom";
import { FolderOpen, Layers3 } from "lucide-react";
import type { MentionedProjectSummary } from "@/lib/communityMentionedProjects";
import { cn } from "@/lib/utils";

type Props = {
  projects: MentionedProjectSummary[];
  linkable?: boolean;
  className?: string;
};

function ProjectThumb({ title, cover_url }: Pick<MentionedProjectSummary, "title" | "cover_url">) {
  if (cover_url) {
    return <img src={cover_url} alt="" className="w-7 h-7 rounded-md object-cover shrink-0" />;
  }
  return (
    <div className="w-7 h-7 rounded-md bg-muted shrink-0 grid place-items-center">
      <FolderOpen className="w-3.5 h-3.5 text-muted-foreground" />
    </div>
  );
}

export function CommunityMentionedProjectsBar({ projects, linkable = false, className }: Props) {
  if (!projects.length) return null;

  return (
    <div className={cn("px-4 py-2.5 border-t border-border/50 bg-muted/20", className)}>
      <div className="flex items-center gap-1.5 mb-2">
        <Layers3 className="w-3.5 h-3.5 text-primary shrink-0" aria-hidden />
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">อ้างอิงผลงาน</p>
      </div>
      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        {projects.map((p) => {
          const inner = (
            <>
              <ProjectThumb title={p.title} cover_url={p.cover_url} />
              <span className="text-xs font-medium truncate max-w-[140px]">{p.title}</span>
            </>
          );
          const chipClass =
            "inline-flex items-center gap-2 rounded-xl border border-border/70 bg-background px-2.5 py-1.5 shrink-0";

          if (linkable) {
            return (
              <Link key={p.id} to={`/project/${p.id}`} className={cn(chipClass, "hover:border-primary/40")}>
                {inner}
              </Link>
            );
          }
          return (
            <span key={p.id} className={chipClass}>
              {inner}
            </span>
          );
        })}
      </div>
    </div>
  );
}
