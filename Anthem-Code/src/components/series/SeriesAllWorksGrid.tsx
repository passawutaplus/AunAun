import { useState } from "react";
import { BarChart3, GripVertical } from "lucide-react";
import { Link } from "react-router-dom";
import { SeriesAnimatedGrid } from "@/components/series/SeriesAnimatedGrid";
import { cn } from "@/lib/utils";
import { writeSeriesProjectDragId } from "@/lib/seriesDnD";
import type { SeriesWorksDensity } from "@/lib/seriesGridDensity";
import type { DBProject } from "@/hooks/useProjects";
import type { ProjectManageStats } from "@/hooks/usePortfolioProjectStats";
import { EMPTY_PROJECT_STATS } from "@/hooks/usePortfolioProjectStats";

type Props = {
  projects: DBProject[];
  density: SeriesWorksDensity;
  emptyHint?: string;
  statsMap?: Record<string, ProjectManageStats>;
  onShowStats?: (projectId: string) => void;
};

function DraggableWorkCard({
  project,
  density,
  stats = EMPTY_PROJECT_STATS,
  onShowStats,
}: {
  project: DBProject;
  density: SeriesWorksDensity;
  stats?: ProjectManageStats;
  onShowStats?: (projectId: string) => void;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const cover = project.cover_url || project.gallery_urls?.[0] || "";
  const isList = density === "list";
  const compact = density === "small";
  const canStats = project.status === "Published" && !!onShowStats;

  return (
    <div
      draggable
      onDragStart={(e) => {
        writeSeriesProjectDragId(e.dataTransfer, project.id);
        setIsDragging(true);
      }}
      onDragEnd={() => setIsDragging(false)}
      className={cn(
        "group relative rounded-xl border border-border/60 bg-card overflow-hidden cursor-grab active:cursor-grabbing",
        isList ? "flex items-center gap-3 p-2" : "flex flex-col",
        isDragging && "opacity-40 ring-2 ring-primary/40",
      )}
    >
      <span
        className={cn(
          "pointer-events-none absolute z-10 flex h-7 w-7 items-center justify-center rounded-md border border-border/60 bg-background/90 text-muted-foreground shadow-sm",
          isList ? "right-2 top-1/2 -translate-y-1/2" : "right-2 top-2",
          !isDragging && "opacity-0 group-hover:opacity-100",
        )}
        aria-hidden
      >
        <GripVertical className="h-3.5 w-3.5" />
      </span>

      {isList ? (
        <>
          <Link
            to={`/project/${project.id}`}
            className="h-14 w-20 shrink-0 overflow-hidden rounded-lg bg-muted"
          >
            {cover ? (
              <img src={cover} alt="" className="h-full w-full object-cover" loading="lazy" />
            ) : null}
          </Link>
          <div className="min-w-0 flex-1 pr-9 space-y-1">
            <Link
              to={`/project/${project.id}`}
              className="block truncate text-sm font-medium text-foreground hover:underline"
            >
              {project.title}
            </Link>
            <p className="text-[11px] text-muted-foreground">
              {project.status}
              {typeof project.views === "number" ? ` · ดู ${project.views.toLocaleString()}` : ""}
            </p>
            {canStats ? (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onShowStats?.(project.id);
                }}
                onMouseDown={(e) => e.stopPropagation()}
                onDragStart={(e) => e.preventDefault()}
                className="inline-flex items-center gap-1 rounded-md text-[11px] text-muted-foreground hover:text-foreground"
              >
                <BarChart3 className="h-3 w-3" />
                ดูสถิติ
                {stats.views7d > 0 ? (
                  <span className="text-primary">· 7 วัน {stats.views7d}</span>
                ) : null}
              </button>
            ) : null}
          </div>
        </>
      ) : (
        <>
          <Link
            to={`/project/${project.id}`}
            className={cn("relative block w-full bg-muted", compact ? "aspect-[4/3]" : "aspect-[4/3]")}
          >
            {cover ? (
              <img src={cover} alt="" className="h-full w-full object-cover" loading="lazy" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                ไม่มีภาพ
              </div>
            )}
            {project.status !== "Published" ? (
              <span className="absolute left-2 top-2 rounded-md bg-background/90 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                {project.status}
              </span>
            ) : null}
          </Link>
          <div className={cn("space-y-1.5 p-2", compact && "p-1.5 space-y-1")}>
            <Link
              to={`/project/${project.id}`}
              className={cn(
                "block font-medium text-foreground hover:underline line-clamp-1",
                compact ? "text-[11px]" : "text-xs sm:text-sm",
              )}
            >
              {project.title}
            </Link>
            <p className="text-[10px] text-muted-foreground tabular-nums">
              ดู {(project.views ?? 0).toLocaleString()} · ถูกใจ {(project.likes ?? 0).toLocaleString()}
            </p>
            {canStats ? (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onShowStats?.(project.id);
                }}
                onMouseDown={(e) => e.stopPropagation()}
                onDragStart={(e) => e.preventDefault()}
                className="w-full flex items-center justify-center gap-1 rounded-lg border border-dashed border-border/80 py-1 text-[11px] text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
              >
                <BarChart3 className="h-3 w-3" />
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
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}

export function SeriesAllWorksGrid({
  projects,
  density,
  emptyHint = "ยังไม่มีผลงาน — สร้างงานใหม่จากแดชบอร์ดได้เลย",
  statsMap = {},
  onShowStats,
}: Props) {
  if (projects.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border/70 bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
        {emptyHint}
      </div>
    );
  }

  return (
    <SeriesAnimatedGrid density={density} layoutGroupId="series-works-layout">
      {projects.map((project) => (
        <DraggableWorkCard
          key={project.id}
          project={project}
          density={density}
          stats={statsMap[project.id] ?? EMPTY_PROJECT_STATS}
          onShowStats={onShowStats}
        />
      ))}
    </SeriesAnimatedGrid>
  );
}

export function SeriesAllWorksEmptyFiltered({ hint }: { hint?: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border/70 bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
      {hint ?? "ไม่พบงานตามตัวกรอง — ลองเปลี่ยนสถานะหรือคำค้นหา"}
    </div>
  );
}
