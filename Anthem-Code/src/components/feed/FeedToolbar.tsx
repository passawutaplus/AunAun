import { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Plus, X } from "lucide-react";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { ScrollBlur } from "@/components/ScrollBlur";
import SearchBar from "@/components/SearchBar";
import FilterChips from "@/components/FilterChips";
import FeedModeDropdown from "@/components/feed/FeedModeDropdown";
import FeedModeToggle, { type FeedMode } from "@/components/feed/FeedModeToggle";
import { FeedModeTransition } from "@/components/feed/FeedModeTransition";
import ProfileButton from "@/components/ProfileButton";
import CommunityFeedTabs from "@/components/community/CommunityFeedTabs";
import CommunityCategoryChips from "@/components/community/CommunityCategoryChips";
import CommunityFilterPanel from "@/components/community/CommunityFilterPanel";
import DesignerCategoryChips from "@/components/feed/DesignerCategoryChips";
import DesignerFeedDropdown, {
  PACKAGE_FEED_ORDER,
  type DesignerFeedSource,
} from "@/components/feed/DesignerFeedDropdown";
import DesignerFilterPanel from "@/components/feed/DesignerFilterPanel";
import ObjectFilterFields from "@/components/objects/ObjectFilterFields";
import StudioFilterPanel, { type StudioFeedSource } from "@/components/studio/StudioFilterPanel";
import {
  FilterPanel,
  PACKAGE_SORT_LABELS,
  SORT_LABELS,
  type DesignerSort,
} from "@/components/feed/DesignerToolbar";
import ProjectSearchFilterSheet, {
  countActiveProjectFilters,
  useParentChipOptions,
  type ProjectSearchFilterValue,
} from "@/components/feed/ProjectSearchFilterSheet";
import {
  getCategoryParent,
  type CategoryParentId,
} from "@/data/categoryTaxonomy";
import type { Category, FeedFilter, ProjectCategory } from "@/data/projectTypes";
import type { CommunityFeedFilter } from "@/data/communityTopics";
import { DESIGN_DRILL_CHIP, type ProjectChipFilter } from "@/lib/drillProject";
import { FEED_MODE_LABELS, FEED_MODE_ORDER } from "@/lib/feedModeLabels";
import { BRAND_NAME } from "@/lib/brandConfig";
import { useFeedHomeNavStore } from "@/stores/feedHomeNavStore";
import { smoothEase } from "@/lib/motion";
import { cn } from "@/lib/utils";

function ObjectsStudioLink({ className }: { className?: string }) {
  return (
    <p className={cn("text-sm text-muted-foreground", className)}>
      เริ่มขายงานของตัวเองได้ที่{" "}
      <Link
        to="/dashboard/objects"
        className="group inline-flex items-center text-foreground"
      >
        Objects
        <ArrowRight
          aria-hidden
          className="ml-1 h-3.5 w-3.5 transition-transform duration-200 ease-out group-hover:translate-x-1.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
        />
      </Link>
    </p>
  );
}

const FEED_MODE_OPTIONS = FEED_MODE_ORDER.map((value) => ({
  value,
  label: FEED_MODE_LABELS[value],
}));

type Props = {
  mode: FeedMode;
  onModeChange: (m: FeedMode) => void;
  feedMode: FeedFilter;
  onFeedModeChange: (m: FeedFilter) => void;
  search: string;
  onSearchChange: (v: string) => void;
  /** Projects feed: parent chip id, All, or Design Drill */
  category: ProjectChipFilter | CategoryParentId;
  onCategoryChange: (c: ProjectChipFilter | CategoryParentId) => void;
  /** Leaf categories selected inside filter sheet (empty = all under parent) */
  projectLeaves?: ProjectCategory[];
  onProjectLeavesChange?: (leaves: ProjectCategory[]) => void;
  projectStyles?: string[];
  onProjectStylesChange?: (styles: string[]) => void;
  hideAi?: boolean;
  onHideAiChange?: (hide: boolean) => void;
  /** @deprecated chips derived from taxonomy for projects mode */
  categoryChips?: ProjectChipFilter[];
  designerFeedSource?: DesignerFeedSource;
  onDesignerFeedSourceChange?: (source: DesignerFeedSource) => void;
  designerSort: DesignerSort;
  onDesignerSort: (s: DesignerSort) => void;
  designerCategory: Category | "All";
  onDesignerCategoryChange: (c: Category | "All") => void;
  designerCategoryChips: (Category | "All")[];
  designerTools: string[];
  designerToolOptions: string[];
  onToggleDesignerTool: (t: string) => void;
  onClearFilters: () => void;
  onCreateClick: () => void;
  showCreate: boolean;
  showFirstPostLabel?: boolean;
  communityFeedSource?: CommunityFeedFilter["feedSource"];
  onCommunityFeedSourceChange?: (source: CommunityFeedFilter["feedSource"]) => void;
  communityCategory?: string;
  onCommunityCategoryChange?: (category: string) => void;
  communityTag?: string;
  communityPostKind?: CommunityFeedFilter["postKind"];
  onCommunityPostClick?: () => void;
  studioFeedSource?: StudioFeedSource;
  onStudioFeedSourceChange?: (source: StudioFeedSource) => void;
  drillActive?: boolean;
  onDrillSelect?: () => void;
  includeDesignDrillChip?: boolean;
  projectResultCount?: number;
  /** Visible when search is non-empty — number of matching items in the active feed. */
  resultCount?: number;
  recentSearches?: string[];
  onRecentSearchSelect?: (q: string) => void;
  /** Projects feed: picked cover color, #rrggbb. */
  colorQuery?: string | null;
  onColorQueryChange?: (hex: string | null) => void;
  colorSearchPending?: boolean;
};

const FeedToolbar = ({
  mode,
  onModeChange,
  feedMode,
  onFeedModeChange,
  search,
  onSearchChange,
  category,
  onCategoryChange,
  projectLeaves = [],
  onProjectLeavesChange,
  projectStyles = [],
  onProjectStylesChange,
  hideAi = false,
  onHideAiChange,
  designerFeedSource = "all",
  onDesignerFeedSourceChange,
  designerSort,
  onDesignerSort,
  designerCategory,
  onDesignerCategoryChange,
  designerCategoryChips,
  designerTools,
  designerToolOptions,
  onToggleDesignerTool,
  onClearFilters,
  onCreateClick,
  showCreate,
  showFirstPostLabel = false,
  communityFeedSource = "all",
  onCommunityFeedSourceChange,
  communityCategory = "All",
  onCommunityCategoryChange,
  communityTag,
  communityPostKind,
  onCommunityPostClick,
  studioFeedSource = "all",
  onStudioFeedSourceChange,
  drillActive = false,
  onDrillSelect,
  includeDesignDrillChip = false,
  projectResultCount,
  resultCount,
  recentSearches = [],
  onRecentSearchSelect,
  colorQuery = null,
  onColorQueryChange,
  colorSearchPending = false,
}: Props) => {
  const navigate = useNavigate();
  const [mobileSearchOpen, setMobileSearchOpen] = useState(search.length > 0);
  const [projectSheetOpen, setProjectSheetOpen] = useState(false);
  const isProjects = mode === "projects";
  const isDesigners = mode === "designers";
  const isPackages = mode === "packages";
  const isObjects = mode === "objects";
  const isStudios = mode === "studios";
  const isCommunity = mode === "community";
  const isCatalog = isProjects || isDesigners || isPackages || isObjects;
  const catalogTitle = isDesigners ? "Designers" : isPackages ? "Packages" : isObjects ? "Objects" : "Projects";
  const reducedMotion = useReducedMotion();
  const barSlide = {
    duration: reducedMotion ? 0 : 0.46,
    ease: smoothEase,
  };

  const parentChips = useParentChipOptions(includeDesignDrillChip);

  const projectFilterValue: ProjectSearchFilterValue = useMemo(
    () => ({
      search,
      parentId:
        category === "All" || category === DESIGN_DRILL_CHIP
          ? "All"
          : (category as CategoryParentId),
      leaves: projectLeaves,
      styles: projectStyles,
      hideAi,
    }),
    [search, category, projectLeaves, projectStyles, hideAi],
  );

  const projectFilterCount = isProjects
    ? countActiveProjectFilters({
        ...projectFilterValue,
        parentId:
          category === DESIGN_DRILL_CHIP
            ? "All"
            : projectFilterValue.parentId,
      }) + (category === DESIGN_DRILL_CHIP ? 1 : 0) + (feedMode !== "Explore" ? 1 : 0)
    : 0;

  const filterCount =
    (isDesigners || isPackages ? (designerSort !== "newest" ? 1 : 0) + designerTools.length : 0) +
    ((isDesigners || isPackages) && designerFeedSource !== "all" ? 1 : 0) +
    ((isDesigners || isPackages) && designerCategory !== "All" ? 1 : 0) +
    (isProjects ? projectFilterCount : 0) +
    (isCommunity && communityCategory !== "All" ? 1 : 0) +
    (isCommunity && communityFeedSource !== "all" ? 1 : 0) +
    (isCommunity && communityPostKind ? 1 : 0) +
    (isCommunity && communityTag ? 1 : 0) +
    (isStudios && studioFeedSource !== "all" ? 1 : 0);

  const filterContent = isCommunity ? (
    <CommunityFilterPanel
      feedSource={communityFeedSource}
      onFeedSourceChange={onCommunityFeedSourceChange ?? (() => {})}
      category={communityCategory}
      onCategoryChange={onCommunityCategoryChange ?? (() => {})}
    />
  ) : isStudios ? (
    <StudioFilterPanel
      feedSource={studioFeedSource}
      onFeedSourceChange={onStudioFeedSourceChange ?? (() => {})}
    />
  ) : isObjects ? null : isDesigners || isPackages ? (
    <DesignerFilterPanel
      feedSource={designerFeedSource}
      onFeedSourceChange={onDesignerFeedSourceChange ?? (() => {})}
      sort={designerSort}
      onSort={onDesignerSort}
      tools={designerToolOptions}
      selectedTools={designerTools}
      onToggleTool={onToggleDesignerTool}
      category={designerCategory}
      onCategoryChange={onDesignerCategoryChange}
      categoryChips={designerCategoryChips}
      onClear={onClearFilters}
      hideTools={isPackages}
      sortLabels={isPackages ? PACKAGE_SORT_LABELS : SORT_LABELS}
      feedSources={isPackages ? PACKAGE_FEED_ORDER : undefined}
    />
  ) : (
    <FilterPanel
      sort={designerSort}
      onSort={onDesignerSort}
      tools={[]}
      selectedTools={designerTools}
      onToggleTool={onToggleDesignerTool}
      showTools={false}
      feedModes={FEED_MODE_OPTIONS}
      selectedFeedMode={feedMode}
      onFeedModeSelect={(v) => onFeedModeChange(v as FeedFilter)}
      showFeedModes={isProjects}
      onClear={onClearFilters}
    />
  );

  const openProjectSheet = () => setProjectSheetOpen(true);

  const applyProjectSheet = (next: ProjectSearchFilterValue) => {
    onSearchChange(next.search);
    onCategoryChange(next.parentId === "All" ? "All" : next.parentId);
    onProjectLeavesChange?.(next.leaves);
    onProjectStylesChange?.(next.styles);
    onHideAiChange?.(next.hideAi);
  };

  const activeSubLabels = useMemo(() => {
    if (!isProjects || !projectStyles.length) return [];
    const parent =
      category !== "All" && category !== DESIGN_DRILL_CHIP
        ? getCategoryParent(category)
        : null;
    const subs = parent?.subs ?? [];
    return projectStyles.map((id) => ({
      id,
      label: subs.find((s) => s.id === id)?.label ?? id,
    }));
  }, [isProjects, projectStyles, category]);

  const postButton = onCommunityPostClick ? (
    <button
      type="button"
      onClick={onCommunityPostClick}
      aria-label="โพสต์ชุมชน"
      className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-gradient-brand text-white hover:opacity-90 transition-opacity shrink-0"
    >
      <Plus className="w-5 h-5" strokeWidth={2.5} />
    </button>
  ) : null;

  const createButton =
    showCreate && !isCommunity ? (
      <button
        type="button"
        onClick={onCreateClick}
        aria-label={showFirstPostLabel ? "ลงผลงาน" : "สร้างเนื้อหาใหม่"}
        className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-gradient-brand text-white hover:opacity-90 transition-opacity shrink-0"
      >
        <Plus className="w-5 h-5" strokeWidth={2.5} />
      </button>
    ) : null;

  const rightAction = isCommunity ? postButton : createButton;

  const toggleProps = {
    value: mode,
    drillActive,
    onChange: onModeChange,
    onDrillSelect,
  } as const;

  const searchPlaceholder = isCommunity
    ? "ค้นหาโพสต์ชุมชน"
    : isDesigners
      ? "ค้นหาดีไซเนอร์"
      : isPackages
        ? "ค้นหาแพ็กเกจ"
        : isObjects
          ? "ค้นหา Objects"
          : isStudios
          ? "ค้นหาสตูดิโอ"
          : "ค้นหาผลงาน";

  const searchBarShared = {
    recentSearches,
    onRecentSelect: onRecentSearchSelect,
  };

  const projectSearchBarProps = isProjects
    ? {
        onFilterClick: openProjectSheet,
        filterContent: undefined as undefined,
        hideAi,
        onHideAiToggle: () => onHideAiChange?.(!hideAi),
        colorQuery,
        onColorQueryChange,
      }
    : {
        filterContent,
      };

  const homeScrolled = useFeedHomeNavStore((s) => s.scrolled);

  useEffect(() => {
    const onFilterClick = isProjects ? () => setProjectSheetOpen(true) : undefined;
    useFeedHomeNavStore.getState().register({
      search,
      searchPlaceholder,
      filterCount,
      feedMode,
      onSearchChange,
      onFilterClick,
      onCreateClick,
      onFeedModeChange: (m) => {
        if (!isProjects) onModeChange("projects");
        onFeedModeChange(m);
      },
      showCreate: showCreate && !isCommunity,
      showFirstPostLabel,
    });
    return () => useFeedHomeNavStore.getState().unregister();
    // Handlers + mode; search text synced in the patch effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    onSearchChange,
    onCreateClick,
    onFeedModeChange,
    onModeChange,
    showCreate,
    showFirstPostLabel,
    isCommunity,
    isProjects,
    searchPlaceholder,
    feedMode,
  ]);

  useEffect(() => {
    if (!useFeedHomeNavStore.getState().active) return;
    useFeedHomeNavStore.getState().patch({
      search,
      searchPlaceholder,
      filterCount,
      feedMode,
      showCreate: showCreate && !isCommunity,
      showFirstPostLabel,
    });
  }, [search, searchPlaceholder, filterCount, feedMode, showCreate, showFirstPostLabel, isCommunity]);

  return (
    <div
      data-feed-toolbar
      className={cn(
        "z-30 -mx-3 sm:-mx-4 lg:-mx-6 2xl:-mx-10 px-3 sm:px-4 lg:px-6 2xl:px-10 py-3 overflow-visible",
        homeScrolled
          ? cn(
              "sticky top-0",
              isCatalog
                ? "z-40 bg-transparent shadow-none lg:static"
                : "bg-background/80 backdrop-blur-md shadow-[0_-24px_48px_-8px_hsl(var(--background))] supports-[backdrop-filter]:bg-background/65",
            )
          : "relative bg-transparent shadow-none",
      )}
    >
      {homeScrolled && isCatalog ? (
        <div className="pointer-events-none absolute inset-0 z-0 lg:hidden" aria-hidden>
          <ScrollBlur direction="top" blur={12} layers={4} />
        </div>
      ) : null}
      {/* Mobile / tablet */}
      <div className="relative z-10 flex items-center gap-2 lg:hidden">
        <div className={cn(mobileSearchOpen && !isProjects ? "flex-1 min-w-0" : "shrink-0")}>
          <SearchBar
            value={search}
            onChange={onSearchChange}
            placeholder={searchPlaceholder}
            filterCount={filterCount}
            compact
            expandable
            onExpandedChange={setMobileSearchOpen}
            {...searchBarShared}
            {...(isProjects
              ? {
                  onExpandClick: openProjectSheet,
                  onFilterClick: openProjectSheet,
                  hideAi,
                  onHideAiToggle: () => onHideAiChange?.(!hideAi),
                  colorQuery,
                  onColorQueryChange,
                }
              : { filterContent })}
          />
        </div>
        <div className="ml-auto min-w-0 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <FeedModeToggle
            {...toggleProps}
            compact={mobileSearchOpen && !isProjects}
          />
        </div>
      </div>
      {isObjects ? <ObjectsStudioLink className="mt-2 text-right lg:hidden" /> : null}

      {/* Desktop */}
      <div className="relative z-10 hidden space-y-3 lg:block">
        {isCatalog ? (
          <>
            <div data-feed-catalog-head="" className="grid grid-cols-[auto_minmax(0,1fr)] items-end gap-x-6 gap-y-1 pb-8 xl:gap-x-8">
              <h2
                data-feed-mode-title=""
                className="col-start-1 row-start-1 row-span-2 self-end translate-y-7 text-[5.25rem] font-semibold leading-[0.8] tracking-tight text-foreground xl:text-[6.5rem]"
              >
                {catalogTitle}
              </h2>
              <div data-feed-mode-cluster="" className="col-start-2 row-start-1 flex min-w-0 items-center justify-end gap-3">
                <div className="shrink-0">
                  <SearchBar
                    value={search}
                    onChange={onSearchChange}
                    placeholder={searchPlaceholder}
                    filterCount={filterCount}
                    expandable
                    expandAnchor="end"
                    {...searchBarShared}
                    {...projectSearchBarProps}
                    {...(!isProjects ? { filterContent } : {})}
                  />
                </div>
                <div className="flex min-w-0 max-w-[min(36rem,calc(100vw-2rem))] shrink items-center overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  <FeedModeToggle {...toggleProps} />
                </div>
              </div>
              <FeedModeTransition modeKey={mode} className="col-start-2 row-start-2 min-w-0">
                <div className="w-full min-w-0">
                  {isProjects ? (
                    <FilterChips
                      align="end"
                      rows={4}
                      options={parentChips}
                      selected={String(category)}
                      onSelect={(id) => {
                        if (id === DESIGN_DRILL_CHIP) {
                          onDrillSelect?.();
                          onCategoryChange(DESIGN_DRILL_CHIP);
                        } else {
                          onCategoryChange(id as CategoryParentId | "All");
                        }
                        onProjectLeavesChange?.([]);
                        onProjectStylesChange?.([]);
                      }}
                    />
                  ) : isObjects ? (
                    <ObjectsStudioLink className="pt-1 text-right" />
                  ) : (
                    <DesignerCategoryChips
                      align="end"
                      rows={4}
                      selected={designerCategory}
                      onSelect={onDesignerCategoryChange}
                      chips={designerCategoryChips}
                    />
                  )}
                </div>
              </FeedModeTransition>
            </div>
          <motion.div
            className="fixed inset-x-0 top-0 z-40 !mt-0 hidden lg:block"
            initial={false}
            animate={{ y: homeScrolled ? "0%" : "-100%" }}
            transition={barSlide}
            aria-hidden={!homeScrolled || undefined}
            inert={!homeScrolled ? true : undefined}
            style={{ pointerEvents: homeScrolled ? "auto" : "none" }}
          >
            <div className="border-b border-[#e4e1db] bg-[#f5f5f5]/95 backdrop-blur-md">
              <div className="mx-auto flex max-w-[1920px] flex-col px-[calc(1.5rem+25px)] 2xl:px-[calc(2.5rem+25px)]">
                <div className="relative flex h-14 items-center gap-3 border-b border-[#e4e1db]/80">
                  <button
                    type="button"
                    className="relative z-10 shrink-0 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label={`${BRAND_NAME} หน้าแรก`}
                    onClick={() => {
                      navigate("/");
                      window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
                      useFeedHomeNavStore.getState().setScrolled(false);
                    }}
                  >
                    <BrandLogo size="sm" tone="ink" />
                  </button>
                  <div className="pointer-events-none absolute inset-x-0 top-0 flex h-14 items-center justify-center">
                    <div className="pointer-events-auto flex items-center gap-3">
                      <SearchBar
                        value={search}
                        onChange={onSearchChange}
                        placeholder={searchPlaceholder}
                        filterCount={filterCount}
                        expandable
                        expandAnchor="end"
                        compact
                        {...searchBarShared}
                        {...projectSearchBarProps}
                      />
                      <div className="flex min-w-0 max-w-[min(36rem,calc(100vw-28rem))] shrink items-center overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                        <FeedModeToggle {...toggleProps} />
                      </div>
                      <button
                        type="button"
                        onClick={onCreateClick}
                        aria-label="สร้างโปรเจกต์"
                        title="สร้างโปรเจกต์"
                        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-foreground text-background transition-opacity hover:opacity-90"
                      >
                        <Plus className="h-4 w-4" strokeWidth={2.5} />
                      </button>
                    </div>
                  </div>
                  <div className="relative z-10 ml-auto">
                    <ProfileButton accountOnly />
                  </div>
                </div>
                <div className="flex min-h-11 w-full items-center justify-center py-2">
                  <FeedModeTransition modeKey={mode} className="flex min-w-0 w-full justify-center">
                    <div className="flex min-h-9 w-max max-w-full min-w-0 items-center justify-center gap-5 sm:gap-6">
                      {isProjects ? (
                        <>
                          <FeedModeDropdown value={feedMode} onChange={onFeedModeChange} />
                          <div className="min-w-0">
                            <FilterChips
                              align="center"
                              options={parentChips}
                              selected={String(category)}
                              onSelect={(id) => {
                                if (id === DESIGN_DRILL_CHIP) {
                                  onDrillSelect?.();
                                  onCategoryChange(DESIGN_DRILL_CHIP);
                                } else {
                                  onCategoryChange(id as CategoryParentId | "All");
                                }
                                onProjectLeavesChange?.([]);
                                onProjectStylesChange?.([]);
                              }}
                            />
                          </div>
                        </>
                      ) : isObjects ? (
                        <ObjectFilterFields compact />
                      ) : (
                        <>
                          <DesignerFeedDropdown
                            value={designerFeedSource}
                            onChange={onDesignerFeedSourceChange ?? (() => {})}
                            sources={isPackages ? PACKAGE_FEED_ORDER : undefined}
                          />
                          <div className="min-w-0">
                            <DesignerCategoryChips
                              align="center"
                              selected={designerCategory}
                              onSelect={onDesignerCategoryChange}
                              chips={designerCategoryChips}
                            />
                          </div>
                        </>
                      )}
                    </div>
                  </FeedModeTransition>
                </div>
              </div>
            </div>
          </motion.div>
          </>
        ) : !homeScrolled ? (
          <>
            <div className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <SearchBar
                  value={search}
                  onChange={onSearchChange}
                  placeholder={searchPlaceholder}
                  filterCount={filterCount}
                  {...searchBarShared}
                  {...projectSearchBarProps}
                  {...(!isProjects ? { filterContent } : {})}
                />
              </div>
              <div className="flex min-w-0 max-w-[min(36rem,calc(100vw-2rem))] shrink items-center overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <FeedModeToggle {...toggleProps} />
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="shrink-0 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={`${BRAND_NAME} หน้าแรก`}
                onClick={() => {
                  navigate("/");
                  window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
                  useFeedHomeNavStore.getState().setScrolled(false);
                }}
              >
                <BrandLogo size="sm" />
              </button>
              <div className="min-w-0 flex-1 max-w-[min(28rem,38vw)] xl:max-w-[32rem]">
                <SearchBar
                  value={search}
                  onChange={onSearchChange}
                  placeholder={searchPlaceholder}
                  filterCount={filterCount}
                  {...searchBarShared}
                  {...projectSearchBarProps}
                  {...(!isProjects ? { filterContent } : {})}
                />
              </div>
              <div className="relative z-20 ml-auto flex shrink-0 items-center gap-2 overflow-visible">
                {rightAction ? (
                  <div className="relative z-30 shrink-0 overflow-visible">{rightAction}</div>
                ) : null}
                <div className="shrink-0">
                  <ProfileButton />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 min-h-9">
              <FeedModeTransition modeKey={mode} className="flex-1 min-w-0">
                <div className="flex items-center gap-3 min-h-9 min-w-0">
                  {isCommunity ? (
                    <>
                      <CommunityFeedTabs
                        feedSource={communityFeedSource}
                        onChange={onCommunityFeedSourceChange ?? (() => {})}
                        className="shrink-0 justify-start gap-6 xl:hidden"
                      />
                      <div className="flex-1 min-w-0 overflow-hidden">
                        <CommunityCategoryChips
                          selected={communityCategory}
                          onSelect={onCommunityCategoryChange ?? (() => {})}
                          className="pb-0"
                        />
                      </div>
                    </>
                  ) : isDesigners || isPackages ? (
                    <>
                      <DesignerFeedDropdown
                        value={designerFeedSource}
                        onChange={onDesignerFeedSourceChange ?? (() => {})}
                        sources={isPackages ? PACKAGE_FEED_ORDER : undefined}
                      />
                      <div className="flex-1 min-w-0">
                        <DesignerCategoryChips
                          selected={designerCategory}
                          onSelect={onDesignerCategoryChange}
                          chips={designerCategoryChips}
                        />
                      </div>
                    </>
                  ) : isStudios ? (
                    <>
                      <CommunityFeedTabs
                        feedSource={studioFeedSource}
                        onChange={onStudioFeedSourceChange ?? (() => {})}
                        className="shrink-0 justify-start gap-6"
                      />
                      <div className="flex-1" />
                    </>
                  ) : (
                    <>
                      {isProjects && (
                        <FeedModeDropdown value={feedMode} onChange={onFeedModeChange} />
                      )}
                      {isProjects && (
                        <div className="flex-1 min-w-0">
                          <FilterChips
                            options={parentChips}
                            selected={String(category)}
                            onSelect={(id) => {
                              if (id === DESIGN_DRILL_CHIP) {
                                onDrillSelect?.();
                                onCategoryChange(DESIGN_DRILL_CHIP);
                              } else {
                                onCategoryChange(id as CategoryParentId | "All");
                              }
                              onProjectLeavesChange?.([]);
                              onProjectStylesChange?.([]);
                            }}
                          />
                        </div>
                      )}
                      {!isProjects && <div className="flex-1" />}
                    </>
                  )}
                </div>
              </FeedModeTransition>

              <div className="flex min-w-0 max-w-[min(36rem,calc(100vw-2rem))] shrink items-center overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <FeedModeToggle {...toggleProps} />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Mobile parent chips under toolbar */}
      {isDesigners || isPackages ? (
        <div className="lg:hidden mt-3">
          <DesignerCategoryChips
            selected={designerCategory}
            onSelect={onDesignerCategoryChange}
            chips={designerCategoryChips}
          />
        </div>
      ) : isProjects ? (
        <div className="lg:hidden mt-3 space-y-2">
          <FilterChips
            options={parentChips}
            selected={String(category)}
            onSelect={(id) => {
              if (id === DESIGN_DRILL_CHIP) {
                onDrillSelect?.();
                onCategoryChange(DESIGN_DRILL_CHIP);
              } else {
                onCategoryChange(id as CategoryParentId | "All");
              }
              onProjectLeavesChange?.([]);
              onProjectStylesChange?.([]);
            }}
          />
        </div>
      ) : null}

      {isProjects && activeSubLabels.length > 0 ? (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {activeSubLabels.map(({ id, label }) => (
            <button
              key={`sub-${id}`}
              type="button"
              onClick={() =>
                onProjectStylesChange?.(projectStyles.filter((s) => s !== id))
              }
              className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-2.5 py-1 text-[11px] text-primary"
            >
              {label}
              <X className="w-3 h-3" />
            </button>
          ))}
        </div>
      ) : null}

      {isProjects && colorQuery ? (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => onColorQueryChange?.(null)}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary px-2.5 py-1 text-[11px] text-foreground"
          >
            <span
              aria-hidden
              className="h-3 w-3 rounded-full border border-black/10"
              style={{ backgroundColor: colorQuery }}
            />
            สี {colorQuery}
            <X className="h-3 w-3 text-muted-foreground" />
            <span className="sr-only">ล้างสี</span>
          </button>
          {colorSearchPending ? (
            <p className="text-xs text-muted-foreground" aria-live="polite">
              กำลังเทียบสีจากปกผลงาน
            </p>
          ) : null}
        </div>
      ) : null}

      {!isObjects &&
      (search.trim() || colorQuery) &&
      !colorSearchPending &&
      typeof (resultCount ?? projectResultCount) === "number" ? (
        <p
          className="mt-2 text-xs sm:text-sm text-muted-foreground tabular-nums"
          aria-live="polite"
          data-feed-result-count
        >
          พบ {(resultCount ?? projectResultCount)!.toLocaleString("th-TH")}{" "}
          {isDesigners ? "คน" : isPackages ? "แพ็กเกจ" : isStudios ? "สตูดิโอ" : isCommunity ? "โพสต์" : "ผลงาน"}
        </p>
      ) : null}

      {isProjects ? (
        <ProjectSearchFilterSheet
          open={projectSheetOpen}
          onOpenChange={setProjectSheetOpen}
          value={projectFilterValue}
          onApply={applyProjectSheet}
          onHideAiChange={onHideAiChange}
          resultCount={projectResultCount}
          recentSearches={recentSearches}
          onRecentSelect={onRecentSearchSelect}
        />
      ) : null}
    </div>
  );
};

export default FeedToolbar;
