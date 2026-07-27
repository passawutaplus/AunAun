import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Plus, LayoutGrid, Globe, Eye } from "lucide-react";
import { PlusOneMark } from "@/components/brand/PlusOneMark";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import StatsCard from "@/components/StatsCard";
import ManageProjectCard from "@/components/ManageProjectCard";
import SearchBar from "@/components/SearchBar";
import type { Project, ProjectStatus, Category } from "@/data/projectTypes";
import { DEFAULT_PROJECT_CATEGORY, normalizeProjectCategory } from "@/data/projectTypes";
import { toast } from "sonner";
import { useDeleteProject, useMyProjects, type DBProject } from "@/hooks/useProjects";
import { usePortfolioOrder } from "@/hooks/usePortfolioOrder";
import { sortPortfolioProjects } from "@/lib/portfolioSort";
import ProjectManageStatsDialog from "@/components/portfolio/ProjectManageStatsDialog";
import { DeleteConfirmDialog } from "@/components/ui/DeleteConfirmDialog";
import { usePortfolioProjectStats, EMPTY_PROJECT_STATS } from "@/hooks/usePortfolioProjectStats";
import {
  DEFAULT_PROJECT_MANAGE_SORT,
  sortManageProjects,
  type ProjectManageSortMode,
} from "@/lib/portfolioManageSort";
import ProjectManageSortSelect from "@/components/portfolio/ProjectManageSortSelect";
import ProjectManageGridSelect, {
  PROJECT_MANAGE_GRID_CLASS,
  useProjectManageGridMode,
} from "@/components/portfolio/ProjectManageGridSelect";
import PortfolioOverviewChart from "@/components/portfolio/PortfolioOverviewChart";
import { DesignDrillSection } from "@/components/drill/DesignDrillSection";
import { isLaunchDesignDrillEnabled } from "@/lib/aplus1Launch";
import { PORTFOLIO_DRILL_HASH } from "@/lib/drillProject";
import { smoothEase, staggerReveal } from "@/lib/motion";
import { cn } from "@/lib/utils";

type ProjectTab = "ทั้งหมด" | "Published" | "Draft" | "Private";

const PlusOneStatsIcon = (({ className }: { className?: string }) => (
  <PlusOneMark className={className} />
)) as LucideIcon;

type Props = {
  userId: string;
  /** Show Design Drill block above overview (owner profile). */
  showDesignDrill?: boolean;
};

/** Works manage UI: overview, stats, catalog strip, editable project grid. */
export default function PortfolioWorksManagePanel({ userId, showDesignDrill }: Props) {
  const navigate = useNavigate();
  const reducedMotion = useReducedMotion();
  const designDrillEnabled = showDesignDrill && isLaunchDesignDrillEnabled();
  const { data: dbProjects = [] } = useMyProjects(userId);
  const deleteProject = useDeleteProject();
  const { pin, unpin, reorder } = usePortfolioOrder(userId);

  const [projectSearch, setProjectSearch] = useState("");
  const [projectTab, setProjectTab] = useState<ProjectTab>("ทั้งหมด");
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [statsProjectId, setStatsProjectId] = useState<string | null>(null);
  const [projectSort, setProjectSort] = useState<ProjectManageSortMode>(DEFAULT_PROJECT_MANAGE_SORT);
  const [projectGrid, setProjectGrid] = useProjectManageGridMode();

  const projectIds = useMemo(() => dbProjects.map((p) => p.id), [dbProjects]);
  const { data: projectStatsMap = {} } = usePortfolioProjectStats(userId, projectIds);

  const myProjects: Project[] = useMemo(() => {
    return dbProjects.map((p) => ({
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
    }));
  }, [dbProjects]);

  const totalViews = myProjects.reduce((s, p) => s + p.views, 0);
  const totalLikes = myProjects.reduce((s, p) => s + p.likes, 0);
  const publishedCount = myProjects.filter((p) => p.status === "Published").length;

  const orderedDbProjects = useMemo(() => sortPortfolioProjects(dbProjects), [dbProjects]);

  const filteredProjects = useMemo(() => {
    const filtered = myProjects.filter((p) => {
      const matchTab = projectTab === "ทั้งหมด" || p.status === projectTab;
      const matchSearch =
        !projectSearch || p.title.toLowerCase().includes(projectSearch.toLowerCase());
      return matchTab && matchSearch;
    });
    return sortManageProjects(filtered, projectSort, projectStatsMap);
  }, [myProjects, projectTab, projectSearch, projectSort, projectStatsMap]);

  const orderBusy = pin.isPending || unpin.isPending || reorder.isPending;

  const moveProject = (id: string, direction: -1 | 1) => {
    const ids = orderedDbProjects.map((p) => p.id);
    const idx = ids.indexOf(id);
    const swap = idx + direction;
    if (idx < 0 || swap < 0 || swap >= ids.length) return;
    [ids[idx], ids[swap]] = [ids[swap], ids[idx]];
    reorder.mutate(ids, {
      onSuccess: () => toast.success("จัดลำดับผลงานแล้ว"),
      onError: (e) => toast.error(e instanceof Error ? e.message : "จัดลำดับไม่สำเร็จ"),
    });
  };

  const dbById = useMemo(() => new Map(dbProjects.map((p) => [p.id, p])), [dbProjects]);
  const statsProject = useMemo(
    () => (statsProjectId ? myProjects.find((p) => p.id === statsProjectId) ?? null : null),
    [statsProjectId, myProjects],
  );
  const statsProjectDb = statsProjectId ? dbById.get(statsProjectId) : undefined;
  const pendingTitle = pendingDeleteId
    ? myProjects.find((p) => p.id === pendingDeleteId)?.title ?? "ผลงานนี้"
    : "";

  const projectTabs: ProjectTab[] = ["ทั้งหมด", "Published", "Draft", "Private"];

  return (
    <div className="space-y-6">
      {designDrillEnabled ? (
        <section id={PORTFOLIO_DRILL_HASH} className="rounded-3xl glass-panel p-5 md:p-6 scroll-mt-24">
          <h2 className="mb-4 text-sm font-semibold text-foreground">Design Drill</h2>
          <DesignDrillSection />
        </section>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button
          className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl h-11 px-6"
          onClick={() => navigate("/portfolio/new")}
        >
          <Plus className="w-4 h-4 mr-2" /> เพิ่มผลงาน
        </Button>
      </div>

      <PortfolioOverviewChart ownerId={userId} projectIds={projectIds} />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatsCard label="ทั้งหมด" value={myProjects.length} icon={LayoutGrid} />
        <StatsCard label="เผยแพร่" value={publishedCount} icon={Globe} accent />
        <StatsCard label="ยอดเข้าชม" value={totalViews} icon={Eye} />
        <StatsCard label="ถูกใจ" value={totalLikes} icon={PlusOneStatsIcon} accent />
      </div>

      <div className="space-y-3">
        <h2 className="text-base font-semibold text-foreground">ผลงานทั้งหมด</h2>
        <SearchBar placeholder="ค้นหาผลงาน..." value={projectSearch} onChange={setProjectSearch} />
        <div className="flex items-center justify-between gap-3">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide min-w-0 flex-1">
            {projectTabs.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setProjectTab(tab)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  projectTab === tab
                    ? "bg-primary text-primary-foreground"
                    : "bg-card text-secondary-foreground border border-border hover:bg-secondary"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <ProjectManageSortSelect value={projectSort} onChange={setProjectSort} />
            <ProjectManageGridSelect value={projectGrid} onChange={setProjectGrid} />
          </div>
        </div>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={projectGrid}
            className={cn(PROJECT_MANAGE_GRID_CLASS[projectGrid])}
            initial={reducedMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reducedMotion ? undefined : { opacity: 0, y: -8 }}
            transition={{ duration: 0.22, ease: smoothEase }}
          >
            {filteredProjects.map((p, index) => {
              const isDb = dbProjects.some((d) => d.id === p.id);
              const db = dbById.get(p.id) as DBProject | undefined;
              const listIdx = orderedDbProjects.findIndex((d) => d.id === p.id);
              return (
                <motion.div
                  key={p.id}
                  layout={!reducedMotion}
                  initial={reducedMotion ? false : { opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={
                    reducedMotion
                      ? { duration: 0 }
                      : staggerReveal(index, {
                          dense: projectGrid === "cols2" || projectGrid === "cols5" || projectGrid === "list",
                        })
                  }
                >
                  <ManageProjectCard
                    project={p}
                    compact={projectGrid === "cols2" || projectGrid === "cols5"}
                    layout={projectGrid === "list" ? "list" : "card"}
                    editable={isDb}
                    isPinned={!!db?.is_pinned}
                    stats={projectStatsMap[p.id] ?? EMPTY_PROJECT_STATS}
                    onShowStats={
                      p.status === "Published" ? () => setStatsProjectId(p.id) : undefined
                    }
                    canMoveUp={listIdx > 0}
                    canMoveDown={listIdx >= 0 && listIdx < orderedDbProjects.length - 1}
                    orderBusy={orderBusy}
                    onPin={
                      isDb
                        ? () =>
                            pin.mutate(
                              { id: p.id, projects: dbProjects },
                              {
                                onSuccess: () => toast.success("ปักหมุดผลงานแล้ว"),
                                onError: (e) =>
                                  toast.error(e instanceof Error ? e.message : "ปักหมุดไม่สำเร็จ"),
                              },
                            )
                        : undefined
                    }
                    onUnpin={
                      isDb
                        ? () =>
                            unpin.mutate(p.id, {
                              onSuccess: () => toast.success("ยกเลิกปักหมุดแล้ว"),
                              onError: (e) =>
                                toast.error(e instanceof Error ? e.message : "ดำเนินการไม่สำเร็จ"),
                            })
                        : undefined
                    }
                    onMoveUp={isDb ? () => moveProject(p.id, -1) : undefined}
                    onMoveDown={isDb ? () => moveProject(p.id, 1) : undefined}
                    onDelete={(id) => {
                      if (!isDb) {
                        toast.info("ลบได้เฉพาะผลงานที่บันทึกในระบบ");
                        return;
                      }
                      setPendingDeleteId(id);
                    }}
                  />
                </motion.div>
              );
            })}
            {filteredProjects.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6 col-span-full">ไม่พบผลงาน</p>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <DeleteConfirmDialog
        open={pendingDeleteId !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteId(null);
        }}
        title="ลบผลงานนี้?"
        description={
          pendingDeleteId ? (
            <>「{pendingTitle}」จะถูกลบถาวรและไม่สามารถกู้คืนได้ ต้องการลบจริงหรือไม่?</>
          ) : (
            ""
          )
        }
        onConfirm={() => {
          if (!pendingDeleteId) return;
          deleteProject.mutate(pendingDeleteId, {
            onSuccess: () => {
              toast.success("ลบผลงานแล้ว");
              setPendingDeleteId(null);
            },
            onError: (e) => toast.error(e instanceof Error ? e.message : "ลบไม่สำเร็จ"),
          });
        }}
        loading={deleteProject.isPending}
      />

      <ProjectManageStatsDialog
        open={!!statsProjectId}
        onOpenChange={(open) => {
          if (!open) setStatsProjectId(null);
        }}
        project={statsProject}
        ownerId={userId}
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
}
