import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Bookmark } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import EmptyState from "@/components/ui/EmptyState";
import MasonryColumns from "@/components/ui/MasonryColumns";
import ProfileTabHeading from "@/components/profile/ProfileTabHeading";
import PackageCard from "@/components/feed/PackageCard";
import {
  CollectionBrowseToolbar,
  type CollectionItemsSortMode,
} from "@/components/collections/CollectionBrowseToolbar";
import { formatServicePrice } from "@/hooks/useCreatorServices";
import { useBookmarkedPackages } from "@/hooks/useCreatorServiceBookmarks";
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

function startPrice(card: PackageFeedCard): string {
  const min = Number(card.service.price_min_thb) || 0;
  const max = Number(card.service.price_thb) || 0;
  const start = min > 0 ? min : max;
  return start > 0 ? formatServicePrice(start) : "";
}

function BookingListRow({ card }: { card: PackageFeedCard }) {
  const cover = card.images[0] ? thumbFeedCoverUrl(card.images[0]) : "";
  const title = card.service.title?.trim() || "ไม่มีชื่อ";
  const price = startPrice(card);

  return (
    <Link
      to={`/service/${card.service.id}`}
      className="group flex items-center gap-3 rounded-xl border border-border/60 bg-card/40 p-2"
    >
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
  );
}

export default function PortfolioBookingPanel({ userId }: Props) {
  const { data = [], isLoading, isError, refetch } = useBookmarkedPackages(userId);
  const [query, setQuery] = useState("");
  const [sortMode, setSortMode] = useState<CollectionItemsSortMode>("newest");
  const [density, setDensity] = useState<CollectionGridDensity>(() =>
    readCollectionGridDensity(BOOKING_GRID_STORAGE_KEY, "large"),
  );

  useEffect(() => {
    writeCollectionGridDensity(BOOKING_GRID_STORAGE_KEY, density);
  }, [density]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? data.filter((card) => card.searchHaystack.toLowerCase().includes(q))
      : data;
    const sorted = [...filtered];
    if (sortMode === "oldest") {
      sorted.reverse();
    }
    return sorted;
  }, [data, query, sortMode]);

  const serviceIds = useMemo(() => visible.map((c) => c.service.id), [visible]);
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
    <div className="space-y-4">
      <ProfileTabHeading
        title="Packages"
        count={data.length}
        description="แพ็กเกจของครีเอเตอร์คนอื่นที่คุณกดบุ๊กมาร์กไว้ — กลับมาดูหรือคุยต่อเมื่อพร้อม"
        actions={
          data.length > 0 ? (
            <Button asChild size="sm" variant="gradient" className="group w-fit rounded-full">
              <Link to="/?mode=packages">
                หน้ารวม Packages
                <span className="relative ml-0.5 inline-flex h-4 w-4 overflow-hidden" aria-hidden>
                  <ArrowRight className="absolute inset-0 h-4 w-4 transition-transform duration-300 ease-out motion-reduce:transition-none group-hover:translate-x-[120%]" />
                  <ArrowRight className="absolute inset-0 h-4 w-4 -translate-x-[120%] transition-transform duration-300 ease-out motion-reduce:transition-none group-hover:translate-x-0" />
                </span>
              </Link>
            </Button>
          ) : null
        }
      />

      {data.length === 0 ? (
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
      ) : (
        <div className="space-y-4">
          <CollectionBrowseToolbar
            mode="items"
            searchPlaceholder="ค้นหาชื่อแพ็กเกจ..."
            query={query}
            onQueryChange={setQuery}
            density={density}
            onDensityChange={setDensity}
            sortMode={sortMode}
            onSortModeChange={setSortMode}
            densityPreset="profile"
          />
          {visible.length === 0 ? (
            <div className="rounded-2xl py-12 text-center glass-panel">
              <p className="mb-1 font-medium text-foreground">ไม่พบแพ็กเกจที่ตรงเงื่อนไข</p>
              <p className="text-sm text-muted-foreground">ลองเปลี่ยนคำค้น</p>
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
                  <PackageCard data={card} stats={statsById[card.service.id]} />
                )
              }
            />
          )}
        </div>
      )}
    </div>
  );
}
