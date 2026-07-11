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
      className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm transition-colors shrink-0"
    >
      <Plus className="w-5 h-5" />
    </button>
  ) : null;

  const createButton =
    showCreate && !isCommunity ? (
      <button
        type="button"
        onClick={onCreateClick}
        aria-label="สร้างเนื้อหาใหม่"
        className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm transition-colors shrink-0"
      >
        <Plus className="w-5 h-5" />
      </button>
    ) : null;

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
      className="sticky top-0 z-30 -mx-3 sm:-mx-4 lg:-mx-6 2xl:-mx-10 px-3 sm:px-4 lg:px-6 2xl:px-10 py-3 bg-background/75 backdrop-blur-md supports-[backdrop-filter]:bg-background/60 border-b border-border/50"
    >
      {/* Mobile / tablet: single row */}
      <div className="flex items-center gap-2 lg:hidden">
        <div className="flex-1 min-w-0">
          <SearchBar
            value={search}
            onChange={onSearchChange}
            placeholder={searchPlaceholder}
            filterCount={filterCount}
            filterContent={filterContent}
            compact
          />
        </div>
        <FeedModeToggle {...toggleProps} />
        <ProfileButton />
      </div>

      {/* Desktop: two rows — mode toggle stays outside mode-specific branches */}
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
          <ProfileButton />
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

          <div className="flex items-center gap-2 shrink-0">
            {isCommunity ? postButton : createButton}
            <FeedModeToggle {...toggleProps} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeedToolbar;
