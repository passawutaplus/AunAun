import { useState } from "react";
import { Plus } from "lucide-react";
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
import type { Category, FeedFilter } from "@/data/projectTypes";
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
  category: ProjectChipFilter;
  onCategoryChange: (c: ProjectChipFilter) => void;
  categoryChips: ProjectChipFilter[];
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
  /** Expand create control with "ลงผลงานแรก" until first Published project. */
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
  categoryChips,
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
}: Props) => {
  const [mobileSearchOpen, setMobileSearchOpen] = useState(search.length > 0);
  const isProjects = mode === "projects";
  const isDesigners = mode === "designers";
  const isStudios = mode === "studios";
  const isCommunity = mode === "community";

  const filterCount =
    (isDesigners ? (designerSort !== "newest" ? 1 : 0) + designerTools.length : 0) +
    (isDesigners && designerFeedSource !== "all" ? 1 : 0) +
    (isDesigners && designerCategory !== "All" ? 1 : 0) +
    (isProjects && category !== "All" ? 1 : 0) +
    (isProjects && feedMode !== "Explore" ? 1 : 0) +
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
      categories={categoryChips}
      selectedCategory={category}
      onCategorySelect={(c) => onCategoryChange(c as ProjectChipFilter)}
      showCategories={isProjects}
      feedModes={FEED_MODE_OPTIONS}
      selectedFeedMode={feedMode}
      onFeedModeSelect={(v) => onFeedModeChange(v as FeedFilter)}
      showFeedModes={isProjects}
      onClear={onClearFilters}
    />
  );

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

  /** Keep each toggle mounted in a stable tree slot so the pill can slide. */
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

  return (
    <div
      data-feed-toolbar
      className="sticky top-0 z-30 -mx-3 sm:-mx-4 lg:-mx-6 2xl:-mx-10 px-3 sm:px-4 lg:px-6 2xl:px-10 py-3 bg-background/75 backdrop-blur-md supports-[backdrop-filter]:bg-background/60 border-b border-border/50 overflow-visible"
    >
      {/* Mobile / tablet: single row — profile lives in bottom nav */}
      <div className="flex items-center gap-2 lg:hidden">
        <div className={cn(mobileSearchOpen ? "flex-1 min-w-0" : "shrink-0")}>
          <SearchBar
            value={search}
            onChange={onSearchChange}
            placeholder={searchPlaceholder}
            filterCount={filterCount}
            filterContent={filterContent}
            compact
            expandable
            onExpandedChange={setMobileSearchOpen}
          />
        </div>
        <FeedModeToggle
          {...toggleProps}
          compact={mobileSearchOpen}
          className="ml-auto"
        />
      </div>

      {/* Desktop: two rows — right rail (+ / profile) matches Projects–Designers pill width */}
      <div className="hidden lg:block space-y-3">
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <SearchBar
              value={search}
              onChange={onSearchChange}
              placeholder={searchPlaceholder}
              filterCount={filterCount}
              filterContent={filterContent}
            />
          </div>
          {/* Create grows left into search; profile pill width stays fixed (no jump). */}
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
                        categories={categoryChips}
                        selected={category}
                        onSelect={(c) => onCategoryChange(c as ProjectChipFilter)}
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
    </div>
  );
};

export default FeedToolbar;
