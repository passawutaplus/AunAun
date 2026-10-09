import { Loader2 } from "lucide-react";
import SeoHead from "@/components/SeoHead";
import StudioLayout from "@/components/dashboard/StudioLayout";
import CatalogManagePanel from "@/components/series/CatalogManagePanel";
import PortfolioObjectsManagePanel from "@/components/portfolio/PortfolioObjectsManagePanel";
import PortfolioPackagesManagePanel from "@/components/portfolio/PortfolioPackagesManagePanel";
import PortfolioWorksManagePanel from "@/components/portfolio/PortfolioWorksManagePanel";
import { useAuth } from "@/hooks/useAuth";
import {
  STUDIO_CATALOGS_PATH,
  STUDIO_OBJECTS_PATH,
  STUDIO_PACKAGES_PATH,
  STUDIO_PROJECTS_PATH,
} from "@/lib/studioNav";

export type DashboardPortfolioMode = "projects" | "packages" | "objects" | "catalogs";

const META: Record<DashboardPortfolioMode, { title: string; path: string }> = {
  projects: { title: "Projects", path: STUDIO_PROJECTS_PATH },
  packages: { title: "Packages", path: STUDIO_PACKAGES_PATH },
  objects: { title: "Objects", path: STUDIO_OBJECTS_PATH },
  catalogs: { title: "Catalogs", path: STUDIO_CATALOGS_PATH },
};

type Props = {
  mode: DashboardPortfolioMode;
};

/** My Studio: manage projects, packages, or catalogs. */
export default function DashboardPortfolioPage({ mode }: Props) {
  const { user, loading: authLoading } = useAuth();
  const meta = META[mode];

  return (
    <StudioLayout>
      <SeoHead title={`My Studio — ${meta.title}`} path={meta.path} noindex />
      {authLoading || !user ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          กำลังโหลด…
        </div>
      ) : mode === "projects" ? (
        <PortfolioWorksManagePanel userId={user.id} showDesignDrill showStudioLink={false} />
      ) : mode === "packages" ? (
        <PortfolioPackagesManagePanel ownerId={user.id} />
      ) : mode === "objects" ? (
        <PortfolioObjectsManagePanel />
      ) : (
        <CatalogManagePanel userId={user.id} />
      )}
    </StudioLayout>
  );
}
