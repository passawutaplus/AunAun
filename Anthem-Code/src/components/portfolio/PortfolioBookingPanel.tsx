import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Bookmark, GitCompare, PackageX, SlidersHorizontal } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import EmptyState from "@/components/ui/EmptyState";
import MasonryColumns from "@/components/ui/MasonryColumns";
import ProfileTabHeading from "@/components/profile/ProfileTabHeading";
import PackageCard from "@/components/feed/PackageCard";
import {
  CollectionBrowseToolbar,
  type SavedPackagesSortMode,
} from "@/components/collections/CollectionBrowseToolbar";
import SavedPackageTracker from "@/components/portfolio/SavedPackageTracker";
import SavedPackagesCompareDialog from "@/components/portfolio/SavedPackagesCompareDialog";
import { BOOKMARK_STATUSES, type BookmarkStatus, type BookmarkTracking } from "@/hooks/useCreatorServiceBookmarks";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatServicePrice } from "@/hooks/useCreatorServices";
import {
  useBookmarkedPackages,
  useRemoveCreatorServiceBookmarks,
  useToggleCreatorServiceBookmark,
} from "@/hooks/useCreatorServiceBookmarks";
import { usePackageFeedStats } from "@/hooks/usePackageFeedStats";
import type { PackageFeedCard } from "@/hooks/usePackageFeed";
import {
  collectionMasonryClass,
  readCollectionGridDensity,
  writeCollectionGridDensity,
  type CollectionGridDensity,
} from "@/lib/collectionGridDensity";
import { thumbFeedCoverUrl } from "@/lib/feedProjectCover";

const BOOKING_GRID_STORAGE_KEY = "aplus1.profile.booking.grid.density.v2";

type Props = {
  userId: string;
};

function startPriceValue(card: PackageFeedCard): number {
  const min = Number(card.service.price_min_thb) || 0;
  const max = Number(card.service.price_thb) || 0;
  return min > 0 ? min : max;
}

function startPrice(card: PackageFeedCard): string {
  const start = startPriceValue(card);
  return start > 0 ? formatServicePrice(start) : "";
}

type PriceFilter = "all" | "lt1k" | "1k-5k" | "gt5k";

const PRICE_FILTERS: { value: PriceFilter; label: string }[] = [
  { value: "all", label: "ทุกราคา" },
  { value: "lt1k", label: "ต่ำกว่า ฿1,000" },
  { value: "1k-5k", label: "฿1,000 – ฿5,000" },
  { value: "gt5k", label: "฿5,000 ขึ้นไป" },
];

function matchesPrice(card: PackageFeedCard, filter: PriceFilter): boolean {
  if (filter === "all") return true;
  const price = startPriceValue(card);
  // "คุยรายละเอียดราคา" packages have no listed price, so a price range cannot include them.
  if (!price) return false;
  if (filter === "lt1k") return price < 1000;
  if (filter === "1k-5k") return price >= 1000 && price <= 5000;
  return price > 5000;
}

const EMPTY_CARDS: PackageFeedCard[] = [];
const EMPTY_IDS: string[] = [];
const EMPTY_TRACKING: Record<string, BookmarkTracking> = {};
const MAX_COMPARE = 3;
const DEFAULT_TRACKING: BookmarkTracking = { status: "interested", note: "", folder: "", savedAt: "" };

function creatorKey(card: PackageFeedCard): string {
  return card.service.owner_id ?? "";
}

function creatorName(card: PackageFeedCard): string {
  return card.profile.display_name || card.profile.username || "ฟรีแลนซ์";
}

function BookingListRow({ card }: { card: PackageFeedCard }) {
  const toggleSave = useToggleCreatorServiceBookmark();
  const cover = card.images[0] ? thumbFeedCoverUrl(card.images[0]) : "";
  const title = card.service.title?.trim() || "ไม่มีชื่อ";
  const price = startPrice(card);

  return (
    <div className="group relative flex items-center gap-2 rounded-xl border border-border/60 bg-card/40 p-2">
      <Link to={`/service/${card.service.id}`} className="flex min-w-0 flex-1 items-center gap-3">
        <div className="h-16 w-20 shrink-0 overflow-hidden rounded-lg bg-muted">
          {cover ? (
            <img src={cover} alt="" className="h-full w-full object-cover" loading="lazy" />
          ) : null}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-1 text-sm font-medium text-foreground">{title}</h3>
          {card.profile.display_name || card.profile.username ? (
            <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
              {card.profile.display_name || card.profile.username}
            </p>
          ) : null}
        </div>
        {price ? (
          <p className="shrink-0 text-sm font-semibold tabular-nums text-foreground">{price}</p>
        ) : null}
      </Link>
      <button
        type="button"
        onClick={() => toggleSave.mutate({ serviceId: card.service.id, saved: true })}
        disabled={toggleSave.isPending}
        aria-label="เอาออกจากที่บันทึก"
        title="เอาออกจากที่บันทึก"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border/70 bg-background/90 text-foreground hover:bg-background"
      >
        <Bookmark className="h-4 w-4 fill-current" strokeWidth={1.8} />
      </button>
    </div>
  );
}

/** Saved packages the owner closed or deleted: shown (and counted) so they do not vanish silently. */
function UnavailableSaved({ ids }: { ids: string[] }) {
  const remove = useRemoveCreatorServiceBookmarks();
  return (
    <section className="space-y-2 rounded-2xl border border-border/60 bg-card/40 p-4" aria-label="แพ็กเกจที่ไม่เปิดให้ดูแล้ว">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-sm font-medium text-foreground">ไม่เปิดให้ดูแล้ว ({ids.length})</h3>
          <p className="text-xs text-muted-foreground">เจ้าของปิดหรือลบแพ็กเกจเหล่านี้ไปแล้ว</p>
        </div>
        {ids.length > 1 ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="rounded-full"
            disabled={remove.isPending}
            onClick={() => remove.mutate(ids)}
          >
            เอาออกทั้งหมด
          </Button>
        ) : null}
      </div>
      <ul className="space-y-1.5">
        {ids.map((id) => (
          <li key={id} className="flex items-center gap-3 rounded-lg bg-muted/40 px-3 py-2">
            <PackageX className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">แพ็กเกจที่ไม่เปิดให้ดูแล้ว</span>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 rounded-full"
              disabled={remove.isPending}
              onClick={() => remove.mutate([id])}
            >
              เอาออก
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function PortfolioBookingPanel({ userId }: Props) {
  const { data: saved, isLoading, isError, refetch } = useBookmarkedPackages(userId);
  const data = saved?.cards ?? EMPTY_CARDS;
  const unavailableIds = saved?.unavailableIds ?? EMPTY_IDS;
  const tracking = saved?.tracking ?? EMPTY_TRACKING;
  const [query, setQuery] = useState("");
  const [creatorFilter, setCreatorFilter] = useState("all");
  const [priceFilter, setPriceFilter] = useState<PriceFilter>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | BookmarkStatus>("all");
  const [folderFilter, setFolderFilter] = useState("all");
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sortMode, setSortMode] = useState<SavedPackagesSortMode>("newest");
  const [density, setDensity] = useState<CollectionGridDensity>(() =>
    readCollectionGridDensity(BOOKING_GRID_STORAGE_KEY, "large"),
  );

  useEffect(() => {
    writeCollectionGridDensity(BOOKING_GRID_STORAGE_KEY, density);
  }, [density]);

  const creators = useMemo(() => {
    const byId = new Map<string, string>();
    for (const card of data) {
      const key = creatorKey(card);
      if (key && !byId.has(key)) byId.set(key, creatorName(card));
    }
    return [...byId.entries()].map(([id, name]) => ({ id, name }));
  }, [data]);

  const activeFilters =
    [creatorFilter, statusFilter, folderFilter, priceFilter].filter((v) => v !== "all").length;

  const folders = useMemo(
    () => [...new Set(Object.values(tracking).map((t) => t.folder).filter(Boolean))].sort((a, b) => a.localeCompare(b)),
    [tracking],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = data.filter(
      (card) =>
        (!q || card.searchHaystack.toLowerCase().includes(q)) &&
        (creatorFilter === "all" || creatorKey(card) === creatorFilter) &&
        (statusFilter === "all" || tracking[card.service.id]?.status === statusFilter) &&
        (folderFilter === "all" || tracking[card.service.id]?.folder === folderFilter) &&
        matchesPrice(card, priceFilter),
    );
    const sorted = [...filtered];
    if (sortMode === "oldest") {
      sorted.reverse();
    } else if (sortMode === "price_asc" || sortMode === "price_desc") {
      const dir = sortMode === "price_asc" ? 1 : -1;
      // Packages without a listed price always go last, whichever way the list is sorted.
      sorted.sort((a, b) => {
        const pa = startPriceValue(a);
        const pb = startPriceValue(b);
        if (!pa || !pb) return Number(!pa) - Number(!pb);
        return (pa - pb) * dir;
      });
    }
    return sorted;
  }, [data, query, sortMode, creatorFilter, priceFilter, statusFilter, folderFilter, tracking]);

  const serviceIds = useMemo(() => visible.map((c) => c.service.id), [visible]);
  const compareCards = useMemo(
    () => compareIds.map((id) => data.find((c) => c.service.id === id)).filter((c): c is PackageFeedCard => !!c),
    [compareIds, data],
  );
  const toggleCompare = (id: string) =>
    setCompareIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : prev.length >= MAX_COMPARE ? prev : [...prev, id]));

  const { data: statsById = {} } = usePackageFeedStats(serviceIds);

  if (isLoading) {
    return (
      <div className={collectionMasonryClass("large")}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="mb-2 break-inside-avoid animate-pulse rounded-[6px] bg-muted"
            style={{ height: i % 2 === 0 ? 280 : 220 }}
          />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-3 rounded-2xl py-16 text-center glass-panel">
        <p className="font-medium text-foreground">โหลดแพ็กเกจที่บันทึกไม่สำเร็จ</p>
        <p className="text-sm text-muted-foreground">ลองใหม่อีกครั้ง หรือตรวจการเชื่อมต่อ</p>
        <Button variant="outline" className="rounded-full" onClick={() => void refetch()}>
          ลองใหม่
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-24 sm:pb-0">
      <ProfileTabHeading
        title="Packages Saved"
        count={data.length + unavailableIds.length}
        actions={
          data.length + unavailableIds.length > 0 ? (
            <div className="flex items-center gap-2">
            <Button asChild size="sm" variant="gradient" className="group w-fit rounded-full">
              <Link to="/?mode=packages">
                หน้ารวม Packages
                <span className="relative ml-0.5 inline-flex h-4 w-4 overflow-hidden" aria-hidden>
                  <ArrowRight className="absolute inset-0 h-4 w-4 transition-transform duration-300 ease-out motion-reduce:transition-none group-hover:translate-x-[120%]" />
                  <ArrowRight className="absolute inset-0 h-4 w-4 -translate-x-[120%] transition-transform duration-300 ease-out motion-reduce:transition-none group-hover:translate-x-0" />
                </span>
              </Link>
            </Button>
            </div>
          ) : null
        }
      />

      {data.length === 0 && unavailableIds.length === 0 ? (
        <EmptyState
          icon={Bookmark}
          title="ยังไม่มีแพ็กเกจที่บันทึก"
          description="กดไอคอนบุ๊กมาร์กบนการ์ดแพ็กเกจในหน้ารวม เพื่อเก็บไว้เปิดดูทีหลังที่นี่"
          action={
            <Button asChild variant="gradient" className="rounded-full">
              <Link to="/?mode=packages">ไปดูแพ็กเกจ</Link>
            </Button>
          }
        />
      ) : data.length === 0 ? (
        <UnavailableSaved ids={unavailableIds} />
      ) : (
        <div className="space-y-4">
          <CollectionBrowseToolbar
            mode="packages"
            searchPlaceholder="ค้นหาชื่อแพ็กเกจ..."
            query={query}
            onQueryChange={setQuery}
            density={density}
            onDensityChange={setDensity}
            sortMode={sortMode}
            onSortModeChange={setSortMode}
            densityPreset="profile"
          />
          {data.length >= 3 || folders.length > 0 ? (
            <div className="space-y-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-9 rounded-full border-border/50 bg-transparent text-xs sm:hidden"
              aria-expanded={filtersOpen}
              onClick={() => setFiltersOpen((v) => !v)}
            >
              <SlidersHorizontal className="mr-1.5 h-3.5 w-3.5" aria-hidden /> ตัวกรอง
              {activeFilters > 0 ? (
                <span className="ml-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] text-primary-foreground">
                  {activeFilters}
                </span>
              ) : null}
            </Button>
            <div className={cn("flex-wrap items-center gap-2 sm:flex", filtersOpen ? "flex" : "hidden")}>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as "all" | BookmarkStatus)}>
                <SelectTrigger
                  aria-label="กรองตามสถานะ"
                  className="h-9 w-auto min-w-[8rem] rounded-full border-border/50 bg-transparent text-xs"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ทุกสถานะ</SelectItem>
                  {BOOKMARK_STATUSES.map((st) => (
                    <SelectItem key={st.value} value={st.value}>
                      {st.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {folders.length > 0 ? (
                <Select value={folderFilter} onValueChange={setFolderFilter}>
                  <SelectTrigger
                    aria-label="กรองตามโฟลเดอร์"
                    className="h-9 w-auto min-w-[8rem] max-w-[14rem] rounded-full border-border/50 bg-transparent text-xs"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">ทุกโฟลเดอร์</SelectItem>
                    {folders.map((f) => (
                      <SelectItem key={f} value={f}>
                        {f}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : null}
              {creators.length > 1 ? (
                <Select value={creatorFilter} onValueChange={setCreatorFilter}>
                  <SelectTrigger
                    aria-label="กรองตามครีเอเตอร์"
                    className="h-9 w-auto min-w-[9rem] max-w-[14rem] rounded-full border-border/50 bg-transparent text-xs"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">ทุกครีเอเตอร์</SelectItem>
                    {creators.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : null}
              <Select value={priceFilter} onValueChange={(v) => setPriceFilter(v as PriceFilter)}>
                <SelectTrigger
                  aria-label="กรองตามราคา"
                  className="h-9 w-auto min-w-[9rem] rounded-full border-border/50 bg-transparent text-xs"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRICE_FILTERS.map((f) => (
                    <SelectItem key={f.value} value={f.value}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            </div>
          ) : null}
          {visible.length === 0 ? (
            <div className="rounded-2xl py-12 text-center glass-panel">
              <p className="mb-1 font-medium text-foreground">ไม่พบแพ็กเกจที่ตรงเงื่อนไข</p>
              <p className="text-sm text-muted-foreground">ลองเปลี่ยนคำค้นหรือตัวกรอง</p>
            </div>
          ) : (
            <MasonryColumns
              items={visible}
              density={density}
              getKey={(card) => card.service.id}
              renderItem={(card) =>
                density === "list" ? (
                  <BookingListRow card={card} />
                ) : (
                  <div>
                    <PackageCard data={card} stats={statsById[card.service.id]} />
                    <SavedPackageTracker
                      serviceId={card.service.id}
                      isOwnPackage={card.service.owner_id === userId}
                      tracking={tracking[card.service.id] ?? DEFAULT_TRACKING}
                      folders={folders}
                      compareChecked={compareIds.includes(card.service.id)}
                      compareDisabled={compareIds.length >= MAX_COMPARE}
                      onToggleCompare={() => toggleCompare(card.service.id)}
                    />
                  </div>
                )
              }
            />
          )}
          {unavailableIds.length > 0 ? <UnavailableSaved ids={unavailableIds} /> : null}
          {compareIds.length > 0 ? (
            <div className="sticky bottom-24 z-20 mx-auto flex w-fit max-w-full flex-wrap items-center justify-center gap-2 rounded-2xl border border-border/60 bg-background/95 p-2 shadow-lg backdrop-blur lg:bottom-6">
              <span className="px-2 text-sm tabular-nums text-foreground">เลือก {compareIds.length}/{MAX_COMPARE}</span>
              <Button
                type="button"
                size="sm"
                className="rounded-full"
                disabled={compareIds.length < 2}
                onClick={() => setCompareOpen(true)}
              >
                <GitCompare className="mr-1 h-3.5 w-3.5" aria-hidden /> เปรียบเทียบ
              </Button>
              <Button type="button" size="sm" variant="ghost" className="rounded-full" onClick={() => setCompareIds([])}>
                ล้าง
              </Button>
            </div>
          ) : null}
          <SavedPackagesCompareDialog open={compareOpen} onOpenChange={setCompareOpen} cards={compareCards} stats={statsById} viewerId={userId} />
        </div>
      )}
    </div>
  );
}
