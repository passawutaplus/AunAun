import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Eye } from "lucide-react";
import { PlusOneControl } from "@/components/brand/PlusOneControl";
import { DrillProjectBadge } from "@/components/drill/DrillProjectBadge";
import AiDisclosureBadge from "@/components/license/AiDisclosureBadge";
import { SeriesAnimatedGrid } from "@/components/series/SeriesAnimatedGrid";
import { smoothEase } from "@/lib/motion";
import type { Tables } from "@/integrations/supabase/types";
import { cn } from "@/lib/utils";
import { projectHasDrillTag } from "@/lib/drillProject";
import type { SeriesWorksDensity } from "@/lib/seriesGridDensity";

type Project = Tables<"projects">;

type Props = {
  projects: Project[];
  density?: SeriesWorksDensity;
};

function ProjectThumb({
  project,
  list,
}: {
  project: Project;
  list?: boolean;
}) {
  const tags = (project.tags as string[] | null) ?? null;
  const category = project.category?.trim() || "";

  if (list) {
    return (
      <Link
        to={`/project/${project.id}`}
        className="group flex items-center gap-3 rounded-xl border border-border/60 bg-card/40 p-2 hover:bg-card/80 transition-colors"
      >
        <div className="h-16 w-20 shrink-0 overflow-hidden rounded-lg bg-muted">
          {project.cover_url ? (
            <img src={project.cover_url} alt="" className="h-full w-full object-cover" loading="lazy" />
          ) : null}
        </div>
        <div className="min-w-0 flex-1">
          {category ? (
            <p className="text-[10px] font-medium text-primary truncate">{category}</p>
          ) : null}
          <h3 className="text-sm font-medium text-foreground line-clamp-1">{project.title}</h3>
          <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-0.5">
              <Eye className="h-3 w-3" />
              {project.views}
            </span>
            <span>+{project.likes}</span>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link to={`/project/${project.id}`} className="group block">
      <div className="relative w-full overflow-hidden rounded-[6px] bg-muted">
        {project.cover_url ? (
          <img
            src={project.cover_url}
            alt={project.title}
            className="w-full h-auto block transition-transform duration-500 group-hover:scale-[1.04]"
            loading="lazy"
          />
        ) : (
          <div className="aspect-square w-full flex items-center justify-center text-muted-foreground text-xs">
            ไม่มีรูป
          </div>
        )}

        {projectHasDrillTag(tags) || (project as { ai_assisted?: boolean }).ai_assisted ? (
          <div className="absolute top-2 right-2 z-10 flex flex-col items-end gap-1">
            {projectHasDrillTag(tags) ? <DrillProjectBadge tags={tags} /> : null}
            <AiDisclosureBadge
              assisted={(project as { ai_assisted?: boolean }).ai_assisted}
              note={(project as { ai_disclosure_note?: string | null }).ai_disclosure_note}
            />
          </div>
        ) : null}

        <div
          className={cn(
            "absolute inset-0 pointer-events-none transition-opacity duration-300",
            "bg-gradient-to-t from-black/55 via-black/20 to-transparent",
            "supports-[backdrop-filter]:backdrop-blur-md [-webkit-backdrop-filter:blur(12px)]",
            "[mask-image:linear-gradient(to_top,black_18%,transparent_48%)]",
            "[-webkit-mask-image:linear-gradient(to_top,black_18%,transparent_48%)]",
            "opacity-100 md:opacity-0 md:group-hover:opacity-100",
          )}
        />

        <div
          className={cn(
            "absolute bottom-2 left-2 right-2 space-y-1.5 pointer-events-none transition-opacity duration-300",
            "opacity-100 md:opacity-0 md:group-hover:opacity-100",
          )}
        >
          {category || tags?.length ? (
            <div className="flex flex-wrap items-center gap-1">
              {category ? (
                <span className="inline-flex rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
                  {category}
                </span>
              ) : null}
              <DrillProjectBadge tags={tags} />
            </div>
          ) : null}
          <p className="text-sm font-medium text-white line-clamp-2 thai-leading-tight drop-shadow">
            {project.title}
          </p>
          <div className="flex items-center justify-between text-xs text-white/90">
            <span className="flex items-center gap-1">
              <Eye className="w-3 h-3" />
              {project.views}
            </span>
            <PlusOneControl
              active={false}
              count={project.likes}
              showCount
              className="text-white"
              ariaLabel="+1"
            />
          </div>
        </div>
      </div>
    </Link>
  );
}

const PortfolioGrid = ({ projects, density = "medium" }: Props) => {
  if (!projects.length) {
    return null;
  }

  const isList = density === "list";

  return (
    <SeriesAnimatedGrid density={density} layoutGroupId="profile-works-density">
      {projects.map((p) => (
        <motion.div
          key={p.id}
          className={cn(!isList && "break-inside-avoid")}
          whileHover={isList ? undefined : { y: -2 }}
          transition={{ duration: 0.25, ease: smoothEase }}
        >
          <ProjectThumb project={p} list={isList} />
        </motion.div>
      ))}
    </SeriesAnimatedGrid>
  );
};

export default PortfolioGrid;
