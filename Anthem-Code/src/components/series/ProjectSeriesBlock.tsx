import { Link } from "react-router-dom";
import { FolderKanban } from "lucide-react";
import { useSeriesForProject } from "@/hooks/useProjectSeries";
import { cn } from "@/lib/utils";

const MAX_SIBLINGS = 4;

interface Props {
  projectId: string | undefined;
  className?: string;
  /** Compact layout for project detail sidebar */
  compact?: boolean;
}

export function ProjectSeriesBlock({ projectId, className, compact = false }: Props) {
  const { data } = useSeriesForProject(projectId);

  if (!data?.series || !projectId) return null;

  const { series, items } = data;
  if (!series.is_public) return null;

  const siblings = items.filter(
    (i) => i.project?.status === "Published" && i.project_id !== projectId,
  );
  const publishedTotal = items.filter((i) => i.project?.status === "Published").length;
  if (publishedTotal < 1) return null;

  const shown = siblings.slice(0, MAX_SIBLINGS);
  const moreCount = Math.max(0, siblings.length - shown.length);

  return (
    <section className={cn("rounded-2xl glass-panel p-4 sm:p-5 space-y-3", className)}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <FolderKanban className="w-3.5 h-3.5 text-primary shrink-0" />
            ชุดงาน
            {series.client_label ? ` · ${series.client_label}` : ""}
          </p>
          <Link
            to={`/series/${series.id}`}
            className="text-sm font-semibold text-foreground hover:text-primary transition-colors line-clamp-2"
          >
            {series.title}
          </Link>
        </div>
        <Link
          to={`/series/${series.id}`}
          className="text-[11px] text-primary hover:underline shrink-0 pt-0.5"
        >
          ดูทั้งชุด
        </Link>
      </div>

      {shown.length > 0 ? (
        <>
          <p className="text-xs text-muted-foreground">
            งานอื่นในชุดนี้
            {siblings.length > MAX_SIBLINGS
              ? ` · แสดง ${shown.length}/${siblings.length}`
              : ` (${siblings.length})`}
          </p>
          <div className={cn(compact ? "grid grid-cols-2 gap-2" : "flex gap-2 overflow-x-auto pb-1")}>
            {shown.map((item) => {
              const p = item.project;
              if (!p) return null;
              const thumb = p.cover_url || p.gallery_urls?.[0];
              return (
                <Link
                  key={item.project_id}
                  to={`/project/${p.id}`}
                  className={cn("group", compact ? "min-w-0" : "shrink-0 w-24")}
                >
                  <div className="aspect-square rounded-xl overflow-hidden bg-muted border border-border/50 group-hover:border-primary/50 transition-colors">
                    {thumb ? (
                      <img src={thumb} alt="" className="w-full h-full object-cover" loading="lazy" />
                    ) : null}
                  </div>
                  <p className="mt-1 text-[11px] text-foreground line-clamp-2 leading-snug">
                    {item.role_label || p.title}
                  </p>
                </Link>
              );
            })}
          </div>
          {moreCount > 0 && (
            <Link
              to={`/series/${series.id}`}
              className="block text-center text-xs text-primary hover:underline pt-0.5"
            >
              ดูอีก {moreCount} ชิ้นในชุด →
            </Link>
          )}
        </>
      ) : (
        <p className="text-xs text-muted-foreground">ชิ้นนี้เป็นผลงานเดียวในชุดที่เผยแพร่แล้ว</p>
      )}
    </section>
  );
}
