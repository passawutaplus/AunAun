import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Eye, FolderOpen } from "lucide-react";
import { PlusOneControl } from "@/components/brand/PlusOneControl";
import { useProjectLike } from "@/hooks/useProjectInteractions";
import { thumbFeedCoverUrl } from "@/lib/feedProjectCover";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export type PackageWorkCard = {
  id: string;
  title: string;
  cover_url: string | null;
  gallery_urls: string[] | null;
  views?: number | null;
};

type Props = {
  projectIds: string[];
  /** Current package id — used so project pages can return here */
  serviceId: string;
  className?: string;
  compact?: boolean;
};

function coverOf(p: PackageWorkCard) {
  return p.cover_url?.trim() || p.gallery_urls?.[0] || null;
}

export function usePackageReferenceProjects(projectIds: string[]) {
  const ids = projectIds.filter(Boolean);
  return useQuery({
    queryKey: ["package-reference-projects", ids.join(",")],
    enabled: ids.length > 0,
    queryFn: async (): Promise<PackageWorkCard[]> => {
      const { data, error } = await supabase
        .from("projects")
        .select("id, title, cover_url, gallery_urls, status, views")
        .in("id", ids)
        .eq("status", "Published");
      if (error) throw error;
      const byId = new Map((data ?? []).map((row) => [row.id, row as PackageWorkCard]));
      // Preserve curator order
      return ids.map((id) => byId.get(id)).filter(Boolean) as PackageWorkCard[];
    },
  });
}

const compact = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : String(n));

/** Same look as a home feed work card: cover, then title with views and likes. */
function PackageWorkTile({ project: p, serviceId }: { project: PackageWorkCard; serviceId: string }) {
  const { likes, isLiked, toggle } = useProjectLike(p.id);
  const cover = coverOf(p);
  const href =
    serviceId && serviceId !== "preview" ? `/project/${p.id}?fromPackage=${encodeURIComponent(serviceId)}` : `/project/${p.id}`;
  return (
    <div className="group min-w-0">
      <Link to={href} className="block">
        <div className="relative aspect-[4/3] overflow-hidden rounded-[6px] bg-muted">
          {cover ? (
            <img
              src={thumbFeedCoverUrl(cover)}
              alt={p.title}
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
              loading="lazy"
            />
          ) : (
            <div className="grid h-full place-items-center text-muted-foreground">
              <FolderOpen className="h-5 w-5 opacity-40" />
            </div>
          )}
        </div>
      </Link>
      <div className="flex items-center justify-between gap-2 px-0.5 pt-1.5">
        <Link to={href} className="min-w-0 truncate text-xs text-foreground/90 hover:text-primary">
          {p.title}
        </Link>
        <div className="flex shrink-0 items-center gap-2 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1" aria-label="ยอดเข้าชม">
            <Eye className="h-3 w-3" aria-hidden />
            {compact(p.views ?? 0)}
          </span>
          <PlusOneControl active={isLiked} count={likes} onClick={() => toggle()} ariaLabel={isLiked ? "ยกเลิกถูกใจ" : "ถูกใจ"} />
        </div>
      </div>
    </div>
  );
}

/** Sample works linked from a package — open project then return via fromPackage. */
export default function ServicePackageWorksSection({
  projectIds,
  serviceId,
  className,
  compact,
}: Props) {
  const { data: projects = [] } = usePackageReferenceProjects(projectIds);
  if (!projects.length) return null;

  return (
    <section className={cn("space-y-2.5", className)}>
      <div>
        <h3 className={cn("font-semibold text-foreground", compact ? "text-sm" : "text-sm")}>
          ผลงานตัวอย่าง
        </h3>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {projects.map((p) => (
          <PackageWorkTile key={p.id} project={p} serviceId={serviceId} />
        ))}
      </div>
    </section>
  );
}
