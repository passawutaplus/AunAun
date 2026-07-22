import { useMemo, useState } from "react";
import { Plus, X } from "lucide-react";
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
  type DesignerFeedSource,
} from "@/components/feed/DesignerFeedDropdown";
import DesignerFilterPanel from "@/components/feed/DesignerFilterPanel";
import StudioFilterPanel, { type StudioFeedSource } from "@/components/studio/StudioFilterPanel";
import { FilterPanel, type DesignerSort } from "@/components/feed/DesignerToolbar";
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
import { cn } from "@/lib/utils";

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
}: Props) => {
  const [mobileSearchOpen, setMobileSearchOpen] = useState(search.length > 0);
  const [projectSheetOpen, setProjectSheetOpen] = useState(false);
  const isProjects = mode === "projects";
  const isDesigners = mode === "designers";
  const isStudios = mode === "studios";
  const isCommunity = mode === "community";

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
    }),
    [search, category, projectLeaves, projectStyles],
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
    (isDesigners ? (designerSort !== "newest" ? 1 : 0) + designerTools.length : 0) +
    (isDesigners && designerFeedSource !== "all" ? 1 : 0) +
    (isDesigners && designerCategory !== "All" ? 1 : 0) +
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
  ) : isDesigners ? (
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
      className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-gradient-brand text-white hover:opacity-90 transition-opacity shrink-0"
    >
      <Plus className="w-5 h-5" strokeWidth={2.5} />
    </button>
  ) : null;

  const createButton =
    showCreate && !isCommunity ? (
      showFirstPostLabel ? (
        <button
          type="button"
          onClick={onCreateClick}
          aria-label="ลงผลงานแรก"
          className={cn(
            "first-post-create first-post-create-idle group relative inline-flex h-10 items-center rounded-full shrink-0 overflow-visible",
            "transition-[box-shadow] duration-300",
          )}
        >
          <span className="first-post-create-beam rounded-full" aria-hidden />
          <span
            className={cn(
              "first-post-create-inner relative z-10 inline-flex h-full items-center rounded-full m-[1.5px] overflow-hidden",
              "gap-0 pl-0 pr-0",
              "bg-transparent text-primary dark:text-white",
              "border border-transparent",
              "group-hover:gap-2 group-hover:pl-3.5 group-hover:bg-background/95 group-hover:border-border/60",
              "group-focus-visible:gap-2 group-focus-visible:pl-3.5 group-focus-visible:bg-background/95 group-focus-visible:border-border/60",
              "transition-all duration-200 ease-out",
            )}
          >
            <span
              className={cn(
                "max-w-0 overflow-hidden opacity-0 whitespace-nowrap text-sm font-medium",
                "group-hover:max-w-[7.5rem] group-hover:opacity-100",
                "group-focus-visible:max-w-[7.5rem] group-focus-visible:opacity-100",
                "transition-all duration-200 ease-out",
              )}
            >
              ลงผลงานแรก
            </span>
            <span className="inline-flex items-center justify-center rounded-full bg-gradient-brand text-white shrink-0 h-[37px] w-[37px]">
              <Plus className="w-5 h-5" strokeWidth={2.5} />
            </span>
          </span>
        </button>
      ) : (
        <button
          type="button"
          onClick={onCreateClick}
          aria-label="สร้างเนื้อหาใหม่"
          className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-gradient-brand text-white hover:opacity-90 transition-opacity shrink-0"
        >
          <Plus className="w-5 h-5" strokeWidth={2.5} />
        </button>
      )
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
      : isStudios
        ? "ค้นหาสตูดิโอ"
        : "ค้นหาผลงาน";

  const projectSearchBarProps = isProjects
    ? {
        onFilterClick: openProjectSheet,
        filterContent: undefined as undefined,
      }
    : {
        filterContent,
      };

  return (
    <div
      data-feed-toolbar
      className="sticky top-0 z-30 -mx-3 sm:-mx-4 lg:-mx-6 2xl:-mx-10 px-3 sm:px-4 lg:px-6 2xl:px-10 py-3 bg-background/75 backdrop-blur-md supports-[backdrop-filter]:bg-background/60 border-b border-border/50 overflow-visible"
    >
      {/* Mobile / tablet */}
      <div className="flex items-center gap-2 lg:hidden">
        <div className={cn(mobileSearchOpen && !isProjects ? "flex-1 min-w-0" : "shrink-0")}>
          <SearchBar
            value={search}
            onChange={onSearchChange}
            placeholder={searchPlaceholder}
            filterCount={filterCount}
            compact
            expandable
            onExpandedChange={setMobileSearchOpen}
            {...(isProjects
              ? { onExpandClick: openProjectSheet, onFilterClick: openProjectSheet }
              : { filterContent })}
          />
        </div>
        <FeedModeToggle
          {...toggleProps}
          compact={mobileSearchOpen && !isProjects}
          className="ml-auto"
        />
      </div>

      {/* Desktop */}
      <div className="hidden lg:block space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <SearchBar
              value={search}
              onChange={onSearchChange}
              placeholder={searchPlaceholder}
              filterCount={filterCount}
              {...projectSearchBarProps}
              {...(!isProjects ? { filterContent } : {})}
            />
          </div>
          <div className="relative z-20 flex shrink-0 items-center gap-1.5 overflow-visible">
            {rightAction ? (
              <div className="relative z-30 shrink-0 overflow-visible">{rightAction}</div>
            ) : null}
            <div
              className={cn(
                "min-w-0 shrink-0",
                rightAction ? "w-[11.6rem]" : "w-[14.5rem]",
              )}
            >
              <ProfileButton fillRail />
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
              ) : isDesigners ? (
                <>
                  <DesignerFeedDropdown
                    value={designerFeedSource}
                    onChange={onDesignerFeedSourceChange ?? (() => {})}
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
                  {isProjects && <FeedModeDropdown value={feedMode} onChange={onFeedModeChange} />}
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

          <div className="flex w-[14.5rem] shrink-0 items-center">
            <FeedModeToggle {...toggleProps} className="w-full" />
          </div>
        </div>
      </div>

      {/* Mobile parent chips under toolbar */}
      {isProjects ? (
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

      {isProjects ? (
        <ProjectSearchFilterSheet
          open={projectSheetOpen}
          onOpenChange={setProjectSheetOpen}
          value={projectFilterValue}
          onApply={applyProjectSheet}
          resultCount={projectResultCount}
        />
      ) : null}
    </div>
  );
};

export default FeedToolbar;
