import { useMemo } from "react";
import { Bookmark, LogIn, SearchX, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePackageFeed, type PackageFeedCard } from "@/hooks/usePackageFeed";
import { useAuth } from "@/hooks/useAuth";
import { useFollowedUserIds } from "@/hooks/useFollow";
import { useAuthDialog } from "@/stores/authDialogStore";
import PackageCard from "./PackageCard";
import { FeedProjectGrid } from "@/components/feed/FeedProjectGrid";
import { FEED_PROJECT_GRID_GAP, PACKAGE_FEED_GRID } from "@/lib/feedMasonry";
import { fuzzyMatchAll } from "@/lib/fuzzyMatch";
import { cn } from "@/lib/utils";
import type { DesignerSort } from "./DesignerToolbar";
import type { DesignerFeedSource } from "./DesignerFeedDropdown";
import EmptyState from "@/components/ui/EmptyState";
import QueryStatusPanel, { FilterEmptyState } from "@/components/ui/QueryStatusPanel";
import { useSlowLoadFallback } from "@/hooks/useSlowLoadFallback";
import { useSavedCreatorServiceIds } from "@/hooks/useCreatorServiceBookmarks";
import { useFeedInterestSurvey } from "@/hooks/useFeedInterests";
import { getViewAffinityWeights } from "@/lib/viewAffinity";
import { getFeedSearchCategoryWeights } from "@/lib/feedSearchSignals";
import {
  pickOnePackagePerOwner,
  rankPackagesByPrice,
  rankPackagesForYou,
  rankPackagesNewest,
  scorePackageInterest,
} from "@/lib/packageFeedRank";

interface Props {
  search?: string;
  onClearSearch?: () => void;
  sort?: DesignerSort;
  feedSource?: DesignerFeedSource;
  categories?: string[];
}

const ownerId = (d: PackageFeedCard) => d.service.owner_id;

const PackageGrid = ({
  search = "",
  onClearSearch,
  sort = "newest",
  feedSource = "all",
  categories = [],
}: Props) => {
  const { user } = useAuth();
  const { data = [], isLoading, isError, refetch } = usePackageFeed();
  const { data: followedIds, isLoading: followingLoading } = useFollowedUserIds(
    feedSource === "following" ? user?.id : undefined,
  );
  const { data: savedIds, isLoading: savedLoading } = useSavedCreatorServiceIds();
  const { interests } = useFeedInterestSurvey(user?.id);

  const filtered = useMemo(() => {
    let rows = data;

    if (feedSource === "following") {
      if (!user) return [];
      rows = rows.filter((d) => followedIds?.has(ownerId(d)));
    }

    if (feedSource === "saved") {
      if (!user) return [];
      rows = rows.filter((d) => savedIds?.has(d.service.id));
    }

    if (search.trim()) {
      rows = rows.filter((d) => fuzzyMatchAll(search, d.searchHaystack));
    }
    if (categories.length > 0) {
      const set = new Set(categories.map((c) => c.toLowerCase()));
      rows = rows.filter(
        (d) =>
          (d.service.category && set.has(d.service.category.toLowerCase())) ||
          d.service.tags.some((t) => set.has(t.toLowerCase())),
      );
    }

    const affinity = getViewAffinityWeights();
    const searchWeights = user?.id ? getFeedSearchCategoryWeights(user.id) : {};
    const categoryWeights = { ...searchWeights };
    for (const [cat, weight] of Object.entries(affinity.categories)) {
      categoryWeights[cat] = (categoryWeights[cat] ?? 0) + weight;
    }
    const signals = {
      interests,
      categoryWeights,
      searchQuery: search.trim(),
    };

    const unique =
      feedSource === "saved"
        ? rows
        : pickOnePackagePerOwner(rows, (row) => {
            if (sort === "projects") {
              return row.service.price_min_thb || row.service.price_thb || 0;
            }
            if (feedSource === "newest") {
              const t = Date.parse(row.service.updated_at);
              return Number.isFinite(t) ? t : 0;
            }
            return scorePackageInterest(row, signals);
          });

    if (sort === "projects") return rankPackagesByPrice(unique);
    if (feedSource === "newest") return rankPackagesNewest(unique);
    return rankPackagesForYou(unique, signals);
  }, [data, search, categories, sort, feedSource, user, followedIds, savedIds, interests]);

  const loading =
    isLoading ||
    (feedSource === "following" && !!user && followingLoading) ||
    (feedSource === "saved" && !!user && savedLoading);
  const slow = useSlowLoadFallback(loading);

  if (isError || (loading && slow)) {
    return (
      <QueryStatusPanel
        isLoading={loading}
        isError={isError}
        isSlow={slow}
        onRetry={() => void refetch()}
        loadingLabel="กำลังโหลดแพ็กเกจ..."
        errorTitle="โหลดแพ็กเกจไม่สำเร็จ"
        errorDescription="กดลองใหม่ หรือเปลี่ยนตัวกรอง"
      />
    );
  }

  if (loading) {
    return (
      <div className={cn(PACKAGE_FEED_GRID, FEED_PROJECT_GRID_GAP)} aria-hidden>
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="overflow-hidden rounded-3xl border border-border/70 bg-card">
            <div className="aspect-[4/3] bg-muted animate-pulse" />
            <div className="p-3 space-y-2">
              <div className="h-4 w-4/5 rounded bg-muted animate-pulse" />
              <div className="h-3 w-2/5 rounded bg-muted animate-pulse" />
              <div className="h-3 w-full rounded bg-muted animate-pulse" />
              <div className="h-8 w-full rounded-full bg-muted animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (feedSource === "following" && !user) {
    return (
      <div className="text-center py-16 glass-panel rounded-2xl">
        <p className="text-foreground font-medium mb-2 thai-display">เข้าสู่ระบบเพื่อดูคนที่ติดตาม</p>
        <p className="text-sm text-muted-foreground mb-4 thai-body">
          ระบบจะแสดงเฉพาะแพ็กเกจของครีเอเตอร์ที่คุณกดติดตามไว้
        </p>
        <Button
          onClick={() => useAuthDialog.getState().openSignup()}
          className="rounded-full bg-gradient-brand text-white hover:opacity-90"
        >
          <LogIn className="w-4 h-4 mr-1.5" /> เข้าสู่ระบบ
        </Button>
      </div>
    );
  }

  if (feedSource === "saved" && !user) {
    return (
      <div className="text-center py-16 glass-panel rounded-2xl">
        <p className="text-foreground font-medium mb-2 thai-display">เข้าสู่ระบบเพื่อดูแพ็กเกจที่บันทึก</p>
        <p className="text-sm text-muted-foreground mb-4 thai-body">
          กดไอคอนบุ๊กมาร์กบนการ์ดเพื่อเก็บไว้เปิดดูทีหลัง
        </p>
        <Button
          onClick={() => useAuthDialog.getState().openSignup()}
          className="rounded-full bg-gradient-brand text-white hover:opacity-90"
        >
          <LogIn className="w-4 h-4 mr-1.5" /> เข้าสู่ระบบ
        </Button>
      </div>
    );
  }

  if (!filtered.length) {
    const followingEmpty = feedSource === "following";
    const savedEmpty = feedSource === "saved";
    if (search.trim()) {
      return (
        <FilterEmptyState
          title="ไม่พบแพ็กเกจ"
          description={`ลองคำอื่น เช่น logo, branding — ไม่มีผลลัพธ์สำหรับ "${search}"`}
          onClear={onClearSearch}
          clearLabel="ล้างคำค้น"
        />
      );
    }
    return (
      <EmptyState
        icon={followingEmpty ? UserPlus : savedEmpty ? Bookmark : SearchX}
        title={
          followingEmpty
            ? "ยังไม่ได้ติดตามใครที่มีแพ็กเกจ"
            : savedEmpty
              ? "ยังไม่มีแพ็กเกจที่บันทึก"
              : "ยังไม่มีแพ็กเกจที่เผยแพร่"
        }
        description={
          followingEmpty
            ? "กดติดตามครีเอเตอร์ที่ชอบ แล้วกลับมาดูที่นี่"
            : savedEmpty
              ? "กดไอคอนบุ๊กมาร์กบนการ์ดเพื่อเก็บไว้เปิดดูทีหลัง"
              : "เมื่อมีครีเอเตอร์เผยแพร่แพ็กเกจ รายการจะปรากฏที่นี่ — หรือดูผลงานใน Projects"
        }
      />
    );
  }

  return (
    <div className="space-y-3">
      {search.trim() ? (
        <p className="text-xs sm:text-sm text-muted-foreground tabular-nums" aria-live="polite">
          พบ {filtered.length.toLocaleString("th-TH")} แพ็กเกจ
        </p>
      ) : null}
      <FeedProjectGrid itemClassName="h-full" columnsClass={PACKAGE_FEED_GRID}>
        {filtered.map((d) => (
          <PackageCard key={d.service.id} data={d} search={search} />
        ))}
      </FeedProjectGrid>
    </div>
  );
};

export default PackageGrid;
