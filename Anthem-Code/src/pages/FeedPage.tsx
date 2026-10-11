import { useState, useMemo, useEffect, useRef, type CSSProperties } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { LogIn } from "lucide-react";
import QueryStatusPanel, { FilterEmptyState } from "@/components/ui/QueryStatusPanel";
import { useProfilesByIds } from "@/core/profiles";
import { useSlowLoadFallback } from "@/hooks/useSlowLoadFallback";
import { useSearchHistory } from "@/hooks/useSearchHistory";
import { sortByViewAffinity } from "@/lib/viewAffinity";


import Footer from "@/components/Footer";
import FeedHero from "@/components/feed/FeedHero";
import FeedToolbar from "@/components/feed/FeedToolbar";
import HomeHeroWash from "@/components/feed/HomeHeroWash";
import SeoHead from "@/components/SeoHead";
import { shouldNoindexSearchParams } from "@/lib/seo";
import { COLOR_MATCH_MIN, normalizeColorList } from "@/lib/colorSearch";
import { similarSearchSuggestions } from "@/lib/searchSuggestions";
import { useCoverColorScores } from "@/hooks/useCoverColorScores";
import DrillFeedPanel from "@/components/drill/DrillFeedPanel";
import ProjectCard from "@/components/ProjectCard";
import AdCard from "@/components/feed/AdCard";
import HouseAdCard from "@/components/feed/HouseAdCard";
import { useActiveAds } from "@/hooks/useAds";
import { useActiveBoosts, buildBoostedIdSet, buildBoostTargetMaps } from "@/hooks/useBoost";
import { sortByBoostedIds } from "@/lib/boostFeedSort";
import { interleaveAds } from "@/lib/interleaveAds";
import { insertHouseAd } from "@/lib/insertHouseAd";
import { useFeedGridDensity } from "@/hooks/useFeedGridDensity";
import { useFeedHomeNavStore } from "@/stores/feedHomeNavStore";
import HireDialog from "@/components/HireDialog";
import CollabDialog from "@/components/CollabDialog";
import { FeedProjectGrid } from "@/components/feed/FeedProjectGrid";
import { FeedModeTransition } from "@/components/feed/FeedModeTransition";
import ObjectCatalog from "@/components/objects/ObjectCatalog";
import { type FeedMode } from "@/components/feed/FeedModeToggle";
import DesignerGrid from "@/components/feed/DesignerGrid";
import PackageGrid from "@/components/feed/PackageGrid";
import { type DesignerSort } from "@/components/feed/DesignerToolbar";
import type { DesignerFeedSource } from "@/components/feed/DesignerFeedDropdown";
import StudioGrid from "@/components/feed/StudioGrid";
import type { StudioFeedSource } from "@/components/studio/StudioFilterPanel";
import { useDesigners } from "@/hooks/useDesigners";

import { categories as allCategories, categoryMatchesFilter, DEFAULT_PROJECT_CATEGORY, normalizeProjectCategory, type Category, type Project, type ProjectCategory, type ProjectStatus, type SpecialFilter } from "@/data/projectTypes";
import { projectAiCardFields, projectHasAiTag } from "@/lib/aiDisclosure";
import {
  getCategoryParent,
  projectMatchesSubs,
  type CategoryParentId,
} from "@/data/categoryTaxonomy";
import { getCategoryParent as getFeedCategoryParent, getCategorySub as getFeedCategorySub } from "@/data/categoryTaxonomy";
import { isCategoryAllowed } from "@/lib/cookieConsent";
import {
  usePublishedProjects,
  useTopProjects,
  useFollowingProjects,
  useForYouProjects,
  type DBProject,
} from "@/hooks/useProjects";
import { useAuth } from "@/hooks/useAuth";
import { useShowFirstPostLabel } from "@/hooks/useHasPublishedProject";
import { consumePendingHire, navigateToAuth, stashPendingHire } from "@/lib/authRedirect";
import {
  coerceLaunchFeedMode,
  isAplus1FullProduct,
  isAplus1LaunchMinimal,
  isLaunchDesignDrillEnabled,
} from "@/lib/aplus1Launch";
import { useAuthDialog } from "@/stores/authDialogStore";
import CommunityFeedPanel from "@/components/community/CommunityFeedPanel";
import CommunityFeedSidebar, {
  CommunityFeedMobileDiscovery,
} from "@/components/community/CommunityFeedSidebar";
import { COMMUNITY_NEW_PATH } from "@/data/createActions";
import { useCommunityFeedFilter } from "@/hooks/useCommunityFeedFilter";
import { cn } from "@/lib/utils";
import { sortToolsVisualFirst } from "@/lib/toolIcons";
import { trackProductEvent } from "@/lib/productEvents";

import { MOBILE_PAGE_BOTTOM_CLASS } from "@/lib/mobileLayout";
import { DESIGN_DRILL_CHIP } from "@/lib/drillProject";
import { markOnboardingVisit, type OnboardingVisitId } from "@/lib/onboardingStorage";
import { rankProjectsForSearch } from "@/lib/projectSearchRank";

type FeedMode2 = "Explore" | SpecialFilter;
const requiresAuth = (m: FeedMode2) => m === "Following";

/** Feed bar chip: parent taxonomy id, All, or Design Drill. */
type FeedCategoryChip = "All" | typeof DESIGN_DRILL_CHIP | CategoryParentId;

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
  const { columns } = useFeedGridDensity();
  const houseColumnOffset = useRef(Math.floor(Math.random() * 12));
  const { user } = useAuth();
  const { queries: recentSearches, record: recordSearch } = useSearchHistory(user?.id);
  const showFirstPostLabel = useShowFirstPostLabel(user?.id);
  const [search, setSearch] = useState("");
  const [colorQuery, setColorQuery] = useState<string | null>(() =>
    normalizeColorList(searchParams.get("color")),
  );
  /** Hero field searches the full project catalog and falls back to nearest matches. */
  const [heroProjectSearch, setHeroProjectSearch] = useState(false);
  const [feedMode, setFeedModeRaw] = useState<FeedMode2>("Explore");
  const [category, setCategory] = useState<FeedCategoryChip>("All");
  const [projectLeaves, setProjectLeaves] = useState<ProjectCategory[]>([]);
  const [projectStyles, setProjectStyles] = useState<string[]>([]);
  const [hideAi, setHideAi] = useState(false);
  const [mode, setMode] = useState<FeedMode>(() => {
    if (typeof window === "undefined") return "projects";
    if (!isCategoryAllowed("functional")) return "projects";
    const urlMode = new URLSearchParams(window.location.search).get("mode");
    if (urlMode === "designers" || urlMode === "packages" || urlMode === "objects" || urlMode === "studios" || urlMode === "projects" || urlMode === "community") {
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
  const studioHome = mode === "projects" || mode === "designers" || mode === "packages" || mode === "objects";

  useEffect(() => {
    if (!studioHome) return;
    const { body, documentElement } = document;
    const prevBody = body.style.backgroundColor;
    const prevHtml = documentElement.style.backgroundColor;
    body.style.backgroundColor = "#f5f5f5";
    documentElement.style.backgroundColor = "#f5f5f5";
    return () => {
      body.style.backgroundColor = prevBody;
      documentElement.style.backgroundColor = prevHtml;
    };
  }, [studioHome]);

  useEffect(() => {
    if (!studioHome) return;
    let lastY = window.scrollY;
    let locking = false;
    let releaseTimer = 0;
    let slideFrame = 0;

    const release = () => {
      locking = false;
      lastY = window.scrollY;
      window.cancelAnimationFrame(slideFrame);
    };

    const markFlush = (sheet: HTMLElement, top: number) => {
      const flush = top <= 1;
      sheet.toggleAttribute("data-flush", flush);
      document.documentElement.toggleAttribute("data-feed-flush", flush);
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const span = Math.min(200, window.innerHeight * 0.24);
      const travel = Math.min(1, Math.max(0, (span - top) / span));
      const eased = travel * travel * (3 - 2 * travel);
      const progress = reduce ? (flush ? 1 : 0) : eased;
      document.documentElement.style.setProperty("--feed-flush-p", progress.toFixed(4));
    };

    const trackSlide = () => {
      const sheet = document.querySelector<HTMLElement>("[data-feed-sheet]");
      if (sheet) markFlush(sheet, sheet.getBoundingClientRect().top);
      if (locking) slideFrame = window.requestAnimationFrame(trackSlide);
    };

    const onScroll = () => {
      const y = window.scrollY;
      const delta = y - lastY;
      lastY = y;
      const sheet = document.querySelector<HTMLElement>("[data-feed-sheet]");
      if (sheet) markFlush(sheet, sheet.getBoundingClientRect().top);
      if (locking) {
        if (delta < -2) {
          window.clearTimeout(releaseTimer);
          window.scrollTo({ top: y, behavior: "auto" });
          release();
        }
        return;
      }
      if (delta <= 0.5) return;
      if (!sheet) return;
      const top = sheet.getBoundingClientRect().top;
      const zone = Math.min(180, window.innerHeight * 0.2);
      if (top <= 1 || top > zone) return;
      locking = true;
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      window.scrollTo({ top: y + top, behavior: reduce ? "auto" : "smooth" });
      window.cancelAnimationFrame(slideFrame);
      slideFrame = window.requestAnimationFrame(trackSlide);
      window.clearTimeout(releaseTimer);
      releaseTimer = window.setTimeout(release, reduce ? 40 : 700);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      document.documentElement.removeAttribute("data-feed-flush");
      document.documentElement.style.removeProperty("--feed-flush-p");
      window.removeEventListener("scroll", onScroll);
      window.cancelAnimationFrame(slideFrame);
      window.clearTimeout(releaseTimer);
    };
  }, [studioHome]);

  const openNewPortfolio = () => {
    if (!user) {
      useAuthDialog.getState().openSignup("/portfolio/new");
      return;
    }
    navigate("/portfolio/new");
  };

  const openObjectsStudio = () => {
    if (!user) {
      useAuthDialog.getState().openSignup("/dashboard/objects");
      return;
    }
    navigate("/dashboard/objects");
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
    useFeedHomeNavStore.getState().setScrolled(false);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.querySelector("[data-feed-sheet]")?.scrollIntoView({
      behavior: reduce ? "auto" : "smooth",
      block: "start",
    });
  };

  const applyToolbarSearch = (value: string) => {
    setHeroProjectSearch(false);
    setSearch(value);
  };

  const applyColorQuery = (hex: string | null) => {
    const next = normalizeColorList(hex);
    setColorQuery(next);
    const params = new URLSearchParams(searchParams);
    if (next) params.set("color", next);
    else params.delete("color");
    if (next) {
      params.delete("mode");
      params.delete("drill");
      params.delete("feed");
      setMode("projects");
      setCategory((current) => (current === DESIGN_DRILL_CHIP ? "All" : current));
      setHeroProjectSearch(false);
    }
    const q = params.toString();
    navigate(q ? `/?${q}` : "/", { replace: true });
  };

  /** Hero search stays on Projects and looks through the published catalog. */
  const applyHeroSearch = (value: string) => {
    setSearch(value);
    const query = value.trim();
    setHeroProjectSearch(query.length > 0);
    if (!query) return;
    setMode("projects");
    setCategory("All");
    setProjectLeaves([]);
    setProjectStyles([]);
    setFeedModeRaw("Explore");
    if (isCategoryAllowed("functional")) localStorage.setItem("feed-mode", "projects");
    setHideAi(false);
    if (searchParams.get("mode") || searchParams.get("drill") || searchParams.get("feed")) {
      navigate("/", { replace: true });
    }
  };

  const openDrill = () => {
    if (!isLaunchDesignDrillEnabled()) return;
    setMode("projects");
    setCategory(DESIGN_DRILL_CHIP);
    setProjectLeaves([]);
    setProjectStyles([]);
    setHideAi(false);
    if (isCategoryAllowed("functional")) localStorage.setItem("feed-mode", "projects");
    navigate("/?drill=1", { replace: true });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Deep link from a project's category badge: /?cat=<parent>&sub=<sub> opens the project feed filtered.
  useEffect(() => {
    const parent = getFeedCategoryParent(searchParams.get("cat"));
    if (!parent) return;
    const subId = searchParams.get("sub");
    setMode("projects");
    setCategory(parent.id);
    setProjectLeaves([]);
    setProjectStyles(subId && getFeedCategorySub(parent, subId) ? [subId] : []);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [searchParams]);

  const setFeedCategory = (next: FeedCategoryChip) => {
    setCategory(next);
    if (next !== DESIGN_DRILL_CHIP && searchParams.get("drill") === "1") {
      const params = new URLSearchParams(searchParams);
      params.delete("drill");
      params.delete("feed");
      const q = params.toString();
      navigate(q ? `/?${q}` : "/", { replace: true });
    }
  };

  useEffect(() => {
    const view = searchParams.get("mode");
    const feed = searchParams.get("feed");
    if (view === "designers" || view === "packages" || view === "objects" || view === "studios" || view === "projects" || view === "community") {
      const coerced = coerceLaunchFeedMode(view);
      setMode(coerced);
      if (isCategoryAllowed("functional")) localStorage.setItem("feed-mode", coerced);
      if (view !== coerced) {
        const params = new URLSearchParams(searchParams);
        if (coerced === "projects") params.delete("mode");
        else params.set("mode", coerced);
        params.delete("tag");
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
    if (mode === "packages" && searchParams.get("feed") === "saved") {
      setDesignerFeedSource("saved");
    }
  }, [mode, searchParams]);

  useEffect(() => {
    if (mode !== "packages" && designerFeedSource === "saved") {
      setDesignerFeedSource("all");
    }
  }, [mode, designerFeedSource]);

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
    setProjectLeaves([]);
    setProjectStyles([]);
    setHideAi(false);
    setSearch("");
    setColorQuery(null);
    setHeroProjectSearch(false);
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
    const q = searchParams.get("q");
    if (q == null) return;
    setSearch(q);
    const view = searchParams.get("mode");
    if (!view || view === "projects") {
      setMode("projects");
    }
  }, [searchParams]);

  useEffect(() => {
    const next = normalizeColorList(searchParams.get("color"));
    setColorQuery(next);
    if (!next) return;
    const view = searchParams.get("mode");
    if (!view || view === "projects") setMode("projects");
  }, [searchParams]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      recordSearch(search);
      if (user?.id) {
        void trackProductEvent("feed_search", { q: search.trim().slice(0, 120) }, { debounceMs: 1_500 });
        void queryClient.invalidateQueries({ queryKey: ["for-you-projects", user.id] });
      }
    }, 800);
    return () => window.clearTimeout(t);
  }, [search, user?.id, queryClient, recordSearch]);

  const activeProjectsQuery =
    feedMode === "Top 1"
      ? top
      : feedMode === "Following"
        ? following
        : feedMode === "Explore" && user
          ? explorePersonalized
          : published;

  const projectsLoading = (heroProjectSearch ? published : activeProjectsQuery).isLoading;
  const projectsError = (heroProjectSearch ? published : activeProjectsQuery).isError;
  const projectsSlow = useSlowLoadFallback(projectsLoading);
  const refetchProjects = () => {
    void activeProjectsQuery.refetch();
  };

  const sourceData: DBProject[] = useMemo(() => {
    if (heroProjectSearch) return (published.data ?? []) as DBProject[];
    let rows: DBProject[];
    switch (feedMode) {
      case "Top 1":
        rows = (top.data ?? []) as DBProject[];
        break;
      case "Following":
        rows = (following.data ?? []) as DBProject[];
        break;
      case "Newest":
        rows = (published.data ?? []) as DBProject[];
        break;
      case "Explore":
        rows = user
          ? ((explorePersonalized.data ?? []) as DBProject[])
          : ((published.data ?? []) as DBProject[]);
        break;
      default:
        rows = (published.data ?? []) as DBProject[];
    }
    // Guests (and cold Explore): re-rank by local view affinity from projects they opened.
    if (feedMode === "Explore" && !user) {
      return sortByViewAffinity(rows);
    }
    return rows;
  }, [heroProjectSearch, feedMode, published.data, top.data, following.data, explorePersonalized.data, user]);

  const creatorIds = useMemo(
    () =>
      Array.from(
        new Set(
          sourceData.flatMap((p) => [
            p.owner_id,
            ...((p.collab_user_ids ?? []) as string[]),
          ]).filter(Boolean),
        ),
      ),
    [sourceData]
  );

  const { data: creatorsData } = useProfilesByIds(creatorIds);
  const creatorsMap = useMemo(() => {
    const map: Record<
      string,
      { name: string; avatar: string; username?: string; opportunityTypes: string[]; verified?: boolean }
    > = {};
    (creatorsData?.list ?? []).forEach((p) => {
      const profileUserId = (p as { user_id?: string }).user_id ?? p.id;
      map[profileUserId] = {
        name: p.display_name || p.username || "ฟรีแลนซ์",
        avatar: p.avatar_url || "",
        username: p.username ?? undefined,
        opportunityTypes: p.opportunity_types ?? [],
        verified: !!p.is_verified,
      };
    });
    return map;
  }, [creatorsData]);

  const projects: Project[] = useMemo(() => {
    const mapped: Project[] = sourceData.map((p) => {
      const o = creatorsMap[p.owner_id];
      const collaboratorIds = Array.from(
        new Set(((p.collab_user_ids ?? []) as string[]).filter((id) => id !== p.owner_id)),
      );
      return {
        id: p.id,
        title: p.title,
        image: p.cover_url || (p.gallery_urls?.[0] ?? ""),
        gallery: p.gallery_urls ?? [],
        category: (normalizeProjectCategory(p.category) ?? DEFAULT_PROJECT_CATEGORY) as Category,
        owner: o?.name ?? "ฟรีแลนซ์",
        ownerId: p.owner_id,
        ownerAvatar: o?.avatar ?? "",
        ownerUsername: o?.username,
        ownerVerified: o?.verified,
        collaborators: collaboratorIds.map((id) => ({
          id,
          name: creatorsMap[id]?.name ?? "ผู้ร่วมคอลแลป",
          avatar: creatorsMap[id]?.avatar ?? "",
          username: creatorsMap[id]?.username,
          verified: creatorsMap[id]?.verified,
        })),
        likes: p.likes,
        views: p.views,
        comments: 0,
        bookmarked: false,
        status: p.status as ProjectStatus,
        publishedDate: p.created_at,
        tools: p.tools ?? [],
        tags: p.tags ?? [],
        allowHire: p.allow_hire ?? true,
        allowCollab: p.allow_collab ?? true,
        licenseType: (p as { license_type?: string }).license_type ?? "all_rights",
        ...projectAiCardFields(p),
        description: (p as { subtitle?: string; description?: string }).subtitle
          || (p as { description?: string }).description
          || "",
      };
    });
    if (feedMode === "Newest") {
      return [...mapped].sort(
        (a, b) => new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime(),
      );
    }
    return mapped;
  }, [sourceData, creatorsMap, feedMode]);

  const isDrillView = isLaunchDesignDrillEnabled() && mode === "projects" && category === DESIGN_DRILL_CHIP;

  const activeParent =
    category !== "All" && category !== DESIGN_DRILL_CHIP ? getCategoryParent(category) : null;

  const catalog = projects.filter((p) => {
    if (isDrillView) return false;
    let matchCat = true;
    if (activeParent) {
      matchCat = activeParent.leaves.some((leaf) => categoryMatchesFilter(p.category, leaf));
    }
    const matchSub = projectMatchesSubs(p.category, p.tags, projectStyles, activeParent);
    if (hideAi && projectHasAiTag(p)) return false;
    return matchCat && matchSub;
  });

  const heroRank =
    heroProjectSearch && search.trim() ? rankProjectsForSearch(catalog, search) : null;

  const textMatched = heroRank
    ? heroRank.items
    : catalog.filter((p) => {
        const q = search.trim().toLowerCase();
        return (
          !q ||
          p.title.toLowerCase().includes(q) ||
          p.owner.toLowerCase().includes(q) ||
          (p.description ?? "").toLowerCase().includes(q) ||
          (p.tags ?? []).some((t) => t.toLowerCase().includes(q)) ||
          (p.tools ?? []).some((t) => t.toLowerCase().includes(q))
        );
      });

  const colorMatch = useCoverColorScores(
    mode === "projects" && colorQuery
      ? textMatched.map((p) => ({ id: p.id, image: p.image || "" }))
      : [],
    mode === "projects" ? colorQuery : null,
  );

  const filtered =
    mode === "projects" && colorQuery
      ? textMatched
          .flatMap((project) => {
            const score = colorMatch.scores.get(project.id);
            if (score == null || score < COLOR_MATCH_MIN) return [];
            return [{ project, score }];
          })
          .sort((a, b) => b.score - a.score)
          .map((row) => row.project)
      : textMatched;

  const { data: activeBoosts = [] } = useActiveBoosts(80);
  const boostedSets = useMemo(() => buildBoostedIdSet(activeBoosts), [activeBoosts]);
  const boostMaps = useMemo(() => buildBoostTargetMaps(activeBoosts), [activeBoosts]);
  const sortedFiltered = useMemo(
    () =>
      colorQuery && mode === "projects"
        ? filtered
        : sortByBoostedIds(filtered, boostedSets.projects),
    [filtered, boostedSets.projects, colorQuery, mode],
  );

  const needsLogin = requiresAuth(feedMode) && !user;
  const feedPanelKey = needsLogin ? "login" : isDrillView ? "drill" : mode;
  const { data: ads = [] } = useActiveAds(12);
  const feedItems = useMemo(() => {
    const mixed = interleaveAds(sortedFiltered, ads, { minGap: 8, maxGap: 14 });
    if (!isAplus1FullProduct() || search.trim() || colorQuery) return mixed;
    return insertHouseAd(mixed, {
      columns,
      afterRows: 4,
      columnOffset: houseColumnOffset.current,
    });
  }, [sortedFiltered, ads, columns, search, colorQuery]);

  const searchSuggestions = useMemo(
    () => (search.trim() && filtered.length === 0 ? similarSearchSuggestions(search, recentSearches) : []),
    [search, filtered.length, recentSearches],
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
    <main
      id="main-content"
      data-studio-home={studioHome ? "" : undefined}
      style={
        studioHome
          ? ({
              "--background": "0 0% 96%",
              "--foreground": "40 3% 18%",
              "--muted-foreground": "30 4% 41%",
              "--card": "0 0% 100%",
              "--card-foreground": "40 3% 18%",
              "--popover": "0 0% 100%",
              "--popover-foreground": "40 3% 18%",
              "--border": "40 5% 86%",
              "--input": "40 5% 86%",
              "--muted": "40 6% 92%",
              "--secondary": "40 6% 92%",
              "--secondary-foreground": "40 3% 18%",
              "--accent": "40 6% 92%",
              "--accent-foreground": "40 3% 18%",
              "--primary": "40 3% 18%",
              "--primary-foreground": "0 0% 96%",
              "--primary-bright": "40 3% 18%",
              "--ring": "40 3% 18%",
              color: "#2f2e2c",
              backgroundColor: "#f5f5f5",
            } as CSSProperties)
          : undefined
      }
      className={cn("relative min-h-screen bg-app-ambient", MOBILE_PAGE_BOTTOM_CLASS)}
    >
      {(shouldNoindexSearchParams(searchParams) || search.trim().length > 0 || Boolean(colorQuery)) && (
        <SeoHead path="/" noindex title="ค้นหาผลงาน" description="ผลการค้นหาบน SAMECOR" />
      )}
      {studioHome && <HomeHeroWash hideBottomBlur={mode === "projects"} />}
      <div
        className={cn(
          "relative z-[1] max-w-[1920px] mx-auto px-3 sm:px-[calc(1rem+25px)] lg:px-[calc(1.5rem+25px)] 2xl:px-[calc(2.5rem+25px)] py-4",
          studioHome ? "pt-0 space-y-0" : "pt-4 space-y-4",
        )}
      >
        <FeedHero mode={mode} onModeChange={changeMode} search={search} onSearchChange={applyHeroSearch} />

        <div
          data-feed-sheet={studioHome ? "" : undefined}
          className={
            studioHome
              ? "relative z-10 min-h-[100dvh] !-mt-[calc(100dvh-8px)] -mx-3 rounded-t-[2.75rem] bg-[#f5f5f5] px-3 pt-6 shadow-[0_-32px_70px_-40px_rgba(47,46,44,0.55)] sm:-mx-[calc(1rem+25px)] sm:px-[calc(1rem+25px)] lg:-mx-[calc(1.5rem+25px)] lg:px-[calc(1.5rem+25px)] 2xl:-mx-[calc(2.5rem+25px)] 2xl:px-[calc(2.5rem+25px)]"
              : undefined
          }
        >
        <FeedToolbar
          mode={mode}
          onModeChange={changeMode}
          feedMode={feedMode}
          onFeedModeChange={setFeedMode}
          search={search}
          onSearchChange={applyToolbarSearch}
          category={category}
          onCategoryChange={setFeedCategory}
          projectLeaves={projectLeaves}
          onProjectLeavesChange={setProjectLeaves}
          projectStyles={projectStyles}
          onProjectStylesChange={setProjectStyles}
          hideAi={hideAi}
          onHideAiChange={setHideAi}
          includeDesignDrillChip={isLaunchDesignDrillEnabled()}
          projectResultCount={filtered.length}
          resultCount={mode === "projects" ? filtered.length : undefined}
          recentSearches={recentSearches}
          onRecentSearchSelect={applyToolbarSearch}
          colorQuery={mode === "projects" ? colorQuery : null}
          onColorQueryChange={applyColorQuery}
          colorSearchPending={mode === "projects" && Boolean(colorQuery) && colorMatch.pending}
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
            setProjectLeaves([]);
            setProjectStyles([]);
            setHideAi(false);
            setHeroProjectSearch(false);
            setSearch("");
            applyColorQuery(null);
            setFeedModeRaw("Explore");
          }}
          onCreateClick={mode === "objects" ? openObjectsStudio : openNewPortfolio}
          showCreate={mode !== "community"}
          showFirstPostLabel={showFirstPostLabel}
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

        <FeedModeTransition
          modeKey={feedPanelKey}
          className={
            studioHome ? "mt-8 sm:mt-10" : undefined
          }
        >
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
              onClearSearch={() => setSearch("")}
              sort={designerSort}
              feedSource={designerFeedSource}
              categories={designerCategory !== "All" ? [designerCategory] : []}
              tools={designerTools}
            />
          ) : mode === "objects" ? (
            <ObjectCatalog search={search} onClearSearch={() => setSearch("")} />
          ) : mode === "packages" ? (
            <PackageGrid
              search={search}
              onClearSearch={() => setSearch("")}
              sort={designerSort}
              feedSource={designerFeedSource}
              categories={designerCategory !== "All" ? [designerCategory] : []}
            />
          ) : mode === "studios" ? (
            <StudioGrid search={search} onClearSearch={() => setSearch("")} feedSource={studioFeedSource} />
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
                  onClearSearch={() => setSearch("")}
                  onPostClick={openNewCommunityPost}
                />
              </div>
            </div>
          ) : isDrillView ? (
            <DrillFeedPanel />
          ) : projectsError || projectsLoading ? (
            <QueryStatusPanel
              isLoading={projectsLoading}
              isError={projectsError}
              isSlow={projectsSlow}
              onRetry={refetchProjects}
              loadingLabel="กำลังโหลดผลงาน..."
              errorTitle="โหลดผลงานไม่สำเร็จ"
              errorDescription="เน็ตอาจสะดุดชั่วคราว — กดลองใหม่ หรือเปลี่ยนโหมดฟีด"
              slowTitle="โหลดผลงานนานผิดปกติ"
              slowDescription="ยังพยายามอยู่ ถ้าเกินไปลองกดใหม่ หรือเช็กการเชื่อมต่อ"
            />
          ) : (
            <>
              {heroRank?.relaxed ? (
                <p className="mb-4 text-center text-sm text-muted-foreground thai-body">
                  ผลงานที่ใกล้เคียงกับที่ค้น
                </p>
              ) : null}
              {colorQuery && colorMatch.pending && filtered.length === 0 ? (
                <p className="py-16 text-center text-sm text-muted-foreground" aria-live="polite">
                  กำลังเทียบสีจากปกผลงาน
                </p>
              ) : null}
              <FeedProjectGrid masonry>
                {feedItems.map((item) =>
                  item.kind === "ad" ? (
                    <AdCard key={item.key} ad={item.data} />
                  ) : item.kind === "house" ? (
                    <HouseAdCard key={item.key} />
                  ) : (
                    <ProjectCard
                      key={item.key}
                      gallery
                      project={item.data}
                      searchQuery={search}
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

              {!colorMatch.pending && filtered.length === 0 && (
                <FilterEmptyState
                  title={colorQuery && !search.trim() ? "ไม่พบผลงานที่สีใกล้เคียง" : "ไม่พบผลงานที่ตรงกับตัวกรอง"}
                  description={
                    feedMode === "Following"
                      ? "ติดตามดีไซเนอร์ที่ชอบ แล้วกลับมาดูผลงานล่าสุดของพวกเขาที่นี่"
                      : colorQuery &&
                          colorMatch.measured > 0 &&
                          colorMatch.unreadable === colorMatch.measured
                        ? "อ่านสีจากปกผลงานไม่ได้ในตอนนี้ ลองค้นด้วยคำแทน"
                        : colorQuery
                          ? "ลองเลือกสีอื่น หรือล้างสีแล้วค้นด้วยคำ"
                          : search
                            ? "ลองเปลี่ยนคำค้นหรือหมวดหมู่ หรือเลือกคำใกล้เคียงด้านล่าง"
                            : "ลองเปลี่ยนหมวดหมู่หรือโหมดฟีด (เช่น Top 1 / Newest)"
                  }
                  suggestions={searchSuggestions.map((label) => ({
                    label,
                    onSelect: () => setSearch(label),
                  }))}
                  onClear={
                    search ||
                    colorQuery ||
                    category !== "All" ||
                    projectLeaves.length > 0 ||
                    projectStyles.length > 0 ||
                    hideAi
                      ? () => {
                          applyToolbarSearch("");
                          applyColorQuery(null);
                          setCategory("All");
                          setProjectLeaves([]);
                          setProjectStyles([]);
                          setHideAi(false);
                        }
                      : undefined
                  }
                />
              )}
            </>
          )}
        </FeedModeTransition>
        </div>
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
