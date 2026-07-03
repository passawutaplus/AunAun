import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import EmptyState from "@/components/ui/EmptyState";
import CommunityGridSkeleton from "@/components/community/CommunityGridSkeleton";
import CommunityPostGridCard from "@/components/feed/CommunityPostGridCard";
import { COMMUNITY_NEW_PATH } from "@/data/createActions";
import { useCommunityPosts } from "@/hooks/useCommunityPosts";
import { useCommunityCatalogShowcase } from "@/hooks/useCommunityCatalogShowcase";
import { useUserBlocks } from "@/hooks/useCommunityPostInteractions";
import { useActiveBoosts, buildBoostedIdSet, buildBoostTargetMaps } from "@/hooks/useBoost";
import { sortByBoostedIds } from "@/lib/boostFeedSort";
import { useAuth } from "@/hooks/useAuth";
import { useAuthDialog } from "@/stores/authDialogStore";
import { formatCommunityActionError } from "@/lib/communityRateLimit";
import {
  canUseStaticCommunityShowcase,
  getStaticCommunityShowcasePosts,
  mergeCommunityFeedShowcase,
  shouldSupplementCommunityFeed,
} from "@/lib/communityFeedShowcase";
import { cn } from "@/lib/utils";
import type { CommunityFeedFilter } from "@/data/communityTopics";
import { CommunityTagFeedBanner } from "@/components/community/CommunityTagFeedBanner";
import { FEED_AREA_MASONRY_SIDEBAR_COLUMNS, FEED_MASONRY_GAP } from "@/lib/feedMasonry";

type CommunityFeedPanelFilter = CommunityFeedFilter & {
  tag?: string;
};

type Props = {
  search?: string;
  filter: CommunityFeedPanelFilter;
  onPostClick?: () => void;
  onClearTag?: () => void;
};

const CommunityFeedPanel = ({ search = "", filter, onPostClick, onClearTag }: Props) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: blockedSet } = useUserBlocks(user?.id);
  const blockedIds = useMemo(() => Array.from(blockedSet ?? []), [blockedSet]);

  const postsFilter = useMemo(
    () => ({
      category: filter.category,
      feedSource: filter.feedSource,
      tag: filter.tag,
      postKind: filter.postKind,
      viewerId: filter.feedSource === "following" ? user?.id : undefined,
      blockedIds,
    }),
    [filter.category, filter.feedSource, filter.tag, filter.postKind, user?.id, blockedIds],
  );

  const {
    data: posts = [],
    isLoading,
    isError,
    error,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useCommunityPosts(postsFilter);
  const { data: activeBoosts = [] } = useActiveBoosts(80);
  const boostedPosts = useMemo(() => buildBoostedIdSet(activeBoosts).posts, [activeBoosts]);
  const boostPostMap = useMemo(() => buildBoostTargetMaps(activeBoosts).posts, [activeBoosts]);

  const supplementFeed = shouldSupplementCommunityFeed({
    feedSource: filter.feedSource,
    tag: filter.tag,
    category: filter.category,
    search,
    postKind: filter.postKind,
  });
  const { data: catalogShowcase = [] } = useCommunityCatalogShowcase(supplementFeed);

  const showcasePosts = useMemo(() => {
    if (!supplementFeed) return [];
    if (catalogShowcase.length > 0) return catalogShowcase;
    return canUseStaticCommunityShowcase() ? getStaticCommunityShowcasePosts() : [];
  }, [catalogShowcase, supplementFeed]);

  const visiblePosts = useMemo(() => {
    const q = search.trim().toLowerCase();
    const base = !q
      ? posts
      : posts.filter(
          (p) =>
            p.title.toLowerCase().includes(q) ||
            p.body.toLowerCase().includes(q) ||
            p.tags.some((t) => t.toLowerCase().includes(q)) ||
            (p.tools ?? []).some((t) => t.toLowerCase().includes(q)) ||
            (p.profile?.display_name ?? "").toLowerCase().includes(q),
        );
    const sorted = sortByBoostedIds(base, boostedPosts);
    return mergeCommunityFeedShowcase(sorted, showcasePosts);
  }, [posts, search, boostedPosts, showcasePosts]);

  const openCreate = () => {
    if (onPostClick) {
      onPostClick();
      return;
    }
    if (!user) {
      useAuthDialog.getState().openSignup(COMMUNITY_NEW_PATH);
      return;
    }
    navigate(COMMUNITY_NEW_PATH);
  };

  const emptyDescription =
    filter.tag
      ? `ยังไม่มีโพสต์ที่มีแท็ก #${filter.tag}`
      : filter.feedSource === "following" && !user
      ? "เข้าสู่ระบบเพื่อดูโพสต์จากคนที่คุณติดตาม"
      : filter.feedSource === "following"
        ? "โพสต์ของคุณและคนที่ติดตามจะแสดงที่นี่ — หรือกด สำหรับคุณ เพื่อดูทั้งหมด"
        : search.trim()
          ? `ไม่พบโพสต์สำหรับ "${search.trim()}"`
          : filter.category !== "All"
            ? `ยังไม่มีโพสต์ในหมวด ${filter.category}`
            : "มาเป็นคนแรกที่แชร์เรื่องราวกับชุมชนกันเถอะ";

  const postButton = (
    <Button
      size="sm"
      onClick={openCreate}
      className="rounded-full h-9 px-3 bg-gradient-brand text-white hover:opacity-90 border-0 gap-1"
    >
      <Plus className="w-4 h-4" />
      Post
    </Button>
  );

  return (
    <div>
      {filter.tag && onClearTag ? (
        <CommunityTagFeedBanner tag={filter.tag} onClear={onClearTag} />
      ) : null}
      {isLoading ? (
        <CommunityGridSkeleton />
      ) : isError ? (
        <EmptyState
          icon={SearchX}
          title="โหลดฟีดไม่สำเร็จ"
          description={formatCommunityActionError(error)}
          action={postButton}
        />
      ) : visiblePosts.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title="ยังไม่มีโพสต์ในฟีดนี้"
          description={emptyDescription}
          action={postButton}
        />
      ) : (
        <div className={cn(FEED_AREA_MASONRY_SIDEBAR_COLUMNS, FEED_MASONRY_GAP)}>
          {visiblePosts.map((post) => (
            <div key={post.id} className="break-inside-avoid mb-2 sm:mb-3">
              <CommunityPostGridCard
                post={post}
                boosted={boostedPosts.has(post.id)}
                boostId={boostPostMap.get(post.id)}
              />
            </div>
          ))}
        </div>
      )}
      {hasNextPage && (
        <div className="flex justify-center pt-2">
          <Button
            type="button"
            variant="outline"
            className="rounded-full"
            disabled={isFetchingNextPage}
            onClick={() => void fetchNextPage()}
          >
            {isFetchingNextPage ? "กำลังโหลด..." : "โหลดโพสต์เพิ่มเติม"}
          </Button>
        </div>
      )}
    </div>
  );
};

export default CommunityFeedPanel;
