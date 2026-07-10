import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { FolderKanban, PanelsTopLeft, Plus } from "lucide-react";
import { BackButton } from "@/components/ui/BackButton";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { FeedModeTransition } from "@/components/feed/FeedModeTransition";
import { useAuth } from "@/hooks/useAuth";
import { useMyProjects, type DBProject } from "@/hooks/useProjects";
import { usePortfolioProjectStats } from "@/hooks/usePortfolioProjectStats";
import ProjectManageStatsDialog from "@/components/portfolio/ProjectManageStatsDialog";
import type { Project, ProjectStatus, Category } from "@/data/projectTypes";
import { DEFAULT_PROJECT_CATEGORY, normalizeProjectCategory } from "@/data/projectTypes";
import {
  useAddProjectsToSeries,
  useMyProjectSeries,
  useProjectSeriesItems,
  type ProjectSeries,
} from "@/hooks/useProjectSeries";
import { SeriesCard } from "@/components/series/SeriesCard";
import { SeriesFormDialog } from "@/components/series/SeriesFormDialog";
import { SeriesAddProjectsDialog } from "@/components/series/SeriesAddProjectsDialog";
import {
  SeriesWorkspaceSidebar,
  type SeriesSidebarSelection,
} from "@/components/series/SeriesWorkspaceSidebar";
import { SeriesWorkspaceDetail } from "@/components/series/SeriesWorkspaceDetail";
import {
  SeriesAllWorksEmptyFiltered,
  SeriesAllWorksGrid,
} from "@/components/series/SeriesAllWorksGrid";
import { SeriesAnimatedGrid } from "@/components/series/SeriesAnimatedGrid";
import {
  SeriesWorkspaceToolbar,
  type SeriesStatusFilter,
  type SeriesVisibilityFilter,
} from "@/components/series/SeriesWorkspaceToolbar";
import { InlineLoader } from "@/components/ui/BanterLoader";
import {
  SERIES_GRID_DENSITY_STORAGE_KEY,
  readSeriesDensity,
  writeSeriesDensity,
  type SeriesWorksDensity,
} from "@/lib/seriesGridDensity";
import {
  DEFAULT_PROJECT_MANAGE_SORT,
  type ProjectManageSortMode,
} from "@/lib/portfolioManageSort";
import { toast } from "sonner";

function parseSelection(
  params: URLSearchParams,
  seriesIds: Set<string>,
): SeriesSidebarSelection {
  const s = params.get("s");
  if (s === "works") return "works";
  if (s && seriesIds.has(s)) return s;
  return "folders";
}

function sortProjects(projects: DBProject[], mode: ProjectManageSortMode): DBProject[] {
  const list = [...projects];
  const ts = (p: DBProject) => {
    const n = Date.parse(p.created_at ?? "");
    return Number.isNaN(n) ? 0 : n;
  };
  switch (mode) {
    case "oldest":
      return list.sort((a, b) => ts(a) - ts(b));
    case "likes":
      return list.sort((a, b) => (b.likes ?? 0) - (a.likes ?? 0));
    case "views":
      return list.sort((a, b) => (b.views ?? 0) - (a.views ?? 0));
    case "newest":
    default:
      return list.sort((a, b) => ts(b) - ts(a));
  }
}

function sortSeries(list: ProjectSeries[], mode: ProjectManageSortMode): ProjectSeries[] {
  const next = [...list];
  const ts = (s: ProjectSeries) => {
    const n = Date.parse(s.updated_at ?? s.created_at ?? "");
    return Number.isNaN(n) ? 0 : n;
  };
  switch (mode) {
    case "oldest":
      return next.sort((a, b) => ts(a) - ts(b));
    case "newest":
    default:
      return next.sort((a, b) => ts(b) - ts(a));
  }
}

function projectStatusCounts(projects: DBProject[]): Record<SeriesStatusFilter, number> {
  const base: Record<SeriesStatusFilter, number> = {
    all: projects.length,
    Published: 0,
    Draft: 0,
    Private: 0,
  };
  for (const p of projects) {
    if (p.status === "Published" || p.status === "Draft" || p.status === "Private") {
      base[p.status] += 1;
    }
  }
  return base;
}

const SeriesListPage = () => {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { user, loading } = useAuth();
  const { data: series = [], isLoading, isError, refetch } = useMyProjectSeries(user?.id);
  const { data: projects = [], isLoading: projectsLoading } = useMyProjects(user?.id);
  const addToSeries = useAddProjectsToSeries();

  const seriesIds = useMemo(() => new Set(series.map((s) => s.id)), [series]);
  const selection = useMemo(
    () => parseSelection(params, seriesIds),
    [params, seriesIds],
  );
  const selectedSeriesId =
    selection !== "folders" && selection !== "works" ? selection : undefined;
  const { data: detailItems = [] } = useProjectSeriesItems(selectedSeriesId);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ProjectSeries | null>(null);
  const [addFor, setAddFor] = useState<ProjectSeries | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [statsProjectId, setStatsProjectId] = useState<string | null>(null);

  const projectIds = useMemo(() => projects.map((p) => p.id), [projects]);
  const projectsById = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects]);
  const { data: projectStatsMap = {} } = usePortfolioProjectStats(user?.id, projectIds);

  const manageProjects: Project[] = useMemo(
    () =>
      projects.map((p) => ({
        id: p.id,
        title: p.title,
        image: p.cover_url || (p.gallery_urls?.[0] ?? ""),
        gallery: p.gallery_urls ?? [],
        category: (normalizeProjectCategory(p.category) ?? DEFAULT_PROJECT_CATEGORY) as Category,
        owner: "You",
        ownerAvatar: "",
        likes: p.likes,
        views: p.views,
        comments: 0,
        bookmarked: false,
        status: p.status as ProjectStatus,
        publishedDate: p.created_at,
        tools: p.tools ?? [],
        price: p.price_thb ? `฿${p.price_thb.toLocaleString("th-TH")}` : undefined,
      })),
    [projects],
  );
  const statsProject = useMemo(
    () => (statsProjectId ? manageProjects.find((p) => p.id === statsProjectId) ?? null : null),
    [manageProjects, statsProjectId],
  );
  const statsProjectDb = statsProjectId ? projectsById.get(statsProjectId) : undefined;

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<SeriesStatusFilter>("all");
  const [visibilityFilter, setVisibilityFilter] = useState<SeriesVisibilityFilter>("all");
  const [sortMode, setSortMode] = useState<ProjectManageSortMode>(DEFAULT_PROJECT_MANAGE_SORT);
  const [density, setDensity] = useState<SeriesWorksDensity>(() =>
    typeof window === "undefined"
      ? "medium"
      : readSeriesDensity(SERIES_GRID_DENSITY_STORAGE_KEY),
  );

  useEffect(() => {
    writeSeriesDensity(SERIES_GRID_DENSITY_STORAGE_KEY, density);
  }, [density]);

  useEffect(() => {
    if (!loading && !user) navigate("/auth?redirect=/series");
  }, [loading, user, navigate]);

  useEffect(() => {
    if (isLoading) return;
    const s = params.get("s");
    if (!s || s === "works") return;
    if (!seriesIds.has(s)) {
      const next = new URLSearchParams(params);
      next.delete("s");
      setParams(next, { replace: true });
    }
  }, [isLoading, params, seriesIds, setParams]);

  const select = (next: SeriesSidebarSelection) => {
    const p = new URLSearchParams(params);
    if (next === "folders") p.delete("s");
    else if (next === "works") p.set("s", "works");
    else p.set("s", next);
    setParams(p, { replace: true });
    setMobileNavOpen(false);
  };

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const handleDropProject = async (seriesId: string, projectId: string) => {
    try {
      await addToSeries.mutateAsync({ seriesId, projectIds: [projectId] });
      toast.success("เพิ่มผลงานเข้าชุดแล้ว");
      if (selection !== seriesId) select(seriesId);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "เพิ่มเข้าชุดไม่สำเร็จ");
    }
  };

  const worksStatusCounts = useMemo(() => projectStatusCounts(projects), [projects]);
  const detailStatusCounts = useMemo(() => {
    const base: Record<SeriesStatusFilter, number> = {
      all: 0,
      Published: 0,
      Draft: 0,
      Private: 0,
    };
    for (const item of detailItems) {
      const p = item.project;
      if (!p) continue;
      base.all += 1;
      if (p.status === "Published" || p.status === "Draft" || p.status === "Private") {
        base[p.status] += 1;
      }
    }
    return base;
  }, [detailItems]);

  const folderVisibilityCounts = useMemo(() => {
    const base: Record<SeriesVisibilityFilter, number> = {
      all: series.length,
      public: 0,
      private: 0,
    };
    for (const s of series) {
      if (s.is_public) base.public += 1;
      else base.private += 1;
    }
    return base;
  }, [series]);

  const filteredWorks = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = projects;
    if (statusFilter !== "all") list = list.filter((p) => p.status === statusFilter);
    if (q) list = list.filter((p) => p.title.toLowerCase().includes(q));
    return sortProjects(list, sortMode);
  }, [projects, query, sortMode, statusFilter]);

  const filteredFolders = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = series;
    if (visibilityFilter === "public") list = list.filter((s) => s.is_public);
    if (visibilityFilter === "private") list = list.filter((s) => !s.is_public);
    if (q) {
      list = list.filter((s) => {
        const hay = `${s.title} ${s.client_label ?? ""} ${s.summary ?? ""}`.toLowerCase();
        return hay.includes(q);
      });
    }
    return sortSeries(list, sortMode);
  }, [query, series, sortMode, visibilityFilter]);

  const toolbarTitle =
    selection === "works"
      ? "งานทั้งหมด"
      : selection === "folders"
        ? "ชุดทั้งหมด"
        : "ผลงานในชุด";
  const toolbarSubtitle =
    selection === "works"
      ? "ลากการ์ดไปวางบนโฟลเดอร์ชุดทางซ้ายเพื่อเพิ่มเข้าชุด"
      : selection === "folders"
        ? "เลือกชุดเพื่อดูรายละเอียด หรือปรับขนาดการ์ดได้"
        : "ค้นหาและจัดเรียงผลงานภายในชุดนี้";
  const searchPlaceholder =
    selection === "folders" ? "ค้นหาชื่อชุด..." : "ค้นหาชื่องาน...";

  return (
    <div className="min-h-screen bg-app-ambient pb-24 lg:pb-8">
      <div className="bg-gradient-to-b from-primary/10 to-background">
        <div className="max-w-7xl mx-auto px-4 pt-6 pb-4">
          <div className="flex items-center justify-between gap-2 mb-4">
            <BackButton />
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="rounded-full lg:hidden"
                onClick={() => setMobileNavOpen(true)}
              >
                <PanelsTopLeft className="w-4 h-4 mr-1" /> ชุด
              </Button>
              <Button
                size="sm"
                onClick={openCreate}
                className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Plus className="w-4 h-4 mr-1" /> ชุดใหม่
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <FolderKanban className="w-6 h-6 text-primary shrink-0" />
            <h1 className="text-2xl font-medium text-foreground">ชุดผลงานของฉัน</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {selection === "works"
              ? "ดูผลงานทั้งหมด — ลากการ์ดไปวางที่โฟลเดอร์ชุดทางซ้ายได้"
              : "รวมหลายชิ้นของโปรเจกต์/ลูกค้าเดียวกัน — สร้างโฟลเดอร์ว่างก่อนก็ได้"}
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 pt-2">
        {isLoading ? (
          <InlineLoader />
        ) : isError ? (
          <div className="text-center py-16 glass-panel rounded-2xl space-y-3">
            <p className="text-foreground font-medium">โหลดชุดผลงานไม่สำเร็จ</p>
            <p className="text-sm text-muted-foreground">
              อาจยังไม่ได้รัน migration — ลองใหม่ หรือติดต่อทีม
            </p>
            <Button variant="outline" className="rounded-full" onClick={() => refetch()}>
              ลองใหม่
            </Button>
          </div>
        ) : (
          <div className="flex gap-4 lg:gap-5 items-start">
            <SeriesWorkspaceSidebar
              series={series}
              projects={projects}
              selection={selection}
              onSelect={select}
              onDropProject={handleDropProject}
              worksCount={projects.length}
              className="hidden lg:flex w-72 shrink-0 sticky top-4 h-[calc(100vh-5rem)] pr-1"
            />

            <main className="min-w-0 flex-1 space-y-4">
              {selection === "folders" ? (
                <SeriesWorkspaceToolbar
                  filterMode="folders"
                  title={toolbarTitle}
                  subtitle={toolbarSubtitle}
                  searchPlaceholder={searchPlaceholder}
                  query={query}
                  onQueryChange={setQuery}
                  density={density}
                  onDensityChange={setDensity}
                  sortMode={sortMode}
                  onSortChange={setSortMode}
                  visibilityFilter={visibilityFilter}
                  onVisibilityFilterChange={setVisibilityFilter}
                  visibilityCounts={folderVisibilityCounts}
                />
              ) : (
                <SeriesWorkspaceToolbar
                  filterMode="projects"
                  title={toolbarTitle}
                  subtitle={toolbarSubtitle}
                  searchPlaceholder={searchPlaceholder}
                  query={query}
                  onQueryChange={setQuery}
                  density={density}
                  onDensityChange={setDensity}
                  sortMode={sortMode}
                  onSortChange={setSortMode}
                  statusFilter={statusFilter}
                  onStatusFilterChange={setStatusFilter}
                  statusCounts={
                    selection === "works" ? worksStatusCounts : detailStatusCounts
                  }
                />
              )}

              <FeedModeTransition modeKey={selection}>
                {selection === "works" ? (
                  projectsLoading ? (
                    <InlineLoader />
                  ) : projects.length === 0 ? (
                    <SeriesAllWorksGrid
                      projects={[]}
                      density={density}
                      statsMap={projectStatsMap}
                      onShowStats={setStatsProjectId}
                    />
                  ) : filteredWorks.length === 0 ? (
                    <SeriesAllWorksEmptyFiltered />
                  ) : (
                    <SeriesAllWorksGrid
                      projects={filteredWorks}
                      density={density}
                      statsMap={projectStatsMap}
                      onShowStats={setStatsProjectId}
                    />
                  )
                ) : selection !== "folders" ? (
                  <SeriesWorkspaceDetail
                    seriesId={selection}
                    density={density}
                    query={query}
                    statusFilter={statusFilter}
                    sortMode={sortMode}
                    projectsById={projectsById}
                    statsMap={projectStatsMap}
                    onShowStats={setStatsProjectId}
                    onDeleted={() => select("folders")}
                    onEdit={(s) => {
                      setEditing(s);
                      setFormOpen(true);
                    }}
                    onAddProjects={(s) => setAddFor(s)}
                  />
                ) : series.length === 0 ? (
                  <div className="text-center py-16 glass-panel rounded-2xl">
                    <FolderKanban className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
                    <p className="text-foreground font-medium mb-1">ยังไม่มีชุดผลงาน</p>
                    <p className="text-sm text-muted-foreground mb-4 max-w-sm mx-auto">
                      สร้างชุดว่างไว้ก่อน แล้วค่อยลากผลงานจาก「งานทั้งหมด」มาใส่
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      <Button
                        onClick={openCreate}
                        className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
                      >
                        <Plus className="w-4 h-4 mr-1" /> สร้างชุดผลงาน
                      </Button>
                      <Button
                        variant="outline"
                        className="rounded-full"
                        onClick={() => select("works")}
                      >
                        ดูงานทั้งหมด
                      </Button>
                    </div>
                  </div>
                ) : filteredFolders.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border/70 bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
                    ไม่พบชุดตามตัวกรอง — ลองเปลี่ยนสถานะหรือคำค้นหา
                  </div>
                ) : (
                  <SeriesAnimatedGrid density={density} layoutGroupId="series-folders-layout">
                    {filteredFolders.map((s) => (
                      <SeriesCard
                        key={s.id}
                        series={s}
                        compact={density === "small"}
                        list={density === "list"}
                        onSelect={(item) => select(item.id)}
                      />
                    ))}
                  </SeriesAnimatedGrid>
                )}
              </FeedModeTransition>
            </main>
          </div>
        )}
      </div>

      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left" className="w-[min(100%,20rem)] p-0 border-border/60">
          <SheetHeader className="sr-only">
            <SheetTitle>รายการชุดผลงาน</SheetTitle>
          </SheetHeader>
          <SeriesWorkspaceSidebar
            series={series}
            projects={projects}
            selection={selection}
            onSelect={select}
            onDropProject={handleDropProject}
            worksCount={projects.length}
            className="h-full rounded-none border-0 border-r border-border/60"
          />
        </SheetContent>
      </Sheet>

      <SeriesFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditing(null);
        }}
        initial={editing}
        onCreated={(id) => select(id)}
      />

      {addFor && (
        <SeriesAddProjectsDialog
          open={!!addFor}
          onOpenChange={(open) => {
            if (!open) setAddFor(null);
          }}
          seriesId={addFor.id}
          seriesTitle={addFor.title}
        />
      )}

      <ProjectManageStatsDialog
        open={!!statsProjectId}
        onOpenChange={(open) => {
          if (!open) setStatsProjectId(null);
        }}
        project={statsProject}
        ownerId={user?.id}
        isPinned={!!statsProjectDb?.is_pinned}
        onView={
          statsProjectId
            ? () => {
                setStatsProjectId(null);
                navigate(`/project/${statsProjectId}`);
              }
            : undefined
        }
        onEdit={
          statsProjectId
            ? () => {
                setStatsProjectId(null);
                navigate(`/portfolio/${statsProjectId}/edit`);
              }
            : undefined
        }
      />
    </div>
  );
};

export default SeriesListPage;
