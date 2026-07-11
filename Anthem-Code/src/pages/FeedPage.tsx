import { useState, useMemo, useEffect } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { LogIn, SearchX } from "lucide-react";
import EmptyState from "@/components/ui/EmptyState";
import PageLoader from "@/components/ui/PageLoader";
import { useProfilesByIds } from "@/core/profiles";


import Footer from "@/components/Footer";
import FeedHero from "@/components/feed/FeedHero";
import FeedToolbar from "@/components/feed/FeedToolbar";
import SeoHead from "@/components/SeoHead";
import { shouldNoindexSearchParams } from "@/lib/seo";
import DrillFeedPanel from "@/components/drill/DrillFeedPanel";
import ProjectCard from "@/components/ProjectCard";
import AdCard from "@/components/feed/AdCard";
import { useActiveAds } from "@/hooks/useAds";
import { useActiveBoosts, buildBoostedIdSet, buildBoostTargetMaps } from "@/hooks/useBoost";
import { sortByBoostedIds } from "@/lib/boostFeedSort";
import { interleaveAds } from "@/lib/interleaveAds";
import HireDialog from "@/components/HireDialog";
import CollabDialog from "@/components/CollabDialog";
import { FeedProjectGrid } from "@/components/feed/FeedProjectGrid";
import { FeedModeTransition } from "@/components/feed/FeedModeTransition";
import { type FeedMode } from "@/components/feed/FeedModeToggle";
import DesignerGrid from "@/components/feed/DesignerGrid";
import { type DesignerSort } from "@/components/feed/DesignerToolbar";
import type { DesignerFeedSource } from "@/components/feed/DesignerFeedDropdown";
import StudioGrid from "@/components/feed/StudioGrid";
import type { StudioFeedSource } from "@/components/studio/StudioFilterPanel";
import { useDesigners } from "@/hooks/useDesigners";

import { categories as allCategories, categoryMatchesFilter, DEFAULT_PROJECT_CATEGORY, normalizeProjectCategory, type Category, type Project, type ProjectCategory, type ProjectStatus, type SpecialFilter } from "@/data/projectTypes";
import { isCategoryAllowed } from "@/lib/cookieConsent";
import {
  usePublishedProjects,
  useTopProjects,
  useFollowingProjects,
  useForYouProjects,
  type DBProject,
} from "@/hooks/useProjects";
import { useAuth } from "@/hooks/useAuth";
import { navigateToAuth, stashPendingHire, consumePendingHire } from "@/lib/authRedirect";
import { useAuthDialog } from "@/stores/authDialogStore";
import CommunityFeedPanel from "@/components/community/CommunityFeedPanel";
import CommunityFeedSidebar, {
  CommunityFeedMobileDiscovery,
} from "@/components/community/CommunityFeedSidebar";
import { COMMUNITY_NEW_PATH } from "@/data/createActions";
import { useCommunityFeedFilter } from "@/hooks/useCommunityFeedFilter";
import { cn } from "@/lib/utils";
import { sortToolsVisualFirst } from "@/lib/toolIcons";
import { recordFeedSearch } from "@/lib/feedSearchSignals";
import { trackProductEvent } from "@/lib/productEvents";

import { MOBILE_PAGE_BOTTOM_CLASS } from "@/lib/mobileLayout";
import { DESIGN_DRILL_CHIP, type ProjectChipFilter } from "@/lib/drillProject";
import { markOnboardingVisit, type OnboardingVisitId } from "@/lib/onboardingStorage";
import { coerceLaunchFeedMode, isAplus1LaunchMinimal, isLaunchDesignDrillEnabled } from "@/lib/aplus1Launch";

type FeedMode2 = "Explore" | SpecialFilter;
const requiresAuth = (m: FeedMode2) => m === "Following";

const CATEGORY_CHIPS: Category[] = allCategories.filter((c) => c !== "Explore");
const PROJECT_CHIP_FILTERS: ProjectChipFilter[] = [DESIGN_DRILL_CHIP, "All", ...CATEGORY_CHIPS];

const FEED_MODE_VISIT: Partial<Record<FeedMode, OnboardingVisitId>> = {
  projects: "explore_feed",
  community: "explore_community",
  designers: "explore_designers",
  studios: "explore_studios",
};

const FeedPage = (_props: { onMyPortClick: () => void }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [feedMode, setFeedModeRaw] = useState<FeedMode2>("Explore");
  const [category, setCategory] = useState<ProjectChipFilter>("All");
  const [mode, setMode] = useState<FeedMode>(() => {
    if (typeof window === "undefined") return "projects";
    if (!isCategoryAllowed("functional")) return "projects";
    const urlMode = new URLSearchParams(window.location.search).get("mode");
    if (urlMode === "designers" || urlMode === "studios" || urlMode === "projects" || urlMode === "community") {
      return coerceLaunchFeedMode(urlMode);
    }
    const stored = localStorage.getItem("feed-mode") as FeedMode | null;
    return stored ? coerceLaunchFeedMode(stored) : "projects";
  });
  const [hireOpen, setHireOpen] = useState(false);
  const [hireProject, setHireProject] = useState("");
  const [hireProjectId, setHireProjectId] = useState<string | undefined>();
  const [hireProjectCover, setHireProjectCover] = useState<string | undefined>();
  const [hireFreelancerId, setHireFreelancerId] = useState<string | undefined>();
  const [collabOpen, setCollabOpen] = useState(false);
  const [collabTarget, setCollabTarget] = useState<{
    recipientId?: string;
    recipientName: string;
    projectId?: string;
    projectTitle?: string;
    projectCoverUrl?: string;
  }>({ recipientName: "" });
  const [designerSort, setDesignerSort] = useState<DesignerSort>("newest");
  const [designerFeedSource, setDesignerFeedSource] = useState<DesignerFeedSource>("all");
  const [designerCategory, setDesignerCategory] = useState<Category | "All">("All");
  const [designerTools, setDesignerTools] = useState<string[]>([]);
  const [studioFeedSource, setStudioFeedSource] = useState<StudioFeedSource>("all");
  const { filter: communityFilter, setFilter: setCommunityFilter, clearTag } = useCommunityFeedFilter();

  const openNewPortfolio = () => {
    if (!user) {
      useAuthDialog.getState().openSignup("/portfolio/new");
      return;
    }
    navigate("/portfolio/new");
  };

  const openNewCommunityPost = () => {
    if (!user) {
      useAuthDialog.getState().openSignup(COMMUNITY_NEW_PATH);
      return;
    }
    navigate(COMMUNITY_NEW_PATH);
  };

  const { data: designersAll = [] } = useDesigners();
  const designerToolOptions = useMemo(() => {
    const set = new Set<string>();
    designersAll.forEach((d) => d.projects.forEach((p) => (p.tools ?? []).forEach((t) => t && set.add(t))));
    return sortToolsVisualFirst(Array.from(set));
  }, [designersAll]);
  const designerCatOptions = useMemo(() => {
    const set = new Set<string>();
    designersAll.forEach((d) => d.projects.forEach((p) => p.category && set.add(p.category)));
    return Array.from(set).sort();
  }, [designersAll]);
  const designerCategoryChips = useMemo((): (Category | "All")[] => {
    const fromData = designerCatOptions.filter((c): c is Category =>
      allCategories.includes(c as Category),
    );
    if (fromData.length > 0) return ["All", ...fromData];
    return ["All", ...allCategories.filter((c) => c !== "Explore")];
  }, [designerCatOptions]);

  const toggle = (list: string[], v: string) =>
    list.includes(v) ? list.filter((x) => x !== v) : [...list, v];

  const trackFeedModeVisit = (m: FeedMode) => {
    const visitId = FEED_MODE_VISIT[m];
    if (user?.id && visitId) void markOnboardingVisit(user.id, visitId);
  };

  const changeMode = (m: FeedMode) => {
    const next = coerceLaunchFeedMode(m);
    setMode(next);
    trackFeedModeVisit(next);
    if (next === "projects") setCategory("All");
    if (isCategoryAllowed("functional")) localStorage.setItem("feed-mode", next);
    const params = new URLSearchParams(searchParams);
    params.delete("drill");
    if (next === "projects") params.delete("mode");
    else params.set("mode", next);
    const q = params.toString();
    navigate(q ? `/?${q}` : "/", { replace: true });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const openDrill = () => {
    if (!isLaunchDesignDrillEnabled()) return;
    setMode("projects");
    setCategory(DESIGN_DRILL_CHIP);
    if (isCategoryAllowed("functional")) localStorage.setItem("feed-mode", "projects");
    navigate("/?drill=1", { replace: true });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  useEffect(() => {
    const view = searchParams.get("mode");
    const feed = searchParams.get("feed");
    const tag = searchParams.get("tag");
    if (tag && !isAplus1LaunchMinimal()) {
      setMode("community");
      if (isCategoryAllowed("functional")) localStorage.setItem("feed-mode", "community");
    } else if (view === "designers" || view === "studios" || view === "projects" || view === "community") {
      const coerced = coerceLaunchFeedMode(view);
      setMode(coerced);
      if (isCategoryAllowed("functional")) localStorage.setItem("feed-mode", coerced);
      if (isAplus1LaunchMinimal() && view !== coerced) {
        const params = new URLSearchParams(searchParams);
        if (coerced === "projects") params.delete("mode");
        else params.set("mode", coerced);
        const q = params.toString();
        navigate(q ? `/?${q}` : "/", { replace: true });
      }
    } else if (isLaunchDesignDrillEnabled() && (feed === "drill" || searchParams.get("drill") === "1")) {
      setMode("projects");
      setCategory(DESIGN_DRILL_CHIP);
      if (isCategoryAllowed("functional")) localStorage.setItem("feed-mode", "projects");
    } else if (feed === "drill" || searchParams.get("drill") === "1") {
      setMode("projects");
      setCategory("All");
      const params = new URLSearchParams(searchParams);
      params.delete("drill");
      if (feed === "drill") params.delete("feed");
      const q = params.toString();
      navigate(q ? `/?${q}` : "/", { replace: true });
    } else if (!searchParams.toString()) {
      setMode("projects");
      setCategory("All");
    }
  }, [searchParams]);

  useEffect(() => {
    trackFeedModeVisit(mode);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- track when URL restores feed tab
  }, [mode, user?.id]);

  useEffect(() => {
    if (!user) return;
    const pending = consumePendingHire();
    if (!pending) return;
    setHireFreelancerId(pending.freelancerId);
    setHireProject(pending.projectTitle);
    setHireOpen(true);
  }, [user]);

  useEffect(() => {
    const resetAt = (location.state as { feedHomeReset?: number } | null)?.feedHomeReset;
    if (!resetAt) return;
    setMode("projects");
    setCategory("All");
    setSearch("");
    setFeedModeRaw("Explore");
    setDesignerSort("newest");
    setDesignerCategory("All");
    setDesignerTools([]);
    setStudioFeedSource("all");
    if (isCategoryAllowed("functional")) localStorage.setItem("feed-mode", "projects");
    window.scrollTo({ top: 0, behavior: "smooth" });
    navigate("/", { replace: true, state: null });
  }, [location.state, navigate]);

  const setFeedMode = (m: FeedMode2) => {
    if (m === "Collections") {
      if (isAplus1LaunchMinimal()) return;
      if (user) navigate("/collections");
      else useAuthDialog.getState().openSignup();
      return;
    }
    setFeedModeRaw(m);
  };

  const published = usePublishedProjects();
  const top = useTopProjects();
  const following = useFollowingProjects(feedMode === "Following" ? user?.id : undefined);
  const explorePersonalized = useForYouProjects(feedMode === "Explore" && user ? user.id : undefined);

  useEffect(() => {
    if (!user?.id || !search.trim() || feedMode !== "Explore") return;
    const t = window.setTimeout(() => {
      recordFeedSearch(user.id, search);
      void trackProductEvent("feed_search", { q: search.trim().slice(0, 120) }, { debounceMs: 1_500 });
      void queryClient.invalidateQueries({ queryKey: ["for-you-projects", user.id] });
    }, 800);
    return () => window.clearTimeout(t);
  }, [search, user?.id, feedMode, queryClient]);

  const projectsLoading =
    feedMode === "Top 1"
      ? top.isLoading
      : feedMode === "Following"
        ? following.isLoading
        : feedMode === "Explore" && user
          ? explorePersonalized.isLoading
          : published.isLoading;

  const sourceData: DBProject[] = useMemo(() => {
    switch (feedMode) {
      case "Top 1":      return (top.data ?? []) as DBProject[];
      case "Following":  return (following.data ?? []) as DBProject[];
      case "Newest":     return (published.data ?? []) as DBProject[];
      case "Explore":
        return user
          ? ((explorePersonalized.data ?? []) as DBProject[])
          : ((published.data ?? []) as DBProject[]);
      default:           return (published.data ?? []) as DBProject[];
    }
  }, [feedMode, published.data, top.data, following.data, explorePersonalized.data, user]);

  const ownerIds = useMemo(
    () => Array.from(new Set(sourceData.map((p) => p.owner_id).filter(Boolean))),
    [sourceData]
  );

  const { data: ownersData } = useProfilesByIds(ownerIds);
  const ownersMap = useMemo(() => {
    const map: Record<string, { name: string; avatar: string }> = {};
    (ownersData?.list ?? []).forEach((p) => {
      const profileUserId = (p as { user_id?: string }).user_id ?? p.id;
      map[profileUserId] = {
        name: p.display_name || p.username || "ฟรีแลนซ์",
        avatar: p.avatar_url || "",
      };
    });
    return map;
  }, [ownersData]);

  const projects: Project[] = useMemo(() => {
    const mapped: Project[] = sourceData.map((p) => {
      const o = ownersMap[p.owner_id];
      return {
        id: p.id,
        title: p.title,
        image: p.cover_url || (p.gallery_urls?.[0] ?? ""),
        gallery: p.gallery_urls ?? [],
        category: (normalizeProjectCategory(p.category) ?? DEFAULT_PROJECT_CATEGORY) as Category,
        owner: o?.name ?? "ฟรีแลนซ์",
        ownerId: p.owner_id,
        ownerAvatar: o?.avatar ?? "",
        likes: p.likes,
        views: p.views,
        comments: 0,
        bookmarked: false,
        status: p.status as ProjectStatus,
        publishedDate: p.created_at,
        tools: p.tools ?? [],
        tags: p.tags ?? [],
        allowHire: (p as any).allow_hire ?? true,
        allowCollab: (p as any).allow_collab ?? true,
        licenseType: (p as { license_type?: string }).license_type ?? "all_rights",
      };
    });
    if (feedMode === "Newest") {
      return [...mapped].sort(
        (a, b) => new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime(),
      );
    }
    return mapped;
  }, [sourceData, ownersMap, feedMode]);

  const isDrillView = isLaunchDesignDrillEnabled() && mode === "projects" && category === DESIGN_DRILL_CHIP;

  const projectChipFilters = useMemo(
    (): ProjectChipFilter[] =>
      isLaunchDesignDrillEnabled()
        ? PROJECT_CHIP_FILTERS
        : (["All", ...CATEGORY_CHIPS] as ProjectChipFilter[]),
    [],
  );

  const filtered = projects.filter((p) => {
    if (isDrillView) return false;
    const matchCat =
      category === "All" ||
      (category !== DESIGN_DRILL_CHIP && categoryMatchesFilter(p.category, category as ProjectCategory));
    const matchSearch =
      !search ||
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.owner.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const { data: activeBoosts = [] } = useActiveBoosts(80);
  const boostedSets = useMemo(() => buildBoostedIdSet(activeBoosts), [activeBoosts]);
  const boostMaps = useMemo(() => buildBoostTargetMaps(activeBoosts), [activeBoosts]);
  const sortedFiltered = useMemo(
    () => sortByBoostedIds(filtered, boostedSets.projects),
    [filtered, boostedSets.projects],
  );

  const needsLogin = requiresAuth(feedMode) && !user;
  const feedPanelKey = needsLogin ? "login" : isDrillView ? "drill" : mode;
  const { data: ads = [] } = useActiveAds(12);
  const feedItems = useMemo(
    () => interleaveAds(sortedFiltered, ads, { minGap: 8, maxGap: 14 }),
    [sortedFiltered, ads],
  );

  const handleHireDesigner = (recipientId: string, recipientName: string) => {
    openHireForFreelancer(recipientId, recipientName);
  };

  const openHireForFreelancer = (
    freelancerId: string,
    projectTitle: string,
    projectId?: string,
    projectCoverUrl?: string,
  ) => {
    if (!user) {
      stashPendingHire(freelancerId, projectTitle);
      navigateToAuth(navigate);
      return;
    }
    setHireFreelancerId(freelancerId);
    setHireProject(projectTitle);
    setHireProjectId(projectId);
    setHireProjectCover(projectCoverUrl);
    setHireOpen(true);
  };

  const handleCollabDesigner = (recipientId: string, recipientName: string) => {
    setCollabTarget({ recipientId, recipientName });
    setCollabOpen(true);
  };

  return (
    <main className={cn("min-h-screen bg-app-ambient", MOBILE_PAGE_BOTTOM_CLASS)}>
      {(shouldNoindexSearchParams(searchParams) || search.trim().length > 0) && (
        <SeoHead path="/" noindex title="ค้นหาผลงาน" description="ผลการค้นหาบน Aplus1" />
      )}
      <div className="max-w-[1920px] mx-auto px-3 sm:px-4 lg:px-6 2xl:px-10 pt-4 py-4 space-y-4">
        <FeedHero mode={mode} />

        <FeedToolbar
          mode={mode}
          onModeChange={changeMode}
          feedMode={feedMode}
          onFeedModeChange={setFeedMode}
          search={search}
          onSearchChange={setSearch}
          category={category}
          onCategoryChange={setCategory}
          categoryChips={projectChipFilters}
          designerFeedSource={designerFeedSource}
          onDesignerFeedSourceChange={setDesignerFeedSource}
          designerSort={designerSort}
          onDesignerSort={setDesignerSort}
          designerCategory={designerCategory}
          onDesignerCategoryChange={setDesignerCategory}
          designerCategoryChips={designerCategoryChips}
          designerTools={designerTools}
          designerToolOptions={designerToolOptions}
          onToggleDesignerTool={(t) => setDesignerTools((l) => toggle(l, t))}
          onClearFilters={() => {
            setDesignerFeedSource("all");
            setDesignerSort("newest");
            setDesignerCategory("All");
            setDesignerTools([]);
            setStudioFeedSource("all");
            setCategory("All");
            setFeedModeRaw("Explore");
          }}
          onCreateClick={openNewPortfolio}
          showCreate={mode !== "community"}
          communityFeedSource={communityFilter.feedSource}
          onCommunityFeedSourceChange={(feedSource) =>
            setCommunityFilter({ ...communityFilter, feedSource })
          }
          communityCategory={communityFilter.category}
          onCommunityCategoryChange={(category) =>
            setCommunityFilter({ ...communityFilter, category })
          }
          communityTag={communityFilter.tag}
          communityPostKind={communityFilter.postKind}
          onCommunityPostClick={mode === "community" ? openNewCommunityPost : undefined}
          studioFeedSource={studioFeedSource}
          onStudioFeedSourceChange={setStudioFeedSource}
          drillActive={isDrillView}
          onDrillSelect={openDrill}
        />

        <FeedModeTransition modeKey={feedPanelKey}>
          {needsLogin ? (
            <div className="text-center py-16 glass-panel rounded-2xl">
              <p className="text-foreground font-medium mb-2 thai-display">เข้าสู่ระบบเพื่อใช้หมวด "{feedMode}"</p>
              <p className="text-sm text-muted-foreground mb-4 thai-body">ระบบจะแนะนำผลงานที่เหมาะกับคุณ</p>
              <Button onClick={() => useAuthDialog.getState().openSignup()} className="rounded-full bg-gradient-brand text-white hover:opacity-90">
                <LogIn className="w-4 h-4 mr-1.5" /> เข้าสู่ระบบ
              </Button>
            </div>
          ) : mode === "designers" ? (
            <DesignerGrid
              onHire={handleHireDesigner}
              onCollab={handleCollabDesigner}
              search={search}
              sort={designerSort}
              feedSource={designerFeedSource}
              categories={designerCategory !== "All" ? [designerCategory] : []}
              tools={designerTools}
            />
          ) : mode === "studios" ? (
            <StudioGrid search={search} feedSource={studioFeedSource} />
          ) : mode === "community" ? (
            <div className="xl:grid xl:grid-cols-[280px_minmax(0,1fr)] xl:gap-5 xl:items-start">
              <CommunityFeedSidebar
                filter={communityFilter}
                onFilterChange={setCommunityFilter}
              />
              <div className="min-w-0">
                <CommunityFeedMobileDiscovery
                  filter={communityFilter}
                  onFilterChange={setCommunityFilter}
                />
                <CommunityFeedPanel
                  search={search}
                  filter={communityFilter}
                  onClearTag={clearTag}
                  onPostClick={openNewCommunityPost}
                />
              </div>
            </div>
          ) : isDrillView ? (
            <DrillFeedPanel />
          ) : projectsLoading ? (
            <PageLoader fullPage={false} label="กำลังโหลดผลงาน..." />
          ) : (
            <>
              <FeedProjectGrid>
                {feedItems.map((item) =>
                  item.kind === "ad" ? (
                    <AdCard key={item.key} ad={item.data} />
                  ) : (
                    <ProjectCard
                      key={item.key}
                      project={item.data}
                      boosted={boostedSets.projects.has(item.data.id)}
                      boostId={boostMaps.projects.get(item.data.id)}
                      onHireClick={() => {
                        openHireForFreelancer(
                          item.data.ownerId ?? "",
                          item.data.title,
                          item.data.id,
                          item.data.image,
                        );
                      }}
                      onCollabClick={() => {
                        setCollabTarget({
                          recipientId: item.data.ownerId,
                          recipientName: item.data.owner,
                          projectId: item.data.id,
                          projectTitle: item.data.title,
                          projectCoverUrl: item.data.image,
                        });
                        setCollabOpen(true);
                      }}
                    />
                  )
                )}
              </FeedProjectGrid>

              {!projectsLoading && filtered.length === 0 && (
                <EmptyState
                  icon={SearchX}
                  title="ไม่พบผลงานที่ตรงกับตัวกรอง"
                  description={
                    feedMode === "Following"
                      ? "ติดตามดีไซเนอร์ที่ชอบ แล้วกลับมาดูผลงานล่าสุดของพวกเขาที่นี่"
                      : search
                        ? `ลองคำอื่น หรือเปลี่ยนหมวดหมู่ — ไม่มีผลลัพธ์สำหรับ "${search}"`
                        : "ลองเปลี่ยนหมวดหมู่หรือโหมดฟีด (เช่น Top 1 / Newest)"
                  }
                  action={
                    search || category !== "All" ? (
                      <Button
                        variant="outline"
                        className="rounded-full"
                        onClick={() => {
                          setSearch("");
                          setCategory("All");
                        }}
                      >
                        ล้างตัวกรอง
                      </Button>
                    ) : undefined
                  }
                />
              )}
            </>
          )}
        </FeedModeTransition>
      </div>

      <Footer />

      <HireDialog
        open={hireOpen}
        onOpenChange={setHireOpen}
        projectTitle={hireProject}
        projectId={hireProjectId}
        projectCoverUrl={hireProjectCover}
        freelancerId={hireFreelancerId}
      />
      <CollabDialog
        open={collabOpen}
        onOpenChange={setCollabOpen}
        recipientId={collabTarget.recipientId}
        recipientName={collabTarget.recipientName}
        projectId={collabTarget.projectId}
        projectTitle={collabTarget.projectTitle}
        projectCoverUrl={collabTarget.projectCoverUrl}
      />
    </main>
  );
};

export default FeedPage;
