import BriefcaseIcon from "../components/icons/BriefcaseIcon";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Plus, LayoutGrid, Globe, Eye, Settings, ExternalLink, MessageSquare } from "lucide-react";
import { PlusOneMark } from "@/components/brand/PlusOneMark";
import type { LucideIcon } from "lucide-react";
import { BackButton } from "@/components/ui/BackButton";
import { Button } from "@/components/ui/button";
import StatsCard from "@/components/StatsCard";
import ManageProjectCard from "@/components/ManageProjectCard";
import { ManageCommunityPostCard } from "@/components/portfolio/ManageCommunityPostCard";
import SearchBar from "@/components/SearchBar";
import type { Project, ProjectStatus, Category } from "@/data/projectTypes";
import { DEFAULT_PROJECT_CATEGORY, normalizeProjectCategory } from "@/data/projectTypes";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useDeleteProject, useMyProjects, type DBProject } from "@/hooks/useProjects";
import { usePortfolioOrder } from "@/hooks/usePortfolioOrder";
import { useDeleteCommunityPost, useMyCommunityPostsManage } from "@/hooks/useCommunityPosts";
import SeoHead from "@/components/SeoHead";
import { sortPortfolioProjects } from "@/lib/portfolioSort";
import { SO1O_APP_URL } from "@/lib/productLinks";
import { isAplus1LaunchMinimal, isSoloEcosystemEnabled } from "@/lib/aplus1Launch";
import { openSoloExternal } from "@/lib/soloEcosystemGate";
import ProjectManageStatsDialog from "@/components/portfolio/ProjectManageStatsDialog";
import { DeleteConfirmDialog } from "@/components/ui/DeleteConfirmDialog";
import { postHeadline } from "@/lib/classifyCommunityPost";
import { usePortfolioProjectStats, EMPTY_PROJECT_STATS } from "@/hooks/usePortfolioProjectStats";
import {
  DEFAULT_PROJECT_MANAGE_SORT,
  sortManageProjects,
  type ProjectManageSortMode,
} from "@/lib/portfolioManageSort";
import ProjectManageSortSelect from "@/components/portfolio/ProjectManageSortSelect";
import PortfolioOverviewChart from "@/components/portfolio/PortfolioOverviewChart";

type PendingDelete =
  | { kind: "project"; id: string; title: string }
  | { kind: "post"; id: string; title: string }
  | null;

type ProjectTab = "ทั้งหมด" | "Published" | "Draft" | "Private";
type ManageTab = "projects" | "posts";
type PostTab = "ทั้งหมด" | "published" | "draft";

const PlusOneStatsIcon = (({ className }: { className?: string }) => (
  <PlusOneMark className={className} />
)) as LucideIcon;

const PortfolioManagePage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const communityManageEnabled = !isAplus1LaunchMinimal();
  const { data: dbProjects = [] } = useMyProjects(user?.id);
  const { data: myPosts = [] } = useMyCommunityPostsManage(
    communityManageEnabled ? user?.id : undefined,
  );
  const deleteProject = useDeleteProject();
  const deletePost = useDeleteCommunityPost();
  const { pin, unpin, reorder } = usePortfolioOrder(user?.id);

  const manageTab: ManageTab =
    communityManageEnabled && searchParams.get("tab") === "posts" ? "posts" : "projects";
  const setManageTab = (tab: ManageTab) => {
    const next = new URLSearchParams(searchParams);
    if (tab === "projects") next.delete("tab");
    else next.set("tab", tab);
    setSearchParams(next, { replace: true });
  };

  const [projectSearch, setProjectSearch] = useState("");
  const [projectTab, setProjectTab] = useState<ProjectTab>("ทั้งหมด");
  const [pendingDelete, setPendingDelete] = useState<PendingDelete>(null);
  const [postSearch, setPostSearch] = useState("");
  const [postTab, setPostTab] = useState<PostTab>("ทั้งหมด");
  const [statsProjectId, setStatsProjectId] = useState<string | null>(null);
  const [projectSort, setProjectSort] = useState<ProjectManageSortMode>(DEFAULT_PROJECT_MANAGE_SORT);

  const projectIds = useMemo(() => dbProjects.map((p) => p.id), [dbProjects]);
  const { data: projectStatsMap = {} } = usePortfolioProjectStats(user?.id, projectIds);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth?redirect=/portfolio");
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!communityManageEnabled && searchParams.get("tab") === "posts") {
      const next = new URLSearchParams(searchParams);
      next.delete("tab");
      setSearchParams(next, { replace: true });
    }
  }, [communityManageEnabled, searchParams, setSearchParams]);

  const myProjects: Project[] = useMemo(() => {
    const mapped: Project[] = dbProjects.map((p) => ({
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
    return mapped;
  }, [dbProjects]);

  const totalViews = myProjects.reduce((s, p) => s + p.views, 0);
  const totalLikes = myProjects.reduce((s, p) => s + p.likes, 0);
  const publishedCount = myProjects.filter((p) => p.status === "Published").length;
  const publishedPostCount = myPosts.filter((p) => p.status === "published").length;
  const draftPostCount = myPosts.filter((p) => p.status === "draft").length;
  const totalPostViews = myPosts.reduce((s, p) => s + (p.view_count ?? 0), 0);
  const totalPostLikes = myPosts.reduce((s, p) => s + (p.like_count ?? 0), 0);

  const orderedDbProjects = useMemo(
    () => sortPortfolioProjects(dbProjects),
    [dbProjects],
  );

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

  const projectTabs: ProjectTab[] = ["ทั้งหมด", "Published", "Draft", "Private"];
  const postTabs: PostTab[] = ["ทั้งหมด", "published", "draft"];

  const filteredPosts = useMemo(() => {
    const q = postSearch.trim().toLowerCase();
    return myPosts.filter((p) => {
      const matchTab =
        postTab === "ทั้งหมด" ||
        (postTab === "published" && p.status === "published") ||
        (postTab === "draft" && p.status === "draft");
      if (!matchTab) return false;
      if (!q) return true;
      const hay = `${p.title ?? ""} ${p.body ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [myPosts, postTab, postSearch]);

  const handleDeletePost = (id: string) => {
    const post = myPosts.find((p) => p.id === id);
    setPendingDelete({
      kind: "post",
      id,
      title: post ? postHeadline(post.title, post.body) : "โพสต์นี้",
    });
  };

  const handleConfirmDelete = () => {
    if (!pendingDelete) return;
    if (pendingDelete.kind === "project") {
      deleteProject.mutate(pendingDelete.id, {
        onSuccess: () => {
          toast.success("ลบผลงานแล้ว");
          setPendingDelete(null);
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : "ลบไม่สำเร็จ"),
      });
      return;
    }
    deletePost.mutate(pendingDelete.id, {
      onSuccess: () => {
        toast.success("ลบโพสต์แล้ว");
        setPendingDelete(null);
      },
      onError: (e) => toast.error(e instanceof Error ? e.message : "ลบไม่สำเร็จ"),
    });
  };

  return (
    <div className="min-h-screen bg-app-ambient">
      <SeoHead title="แดชบอร์ด & จัดการผลงาน" path="/portfolio/manage" noindex />
      <div className="bg-gradient-to-b from-primary/10 to-background">
        <div className="max-w-5xl mx-auto px-4 pt-6 pb-4">
          <BackButton to="/portfolio" label="กลับโปรไฟล์" className="mb-4" />
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <BriefcaseIcon className="w-6 h-6 text-primary" />
              <h1 className="text-2xl font-medium text-foreground">แดชบอร์ด & จัดการ</h1>
            </div>
            <div className="flex items-center gap-2">
              {isSoloEcosystemEnabled() && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openSoloExternal(SO1O_APP_URL)}
                  className="rounded-full border-primary/30 text-primary hover:bg-primary/10 hover:text-primary"
                >
                  <ExternalLink className="w-4 h-4 sm:mr-1" />
                  <span className="hidden sm:inline">Solo Freelancer</span>
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => navigate("/settings")} className="rounded-full">
                <Settings className="w-4 h-4 sm:mr-1" />
                <span className="hidden sm:inline">ตั้งค่า</span>
              </Button>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {manageTab === "posts"
              ? "จัดการโพสต์ชุมชน — แก้ไข แบบร่าง และลบโพสต์ของคุณ"
              : "ดูการเติบโต จัดลำดับผลงาน และแก้ไขเนื้อหา — คำขอจ้างงานและ Collab อยู่ที่หน้าโปรไฟล์"}
          </p>
          {communityManageEnabled && (
            <div className="flex gap-2 mt-4 overflow-x-auto pb-1 scrollbar-hide">
              <button
                type="button"
                onClick={() => setManageTab("projects")}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  manageTab === "projects"
                    ? "bg-primary text-primary-foreground"
                    : "bg-card text-secondary-foreground border border-border hover:bg-secondary"
                }`}
              >
                ผลงาน ({myProjects.length})
              </button>
              <button
                type="button"
                onClick={() => setManageTab("posts")}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  manageTab === "posts"
                    ? "bg-primary text-primary-foreground"
                    : "bg-card text-secondary-foreground border border-border hover:bg-secondary"
                }`}
              >
                โพสต์ Area ({myPosts.length})
              </button>
            </div>
          )}
          {manageTab === "projects" ? (
            <Button
              className="mt-4 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl h-11 px-6"
              onClick={() => navigate("/portfolio/new")}
            >
              <Plus className="w-4 h-4 mr-2" /> เพิ่มผลงาน
            </Button>
          ) : (
            <Button
              className="mt-4 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl h-11 px-6"
              onClick={() => navigate("/community/new")}
            >
              <Plus className="w-4 h-4 mr-2" /> สร้างโพสต์ Area
            </Button>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 space-y-6 pb-8">

        {manageTab === "projects" || !communityManageEnabled ? (
          <>
        {user ? <PortfolioOverviewChart ownerId={user.id} projectIds={projectIds} /> : null}

        <div className="grid grid-cols-2 gap-3">
          <StatsCard label="ทั้งหมด" value={myProjects.length} icon={LayoutGrid} />
          <StatsCard label="เผยแพร่" value={publishedCount} icon={Globe} accent />
          <StatsCard label="ยอดเข้าชม" value={totalViews} icon={Eye} />
          <StatsCard label="+1" value={totalLikes} icon={PlusOneStatsIcon} accent />
        </div>

        <div className="space-y-3">
          <SearchBar placeholder="ค้นหาผลงาน..." value={projectSearch} onChange={setProjectSearch} />
          <div className="flex items-center justify-between gap-3">
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide min-w-0 flex-1">
              {projectTabs.map((tab) => (
                <button key={tab} onClick={() => setProjectTab(tab)}
                  className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                    projectTab === tab ? "bg-primary text-primary-foreground" : "bg-card text-secondary-foreground border border-border hover:bg-secondary"
                  }`}>
                  {tab}
                </button>
              ))}
            </div>
            <ProjectManageSortSelect value={projectSort} onChange={setProjectSort} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProjects.map((p) => {
              const isDb = dbProjects.some((d) => d.id === p.id);
              const db = dbById.get(p.id) as DBProject | undefined;
              const listIdx = orderedDbProjects.findIndex((d) => d.id === p.id);
              return (
                <ManageProjectCard
                  key={p.id}
                  project={p}
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
                    setPendingDelete({ kind: "project", id, title: p.title });
                  }}
                />
              );
            })}
            {filteredProjects.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6 col-span-full">ไม่พบผลงาน</p>
            )}
          </div>
        </div>
          </>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <StatsCard label="ทั้งหมด" value={myPosts.length} icon={MessageSquare} />
              <StatsCard label="เผยแพร่" value={publishedPostCount} icon={Globe} accent />
              <StatsCard label="ยอดเข้าชม" value={totalPostViews} icon={Eye} />
              <StatsCard label="+1" value={totalPostLikes} icon={PlusOneStatsIcon} accent />
            </div>

            <div className="space-y-3">
              <SearchBar placeholder="ค้นหาโพสต์..." value={postSearch} onChange={setPostSearch} />
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                {postTabs.map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setPostTab(tab)}
                    className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                      postTab === tab
                        ? "bg-primary text-primary-foreground"
                        : "bg-card text-secondary-foreground border border-border hover:bg-secondary"
                    }`}
                  >
                    {tab === "ทั้งหมด"
                      ? `ทั้งหมด (${myPosts.length})`
                      : tab === "published"
                        ? `เผยแพร่ (${publishedPostCount})`
                        : `แบบร่าง (${draftPostCount})`}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredPosts.map((post) => (
                  <ManageCommunityPostCard
                    key={post.id}
                    post={post}
                    onDelete={handleDeletePost}
                    deleting={deletePost.isPending}
                  />
                ))}
                {filteredPosts.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-6 col-span-full">ไม่พบโพสต์</p>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      <DeleteConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
        title={pendingDelete?.kind === "project" ? "ลบผลงานนี้?" : "ลบโพสต์นี้?"}
        description={
          pendingDelete ? (
            <>
              「{pendingDelete.title}」จะถูกลบถาวรและไม่สามารถกู้คืนได้ ต้องการลบจริงหรือไม่?
            </>
          ) : (
            ""
          )
        }
        onConfirm={handleConfirmDelete}
        loading={deleteProject.isPending || deletePost.isPending}
      />

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

export default PortfolioManagePage;
