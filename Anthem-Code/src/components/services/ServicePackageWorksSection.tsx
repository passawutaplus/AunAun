import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, FolderOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export type PackageWorkCard = {
  id: string;
  title: string;
  cover_url: string | null;
  gallery_urls: string[] | null;
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
        .select("id, title, cover_url, gallery_urls, status")
        .in("id", ids)
        .eq("status", "Published");
      if (error) throw error;
      const byId = new Map((data ?? []).map((row) => [row.id, row as PackageWorkCard]));
      // Preserve curator order
      return ids.map((id) => byId.get(id)).filter(Boolean) as PackageWorkCard[];
    },
  });
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
      <div
        className={cn(
          "grid gap-2.5",
          projects.length === 1
            ? "grid-cols-1 max-w-xs"
            : projects.length === 2
              ? "grid-cols-2"
              : "grid-cols-2 sm:grid-cols-3",
        )}
      >
        {projects.map((p) => {
          const cover = coverOf(p);
          const href =
            serviceId && serviceId !== "preview"
              ? `/project/${p.id}?fromPackage=${encodeURIComponent(serviceId)}`
              : `/project/${p.id}`;
          return (
            <Link
              key={p.id}
              to={href}
              className={cn(
                "group relative overflow-hidden rounded-xl border border-border/70 bg-card/60",
                "transition-colors hover:border-primary/40 hover:bg-card",
              )}
            >
              <div className="aspect-[4/3] bg-muted">
                {cover ? (
                  <img
                    src={cover}
                    alt=""
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                    loading="lazy"
                  />
                ) : (
                  <div className="grid h-full place-items-center text-muted-foreground">
                    <FolderOpen className="h-6 w-6 opacity-40" />
                  </div>
                )}
              </div>
              <div className="flex items-start justify-between gap-1.5 p-2.5">
                <p className="line-clamp-2 min-w-0 flex-1 text-xs font-semibold leading-snug text-foreground group-hover:text-primary">
                  {p.title}
                </p>
                <ArrowUpRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground group-hover:text-primary" />
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
